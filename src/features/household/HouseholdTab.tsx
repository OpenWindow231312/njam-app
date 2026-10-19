/**
 * Household tab on Profile: who is in your household, how people join, and
 * what the owner lets everyone change.
 *
 * Top to bottom:
 *   People         - everyone, with and without a phone. Tap one for their
 *                    rules. Invite someone, or add someone without a phone.
 *   Invite code    - the code to share, while you may invite.
 *   Join           - type someone else's code.
 *   Scanning       - coming soon (scanning for everyone at once).
 *   Shared         - saved products and scan history, set by the owner.
 *   Who can change what - the owner's three permission switches.
 *   Hand over, delete or leave the household.
 *
 * Everyone sees every switch, so they know the house rules, but only the
 * owner can move them. The database enforces the same thing (RLS and the
 * household functions), so a switch greyed out here is also locked there.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';

import { Avatar, Button, Icon, ListRow, LoadingMark, Snackbar } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  HouseholdError,
  addPersonWithoutPhone,
  createInvite,
  deleteHousehold,
  deleteProfile,
  fetchHousehold,
  formatInviteCode,
  handOverOwnership,
  joinHousehold,
  leaveHousehold,
  removeMember,
  setHouseholdSwitch,
  type Household,
  type HouseholdPerson,
  type HouseholdSwitch,
} from '@/features/household/household';
import {
  HouseholdSheet,
  ROLE_WORDS,
  type HouseholdAction,
  type HouseholdSheetView,
} from '@/features/household/HouseholdSheet';
import { CardBlock, SettingsCard } from '@/features/profile/SettingsCard';
import { capitalise } from '@/features/profile/rule-edits';
import { allergenWord, type ProfileRule } from '@/services/verdict';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Message = { kind: 'neutral' | 'failure'; text: string };

/** A person's rules in a few words: "Milk severe, peanut moderate, gluten and 2 more". */
function rulesSummary(rules: ProfileRule[]): string {
  if (rules.length === 0) return 'No rules yet';
  const words = rules.map((rule) => {
    if (rule.type === 'allergen') {
      const word = allergenWord(rule.target);
      return rule.severity ? `${word} ${rule.severity}` : word;
    }
    return rule.type === 'e_number' ? rule.target.toUpperCase() : rule.target;
  });
  const shown = words.slice(0, 3).join(', ');
  const more = words.length - 3;
  return capitalise(more > 0 ? `${shown} and ${more} more` : shown);
}

/** "25 Oct" */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export function HouseholdTab() {
  const { colors } = useNjamTheme();
  const { member, reloadMember } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [sheet, setSheet] = useState<HouseholdSheetView | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const householdId = member?.householdId;
  const load = useCallback(() => {
    if (!householdId) return;
    fetchHousehold(householdId)
      .then(setHousehold)
      .catch(() => setMessage({ kind: 'failure', text: 'We could not load your household. Check your connection.' }));
  }, [householdId]);
  useFocusEffect(load);

  if (!member || !household) {
    return (
      <View style={styles.loading}>
        <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
        <Text style={[typography.body, { color: colors.inkMuted }]}>Loading your household</Text>
        {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
      </View>
    );
  }

  const isOwner = member.role === 'owner' || member.role === 'admin';
  const { switches } = household;
  const canInvite = isOwner || !switches.only_owner_invites;
  const canEditOthers = isOwner || switches.members_edit_others;
  const othersWithAccounts = household.people.filter((person) => person.userId && person.userId !== member.id);
  const liveInvite =
    household.invite && new Date(household.invite.expiresAt) > new Date() ? household.invite : null;

  /** Runs a database change, then reads everything again so the tab shows it. */
  async function run(work: () => Promise<unknown>, done: string, reloadMe = false) {
    setBusy(true);
    try {
      await work();
      // Joining, leaving and handing over change your own row (household or role).
      if (reloadMe) await reloadMember();
      setSheet(null);
      setMessage({ kind: 'neutral', text: done });
      load();
    } catch (error) {
      setSheet(null);
      setMessage({
        kind: 'failure',
        text: error instanceof HouseholdError ? error.message : 'That did not work. Check your connection and try again.',
      });
    } finally {
      setBusy(false);
    }
  }

  function act(action: HouseholdAction) {
    if (action.kind === 'add') {
      run(() => addPersonWithoutPhone(household!.id, action.name), `${action.name.trim()} added to your household.`);
    } else if (action.kind === 'deleteProfile' && action.person.profileId) {
      run(() => deleteProfile(action.person.profileId!), `${action.person.name}'s profile deleted.`);
    } else if (action.kind === 'remove' && action.person.userId) {
      run(() => removeMember(action.person.userId!), `${action.person.name} is no longer in your household.`);
    } else if (action.kind === 'join') {
      run(() => joinHousehold(action.code), 'You joined the household. Your rules came with you.', true);
    } else if (action.kind === 'handOver' && action.person.userId) {
      run(() => handOverOwnership(action.person.userId!), `${action.person.name} now owns the household.`, true);
    } else if (action.kind === 'leave') {
      run(leaveHousehold, 'You left the household. Your rules came with you.', true);
    } else if (action.kind === 'deleteHousehold') {
      run(deleteHousehold, 'Household deleted. Everyone kept their own rules.', true);
    }
  }

  async function changeSwitch(column: HouseholdSwitch, value: boolean) {
    const before = household!;
    setHousehold({ ...before, switches: { ...before.switches, [column]: value } });
    try {
      await setHouseholdSwitch(before.id, column, value);
    } catch {
      setHousehold(before);
      setMessage({ kind: 'failure', text: 'We could not save that. Check your connection.' });
    }
  }

  /** Makes a code if there is no live one, then opens the phone's share sheet with it. */
  async function shareInvite(fresh: boolean) {
    setBusy(true);
    try {
      const code = fresh || !liveInvite ? await createInvite() : liveInvite.code;
      load();
      await Share.share({
        message: `Join my household on Njam: open Profile, then Household, tap "Join another household" and type ${formatInviteCode(code)}.`,
      });
    } catch {
      setMessage({ kind: 'failure', text: 'We could not make an invite code. Check your connection.' });
    } finally {
      setBusy(false);
    }
  }

  const peopleCount = household.people.length;

  return (
    <View style={styles.tab}>
      <Text style={[typography.body, { color: colors.inkMuted }]}>
        Everyone here can see each other&apos;s rules, so you can shop for each other.
      </Text>

      <SettingsCard
        title="People"
        caption={peopleCount === 1 ? 'Only you so far' : `${peopleCount} people share this household`}
        icon="groups">
        {household.people.map((person) => (
          <PersonRow
            key={person.profileId ?? person.userId}
            person={person}
            isMe={person.userId === member.id}
            onPress={() => setSheet({ mode: 'person', person })}
          />
        ))}
        <CardBlock>
          {canInvite && (
            <Button label="Invite someone" icon="person_add" fullWidth loading={busy} onPress={() => shareInvite(false)} />
          )}
          <Button
            label="Add someone without a phone"
            icon="add"
            variant="tonal"
            fullWidth
            onPress={() => setSheet({ mode: 'add' })}
          />
        </CardBlock>
      </SettingsCard>

      {canInvite && (
        <SettingsCard title="Invite code" caption="Someone types this in Njam to join your household" icon="mail">
          <CardBlock>
            {liveInvite ? (
              <>
                <View style={styles.code}>
                  <Text style={[typography.metric, styles.flex, { color: colors.ink }]}>
                    {formatInviteCode(liveInvite.code)}
                  </Text>
                  <Button label="Share" icon="share" variant="outlined" size="small" onPress={() => shareInvite(false)} />
                </View>
                <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
                  Works until {shortDate(liveInvite.expiresAt)}. Make a new code if it was shared by mistake.
                </Text>
                <Button label="Make a new code" icon="sync_problem" variant="text" onPress={() => shareInvite(true)} />
              </>
            ) : (
              <>
                <Text style={[typography.body, { color: colors.inkMuted }]}>No code yet.</Text>
                <Button label="Make a code" icon="add" variant="tonal" onPress={() => shareInvite(true)} />
              </>
            )}
          </CardBlock>
        </SettingsCard>
      )}

      <SettingsCard title="Join another household" icon="swap_horiz">
        <ListRow
          title="I have an invite code"
          supporting="Your own rules come with you"
          onPress={() => setSheet({ mode: 'join' })}
        />
      </SettingsCard>

      <SettingsCard title="Scanning for the household" icon="barcode_scanner">
        <ListRow
          title="Scan for everyone at once"
          supporting="Coming soon. For now, pick a person on the verdict."
          trailing="none"
          disabled
        />
      </SettingsCard>

      <SettingsCard
        title="Shared in the household"
        caption={isOwner ? undefined : 'Only the owner can change these'}
        icon="bookmark">
        <ListRow title="Saved products" value={String(household.savedCount)} trailing="none" />
        <ListRow
          title="Everyone can add saved products"
          trailing="switch"
          switchValue={switches.members_save_products}
          onSwitchChange={(on) => changeSwitch('members_save_products', on)}
          disabled={!isOwner}
        />
        <ListRow
          title="Share scan history"
          supporting="Everyone sees what was scanned in the household"
          trailing="switch"
          switchValue={switches.share_scan_history}
          onSwitchChange={(on) => changeSwitch('share_scan_history', on)}
          disabled={!isOwner}
        />
      </SettingsCard>

      <SettingsCard
        title="Who can change what"
        caption={isOwner ? 'Only you, the owner, can change these' : 'Only the owner can change these'}
        icon="manage_accounts">
        <ListRow
          title="People edit their own rules"
          trailing="switch"
          switchValue={switches.members_edit_own_rules}
          onSwitchChange={(on) => changeSwitch('members_edit_own_rules', on)}
          disabled={!isOwner}
        />
        <ListRow
          title="People edit each other's rules"
          supporting="Useful for a partner who shops for you"
          trailing="switch"
          switchValue={switches.members_edit_others}
          onSwitchChange={(on) => changeSwitch('members_edit_others', on)}
          disabled={!isOwner}
        />
        <ListRow
          title="Only the owner can invite people"
          trailing="switch"
          switchValue={switches.only_owner_invites}
          onSwitchChange={(on) => changeSwitch('only_owner_invites', on)}
          disabled={!isOwner}
        />
      </SettingsCard>

      <View style={styles.actions}>
        {isOwner && othersWithAccounts.length > 0 && (
          <Button
            label="Hand over ownership"
            icon="swap_horiz"
            variant="outlined"
            fullWidth
            onPress={() => setSheet({ mode: 'handOver' })}
          />
        )}
        {isOwner ? (
          <Button
            label="Delete household"
            icon="delete"
            variant="danger"
            fullWidth
            onPress={() =>
              setSheet({
                mode: 'confirm',
                confirm: {
                  title: 'Delete your household?',
                  body: 'Everyone keeps their own rules, each in a household of their own. Profiles without a phone, the invite code and saved products are deleted. This cannot be undone.',
                  confirmLabel: 'Delete household',
                  action: { kind: 'deleteHousehold' },
                },
              })
            }
          />
        ) : (
          <Button
            label="Leave household"
            icon="logout"
            variant="danger"
            fullWidth
            onPress={() =>
              setSheet({
                mode: 'confirm',
                confirm: {
                  title: 'Leave this household?',
                  body: 'Your rules come with you, into a household of your own. You can join again with a new code.',
                  confirmLabel: 'Leave household',
                  action: { kind: 'leave' },
                },
              })
            }
          />
        )}
      </View>

      <HouseholdSheet
        view={sheet}
        myId={member.id}
        isOwner={isOwner}
        canEditOthers={canEditOthers}
        people={household.people}
        busy={busy}
        onAction={act}
        onClose={() => setSheet(null)}
      />

      {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
    </View>
  );
}

/** One person: their initials, name, role and a few of their rules. */
function PersonRow({ person, isMe, onPress }: { person: HouseholdPerson; isMe: boolean; onPress: () => void }) {
  const { colors } = useNjamTheme();
  const role = person.role ? ROLE_WORDS[person.role] : 'No phone';
  const supporting = `${role}. ${rulesSummary(person.rules)}`;
  const name = isMe ? `${person.name} (you)` : person.name;

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${supporting}`}
      radius={radius.none}
      shrink={false}
      style={styles.person}>
      <Avatar name={person.name} size="lg" tone={isMe ? 'strong' : 'soft'} />
      <View style={styles.flex}>
        <Text style={[typography.title, { color: colors.ink }]}>{name}</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{supporting}</Text>
      </View>
      <Icon name="chevron_right" color={colors.inkSubtle} />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  tab: {
    gap: space.s6,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  flex: {
    flex: 1,
  },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    minHeight: layout.touchTargetMin,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
  },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  actions: {
    gap: space.s3,
  },
});
