/**
 * HouseholdBar: the scope control. It answers the question every scan
 * depends on: whose rules is this being checked against?
 *
 * A white pill track (ambient shadow, no outline) holding "Everyone" first,
 * then one segment per member with their initials. The chosen segment turns
 * forest with a lime label, like a selected OptionButton, because picking a
 * scope is a choice that changes what every verdict means.
 *
 * "Everyone" is the union of every member's rules: a product is Safe for
 * everyone only if it passes all of them.
 *
 * Never hide this control to save space. A scan run against the wrong profile
 * is the worst failure this app has.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/design-system/Avatar';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type HouseholdMember = { id: string; name: string };

/** The id used for the whole household. */
export const EVERYONE = 'everyone';

type HouseholdBarProps = {
  members: HouseholdMember[];
  /** A member id, or EVERYONE. */
  selectedId: string;
  onSelect: (id: string) => void;
};

export function HouseholdBar({ members, selectedId, onSelect }: HouseholdBarProps) {
  const { colors, shadows } = useNjamTheme();

  const renderSegment = (id: string, label: string, showAvatar: boolean) => {
    const active = id === selectedId;
    return (
      <Pressable
        key={id}
        onPress={() => onSelect(id)}
        accessibilityRole="radio"
        accessibilityState={{ checked: active }}
        accessibilityLabel={id === EVERYONE ? 'Everyone in your household' : label}
        style={[styles.segment, active && { backgroundColor: colors.selected }]}>
        {showAvatar && <Avatar name={label} size="sm" />}
        <Text
          numberOfLines={1}
          style={[typography.label, { color: active ? colors.onSelected : colors.ink }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      {renderSegment(EVERYONE, 'Everyone', false)}
      {members.map((member) => renderSegment(member.id, member.name, true))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: space.s1,
    gap: space.s1,
    borderRadius: radius.pill,
  },
  segment: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
    paddingHorizontal: space.s2,
    borderRadius: radius.pill,
  },
});
