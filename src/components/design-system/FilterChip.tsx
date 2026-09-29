/**
 * FilterChip: a quick filter above a list, e.g. All / Safe / Check / Not safe
 * on scan history.
 *
 * Active: lime fill. At rest: sunken fill. The chip is drawn 36 tall, but its
 * hit area is extended to the 48 minimum with hitSlop so it stays easy to tap.
 *
 * Not to be confused with VerdictChip, which shows a scan result and is never
 * tappable as a filter.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

// Extra tappable space above and below the visible chip.
const EXTRA_HIT = (layout.touchTargetMin - layout.filterChipHeight) / 2;

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  const { colors } = useNjamTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: EXTRA_HIT, bottom: EXTRA_HIT }}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={[styles.chip, { backgroundColor: active ? colors.accent : colors.surfaceSunken }]}>
      <Text style={[typography.label, { color: active ? colors.onAccent : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: layout.filterChipHeight,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
