/**
 * SegmentedControl: switch between two or three views of the same screen,
 * e.g. History / Saved.
 *
 * A white pill track with the soft ambient shadow (no outline since v1.5)
 * holds the segments. A lime highlight glides to the chosen segment, and you
 * can hold and drag it along the track (v1.7, useSlidingIndicator).
 * Each segment is a full 48 tall, so the track is 48 plus its padding.
 */
import { Animated, StyleSheet, Text, View } from 'react-native';

import { PressableSurface } from '@/components/design-system/PressableSurface';
import { useSlidingIndicator } from '@/components/design-system/useSlidingIndicator';
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
  const selectedIndex = Math.max(
    segments.findIndex((segment) => segment.value === value),
    0,
  );
  const { panHandlers, onItemLayout, indicatorStyle, highlightIndex } = useSlidingIndicator(
    segments.length,
    selectedIndex,
    (index) => onChange(segments[index].value),
  );

  return (
    <View
      {...panHandlers}
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      {/* The lime highlight glides behind the segments (and follows a drag). */}
      <Animated.View
        pointerEvents="none"
        style={[indicatorStyle, { borderRadius: radius.pill, backgroundColor: colors.accent }]}
      />
      {segments.map((segment, index) => {
        const lit = index === highlightIndex;
        return (
          <PressableSurface
            key={segment.value}
            onPress={() => onChange(segment.value)}
            onLayout={onItemLayout(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === selectedIndex }}
            radius={radius.pill}
            shrink={false}
            style={styles.segment}>
            <Text style={[typography.label, { color: lit ? colors.onAccent : colors.ink }]}>
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
