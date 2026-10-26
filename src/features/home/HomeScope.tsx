/**
 * HomeScope: the two small pills under Home's headline, saying whose rules
 * every verdict on Home is for: "Checking for Anika" and "4 rules".
 *
 * Tapping "Checking for" drops a tick list open underneath it: everyone in
 * the household, one tick box each, and "Everyone" at the top to tick them
 * all. Home then checks every product for all the ticked people at once.
 * At least one person always stays ticked, because a verdict for nobody
 * means nothing.
 *
 * The list opens in place, pushing the page down, rather than floating over
 * it: the design system keeps real elevation for sheets, modals and the
 * snackbar, and a floating menu would need it.
 *
 * White with the ambient shadow like every white control on the pale ground;
 * the rule count sits on a sunken chip, because it is a fact, not a button.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Checkbox, Icon, ListGroup, ListRow } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import type { ActiveProfile } from '@/features/profile/active-profile';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type HomeScopeProps = {
  /** Everyone in the household, the default profile first. */
  profiles: ActiveProfile[];
  /** The ids of the ticked people. */
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
};

/** "Anika", "Anika and Thabo", "3 people" or "everyone". */
export function scopeName(profiles: ActiveProfile[], selectedIds: string[]): string {
  const chosen = profiles.filter((profile) => selectedIds.includes(profile.id));
  if (chosen.length > 1 && chosen.length === profiles.length) return 'everyone';
  if (chosen.length === 1) return chosen[0].name;
  if (chosen.length === 2) return `${chosen[0].name} and ${chosen[1].name}`;
  return `${chosen.length} people`;
}

export function HomeScope({ profiles, selectedIds, onChange }: HomeScopeProps) {
  const { colors, shadows } = useNjamTheme();
  const [open, setOpen] = useState(false);

  const name = scopeName(profiles, selectedIds);
  const ruleCount = profiles
    .filter((profile) => selectedIds.includes(profile.id))
    .reduce((total, profile) => total + profile.rules.length, 0);
  const rules = `${ruleCount} ${ruleCount === 1 ? 'rule' : 'rules'}`;
  const everyoneTicked = selectedIds.length === profiles.length;

  function toggle(profileId: string, ticked: boolean) {
    if (ticked) {
      onChange([...selectedIds, profileId]);
      return;
    }
    const left = selectedIds.filter((id) => id !== profileId);
    // Never untick the last person.
    if (left.length > 0) onChange(left);
  }

  // Unticking Everyone goes back to the household's default profile alone.
  function toggleEveryone(ticked: boolean) {
    onChange(ticked ? profiles.map((profile) => profile.id) : [profiles[0].id]);
  }

  return (
    <View style={styles.scope}>
      <View style={styles.row}>
        <PressableSurface
          onPress={() => setOpen((wasOpen) => !wasOpen)}
          accessibilityRole="button"
          accessibilityLabel={`Checking for ${name}, ${rules}`}
          accessibilityHint="Choose who in your household to check for"
          accessibilityState={{ expanded: open }}
          radius={radius.pill}
          style={[styles.pill, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
          {selectedIds.length === 1 ? (
            <Avatar name={name} size="sm" tone="strong" />
          ) : (
            <View style={[styles.group, { backgroundColor: colors.selected }]}>
              <Icon name="groups" size="xs" color={colors.onSelected} />
            </View>
          )}
          <Text style={[typography.label, { color: colors.ink }]}>Checking for {name}</Text>
          <Icon name={open ? 'expand_less' : 'expand_more'} size="sm" color={colors.ink} />
        </PressableSurface>
        <View
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[styles.chip, { backgroundColor: colors.surfaceSunken }]}>
          <Icon name="rule" size="xs" color={colors.ink} />
          <Text style={[typography.label, { color: colors.ink }]}>{rules}</Text>
        </View>
      </View>

      {open && (
        <ListGroup>
          {profiles.length > 1 && (
            <Checkbox label="Everyone in your household" checked={everyoneTicked} onChange={toggleEveryone} />
          )}
          {profiles.map((profile) => {
            const ticked = selectedIds.includes(profile.id);
            return (
              <Checkbox
                key={profile.id}
                label={profile.name}
                checked={ticked}
                // The only ticked person cannot be unticked.
                disabled={ticked && selectedIds.length === 1}
                onChange={(next) => toggle(profile.id, next)}
              />
            );
          })}
          <ListRow
            title="Change who is in your household"
            icon="person_add"
            trailing="chevron"
            onPress={() => router.navigate('/profile')}
          />
        </ListGroup>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scope: {
    gap: space.s3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  pill: {
    height: layout.scopePillHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingLeft: space.s1,
    paddingRight: space.s2,
    borderRadius: radius.pill,
  },
  // The same size as Avatar sm, so the pill does not jump when it swaps.
  group: {
    width: layout.avatarSm,
    height: layout.avatarSm,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    height: layout.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingHorizontal: layout.chipPaddingStart,
    borderRadius: radius.pill,
  },
});
