/**
 * SegmentedControl: switch between two or three views of the same screen,
 * e.g. History / Saved.
 *
 * A white pill track with the soft ambient shadow (no outline since v1.5)
 * holds the segments; the active one fills lime.
 * Each segment is a full 48 tall, so the track is 48 plus its padding.
 */
import { StyleSheet, Text, View } from 'react-native';

import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const { colors, shadows } = useNjamTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <PressableSurface
            key={segment.value}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            radius={radius.pill}
            style={[styles.segment, active && { backgroundColor: colors.accent }]}>
            <Text style={[typography.label, { color: active ? colors.onAccent : colors.ink }]}>
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
    height: layout.touchTargetMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
