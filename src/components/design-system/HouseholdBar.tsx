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
import { Animated, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/design-system/Avatar';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { useSlidingIndicator } from '@/components/design-system/useSlidingIndicator';
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

  // Everyone first, then each member, as one list of segments.
  const segments = [
    { id: EVERYONE, label: 'Everyone', showAvatar: false },
    ...members.map((member) => ({ id: member.id, label: member.name, showAvatar: true })),
  ];
  const selectedIndex = Math.max(
    segments.findIndex((segment) => segment.id === selectedId),
    0,
  );
  const { panHandlers, onItemLayout, indicatorStyle, highlightIndex } = useSlidingIndicator(
    segments.length,
    selectedIndex,
    (index) => onSelect(segments[index].id),
  );

  return (
    <View
      {...panHandlers}
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      {/* The highlight glides to the chosen person (and follows a drag). */}
      <Animated.View
        pointerEvents="none"
        style={[indicatorStyle, { borderRadius: radius.pill, backgroundColor: colors.selected }]}
      />
      {segments.map((segment, index) => {
        const lit = index === highlightIndex;
        return (
          <PressableSurface
            key={segment.id}
            onPress={() => onSelect(segment.id)}
            onLayout={onItemLayout(index)}
            accessibilityRole="radio"
            accessibilityState={{ checked: index === selectedIndex }}
            accessibilityLabel={segment.id === EVERYONE ? 'Everyone in your household' : segment.label}
            radius={radius.pill}
            shrink={false}
            style={styles.segment}>
            {segment.showAvatar && <Avatar name={segment.label} size="sm" />}
            <Text numberOfLines={1} style={[typography.label, { color: lit ? colors.onSelected : colors.ink }]}>
              {segment.label}
            </Text>
          </PressableSurface>
        );
      })}
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
