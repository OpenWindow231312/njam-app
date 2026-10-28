/**
 * HomeScope: the pill under Home's headline, saying whose rules every
 * verdict on Home is for: "Checking for Anika".
 *
 * Tapping "Checking for" drops a list open underneath it: "Everyone" at the
 * top, then each person in the household. Tapping a row picks it and closes
 * the list, so checking for one other person (Nico alone, say) is one tap.
 * It used to be free tick boxes, but you could never untick the last person,
 * so picking someone else alone took two taps nobody found (28 Oct).
 *
 * The list opens in place, pushing the page down, rather than floating over
 * it: the design system keeps real elevation for sheets, modals and the
 * snackbar, and a floating menu would need it.
 *
 * White with the ambient shadow like every white control on the pale ground.
 *
 * There used to be a "4 rules" chip beside the pill. The user test on 27 Oct
 * found it a different size from the pill and unclear in purpose, so it was
 * taken off. The count is still read out to a screen reader with the pill.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Checkbox, Icon, ListGroup } from '@/components/design-system';
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

/** "Anika de Beer" becomes "Anika": the pill is short, and a first name is friendlier. */
function firstName(profile: ActiveProfile): string {
  return profile.name.trim().split(/\s+/)[0];
}

/** "Anika", "Anika and Thabo", "3 people" or "everyone". */
export function scopeName(profiles: ActiveProfile[], selectedIds: string[]): string {
  const chosen = profiles.filter((profile) => selectedIds.includes(profile.id));
  if (chosen.length > 1 && chosen.length === profiles.length) return 'everyone';
  if (chosen.length === 1) return firstName(chosen[0]);
  if (chosen.length === 2) return `${firstName(chosen[0])} and ${firstName(chosen[1])}`;
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

  /** Picks one choice and closes the list. Tapping the current choice just closes it. */
  function choose(ids: string[]) {
    onChange(ids);
    setOpen(false);
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
      </View>

      {open && (
        <ListGroup>
          {profiles.length > 1 && (
            <Checkbox
              label="Everyone in your household"
              checked={everyoneTicked}
              onChange={() => choose(profiles.map((profile) => profile.id))}
            />
          )}
          {profiles.map((profile) => (
            <Checkbox
              key={profile.id}
              label={profile.name}
              // Only ticked when this person alone is being checked for.
              checked={selectedIds.length === 1 && selectedIds[0] === profile.id}
              onChange={() => choose([profile.id])}
            />
          ))}
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
});
