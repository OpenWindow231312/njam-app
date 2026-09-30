/**
 * Slider: sets one nutrient limit, e.g. "Carbs per serving: 10 g".
 *
 * A white card (ambient shadow) with the rule name and the current value on
 * top, the track in the middle (sunken track, forest fill, a forest thumb
 * with a lime centre), and the lowest and highest values underneath.
 *
 * Drag the thumb or tap anywhere on the track. Screen readers get an
 * adjustable control: swipe up or down to change the value one step.
 * The value always carries its unit.
 */
import { useRef, useState } from 'react';
import { PanResponder, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SliderProps = {
  /** The rule name, e.g. "Carbs per serving". */
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  /** How far one step moves the value. Defaults to 1. */
  step?: number;
  /** e.g. "g". */
  unit: string;
};

const THUMB = layout.sliderThumb;
// The lime centre: the thumb less a forest ring the width of the track on each side.
const THUMB_CENTRE = layout.sliderThumb - layout.progressHeight * 2;

export function Slider({ label, value, onChange, min, max, step = 1, unit }: SliderProps) {
  const { colors, shadows } = useNjamTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  // The pan handler is made once, so it reads the latest numbers from a ref.
  const latest = useRef({ trackWidth, min, max, step, onChange, startX: 0 });
  latest.current = { ...latest.current, trackWidth, min, max, step, onChange };

  /** Turn a distance along the track into a value on the step grid. */
  const valueAt = (x: number) => {
    const { trackWidth: width, min: lo, max: hi, step: size } = latest.current;
    if (width === 0) return lo;
    const fraction = Math.min(Math.max(x / width, 0), 1);
    const stepped = Math.round((fraction * (hi - lo)) / size) * size + lo;
    return Math.min(Math.max(stepped, lo), hi);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        latest.current.startX = event.nativeEvent.locationX;
        latest.current.onChange(valueAt(latest.current.startX));
      },
      onPanResponderMove: (_event, gesture) => {
        latest.current.onChange(valueAt(latest.current.startX + gesture.dx));
      },
    }),
  ).current;

  const fraction = max > min ? (value - min) / (max - min) : 0;
  const fillWidth = fraction * trackWidth;
  const spoken = `${value} ${unit}`;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.header}>
        <Text style={[typography.label, { color: colors.ink }]}>{label}</Text>
        <Text style={[typography.metric, { color: colors.ink }]}>{spoken}</Text>
      </View>

      <View
        {...pan.panHandlers}
        onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: spoken }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => {
          const next = event.nativeEvent.actionName === 'increment' ? value + step : value - step;
          onChange(Math.min(Math.max(next, min), max));
        }}
        style={styles.hitArea}>
        <View pointerEvents="none" style={[styles.track, { backgroundColor: colors.surfaceSunken }]} />
        <View
          pointerEvents="none"
          style={[styles.fill, { width: fillWidth, backgroundColor: colors.selected }]}
        />
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: fillWidth - THUMB / 2, backgroundColor: colors.selected }]}>
          <View style={[styles.thumbCentre, { backgroundColor: colors.accent }]} />
        </View>
      </View>

      <View style={styles.range} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[typography.caption, { color: colors.inkSubtle }]}>{`${min} ${unit}`}</Text>
        <Text style={[typography.caption, { color: colors.inkSubtle }]}>{`${max} ${unit}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.s4,
    gap: space.s3,
    borderRadius: radius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  // Taller than the thumb so it is easy to grab: the full touch target.
  hitArea: {
    height: layout.touchTargetMin,
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: layout.progressHeight,
    borderRadius: radius.pill,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: layout.progressHeight,
    borderRadius: radius.pill,
  },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCentre: {
    width: THUMB_CENTRE,
    height: THUMB_CENTRE,
    borderRadius: radius.pill,
  },
  range: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
