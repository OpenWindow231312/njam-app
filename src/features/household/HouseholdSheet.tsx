/**
 * HouseholdSheet: the one bottom sheet on the Household tab, with five views.
 *
 *   person   - someone in the household: their rules, and what you may do
 *              (set the rules of someone without a phone, remove someone).
 *   add      - add someone without a phone: just a name.
 *   join     - type an invite code to join another household.
 *   handOver - choose who becomes the owner.
 *   confirm  - "Are you sure?" before anything that cannot be undone.
 *
 * One sheet, like RuleSheet, so going from "person" to "confirm" swaps the
 * content instead of stacking a second modal (which iOS does not allow).
 * ListRow's notes ask for exactly this: a destructive action confirms in a
 * BottomSheet, never straight away.
 *
 * The sheet only collects the choice. The Household tab does the work
 * (onAction) and closes it.
 */
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, OptionButton, TextField } from '@/components/design-system';
import type { HouseholdPerson } from '@/features/household/household';
import { RuleGroups } from '@/features/profile/RuleGroups';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** The things that need the database, done by the Household tab. */
export type HouseholdAction =
  | { kind: 'remove'; person: HouseholdPerson }
  | { kind: 'deleteProfile'; person: HouseholdPerson }
  | { kind: 'add'; name: string }
  | { kind: 'join'; code: string }
  | { kind: 'handOver'; person: HouseholdPerson }
  | { kind: 'leave' }
  | { kind: 'deleteHousehold' };

/** The confirm view: what is at stake, and the action to run on "yes". */
type Confirm = { title: string; body: string; confirmLabel: string; action: HouseholdAction };

export type HouseholdSheetView =
  | { mode: 'person'; person: HouseholdPerson }
  | { mode: 'add' }
  | { mode: 'join' }
  | { mode: 'handOver' }
  | { mode: 'confirm'; confirm: Confirm };

type HouseholdSheetProps = {
  view: HouseholdSheetView | null;
  /** Your own user id, so your own row offers nothing to remove. */
  myId: string;
  isOwner: boolean;
  /** May you change other people's rules (owner, or the owner allows it)? */
  canEditOthers: boolean;
  /** Everyone with an account, for "hand over". */
  people: HouseholdPerson[];
  busy: boolean;
  onAction: (action: HouseholdAction) => void;
  onClose: () => void;
};

export const ROLE_WORDS = { owner: 'Owner', standard: 'Member', admin: 'Admin' } as const;

export function HouseholdSheet({
  view,
  myId,
  isOwner,
  canEditOthers,
  people,
  busy,
  onAction,
  onClose,
}: HouseholdSheetProps) {
  const { colors } = useNjamTheme();
  // As in RuleSheet: the view can change inside the sheet (person to
  // confirm), and the last one stays while the sheet fades out.
  const [shown, setShown] = useState<HouseholdSheetView>(view ?? { mode: 'add' });
  useEffect(() => {
    if (view) setShown(view);
  }, [view]);

  // What is typed in the add and join views. Cleared whenever the view changes.
  const [text, setText] = useState('');
  const [chosen, setChosen] = useState<string | null>(null);
  useEffect(() => {
    setText('');
    setChosen(null);
  }, [shown]);

  let title = '';
  let subtitle: string | undefined;
  let body: ReactNode = null;
  let footer: ReactNode = null;

  if (shown.mode === 'person') {
    const { person } = shown;
    const isMe = person.userId === myId;
    const noPhone = person.userId === null;
    title = isMe ? `${person.name} (you)` : person.name;
    subtitle = noPhone ? 'No phone, managed by the household' : ROLE_WORDS[person.role ?? 'standard'];
    body =
      person.rules.length > 0 ? (
        <RuleGroups rules={person.rules} />
      ) : (
        <Text style={[typography.body, { color: colors.inkMuted }]}>No rules yet.</Text>
      );
    footer = (
      <>
        {noPhone && canEditOthers && person.profileId && (
          <Button
            label={`Set ${person.name}'s rules`}
            icon="edit"
            fullWidth
            onPress={() => {
              onClose();
              router.push({ pathname: '/person-rules', params: { profileId: person.profileId, name: person.name } });
            }}
          />
        )}
        {noPhone && canEditOthers && (
          <Button
            label={`Delete ${person.name}'s profile`}
            variant="text"
            icon="delete"
            fullWidth
            onPress={() =>
              setShown({
                mode: 'confirm',
                confirm: {
                  title: `Delete ${person.name}'s profile?`,
                  body: 'Their rules go too, and scans can no longer be checked for them. This cannot be undone.',
                  confirmLabel: 'Delete profile',
                  action: { kind: 'deleteProfile', person },
                },
              })
            }
          />
        )}
        {!noPhone && !isMe && isOwner && (
          <Button
            label={`Remove ${person.name} from the household`}
            variant="text"
            icon="delete"
            fullWidth
            onPress={() =>
              setShown({
                mode: 'confirm',
                confirm: {
                  title: `Remove ${person.name}?`,
                  body: 'They keep their own rules, in a household of their own. You can invite them back with a code.',
                  confirmLabel: 'Remove',
                  action: { kind: 'remove', person },
                },
              })
            }
          />
        )}
      </>
    );
  }

  if (shown.mode === 'add') {
    title = 'Add someone without a phone';
    subtitle = 'A child, or someone you shop for';
    body = (
      <TextField label="Their name" value={text} onChangeText={setText} placeholder="Mia" autoCapitalize="words" />
    );
    footer = (
      <Button
        label={text.trim() ? `Add ${text.trim()}` : 'Add them'}
        icon="person_add"
        size="large"
        fullWidth
        disabled={text.trim().length === 0}
        loading={busy}
        loadingLabel="Adding"
        onPress={() => onAction({ kind: 'add', name: text })}
      />
    );
  }

  if (shown.mode === 'join') {
    title = 'Join another household';
    subtitle = 'Type the code the owner shared with you';
    body = (
      <View style={styles.section}>
        <TextField
          label="Invite code"
          value={text}
          onChangeText={setText}
          placeholder="4F8A 21C9"
          autoCapitalize="characters"
        />
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
          Your own rules come with you. Saved products stay with the household you leave.
        </Text>
      </View>
    );
    footer = (
      <Button
        label="Join household"
        icon="groups"
        size="large"
        fullWidth
        disabled={text.replace(/\s/g, '').length < 8}
        loading={busy}
        loadingLabel="Joining"
        onPress={() => onAction({ kind: 'join', code: text })}
      />
    );
  }

  if (shown.mode === 'handOver') {
    const others = people.filter((person) => person.userId !== null && person.userId !== myId);
    const picked = others.find((person) => person.userId === chosen);
    title = 'Hand over ownership';
    subtitle = 'The new owner runs the household. You stay in it as a member.';
    body = (
      <View accessibilityRole="radiogroup" style={styles.options}>
        {others.map((person) => (
          <OptionButton
            key={person.userId}
            label={person.name}
            icon="person"
            selected={chosen === person.userId}
            onPress={() => setChosen(person.userId)}
          />
        ))}
      </View>
    );
    footer = (
      <Button
        label={picked ? `Make ${picked.name} the owner` : 'Choose someone'}
        size="large"
        fullWidth
        disabled={!picked}
        loading={busy}
        loadingLabel="Handing over"
        onPress={() => picked && onAction({ kind: 'handOver', person: picked })}
      />
    );
  }

  if (shown.mode === 'confirm') {
    const { confirm } = shown;
    title = confirm.title;
    body = <Text style={[typography.body, { color: colors.inkMuted }]}>{confirm.body}</Text>;
    footer = (
      <>
        <Button
          label={confirm.confirmLabel}
          variant="danger"
          size="large"
          fullWidth
          loading={busy}
          loadingLabel="Working on it"
          onPress={() => onAction(confirm.action)}
        />
        <Button label="Cancel" variant="text" fullWidth disabled={busy} onPress={onClose} />
      </>
    );
  }

  return (
    <BottomSheet visible={view !== null} title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
      {body}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.s2,
  },
  options: {
    gap: space.s2,
  },
});
