/**
 * CategoryBubble: an aisle as a round icon with its name underneath, like
 * Sixty60's "quick shops". A row of them scrolls sideways on Home, and one
 * leads each aisle row on Search.
 *
 * The circle is layout.categoryBubbleSize across:
 *   rest   - white with the soft ambient shadow, the icon in mid green.
 *   active - lime, the icon in onAccent, because lime means "on" (the aisle
 *            Home is showing). The name stays ink on the page; it never goes lime.
 *
 * Without onPress it is only the picture, for a row that is itself tappable
 * (the aisle rows on Search), so the circle is drawn without a label. Those
 * rows are white, so pass onWhite: the circle then takes surfaceSunken and
 * no shadow, or it would vanish into the row.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type CategoryBubbleProps = {
  /** A Material Symbols ligature, e.g. "egg". */
  icon: string;
  /** The aisle's name. Shown under the circle when the bubble is tappable. */
  label: string;
  active?: boolean;
  onPress?: () => void;
  /** Drawn on a white card rather than the page. */
  onWhite?: boolean;
};

export function CategoryBubble({ icon, label, active = false, onPress, onWhite = false }: CategoryBubbleProps) {
  const { colors, shadows } = useNjamTheme();

  const circle = (
    <View
      style={[
        styles.circle,
        { backgroundColor: active ? colors.accent : onWhite ? colors.surfaceSunken : colors.surfaceRaised },
        !active && !onWhite && shadows.ambient,
      ]}>
      <Icon name={icon} size="lg" filled={active} color={active ? colors.onAccent : colors.brandForestMid} />
    </View>
  );

  if (!onPress) return circle;

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      radius={radius.lg}
      wash={false}
      style={styles.bubble}>
      {circle}
      <Text numberOfLines={2} style={[typography.label, styles.label, { color: colors.ink }]}>
        {label}
      </Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  // A little wider than the circle, so a two-word name wraps neatly under it.
  bubble: {
    width: layout.categoryBubbleSize + space.s4,
    alignItems: 'center',
    gap: space.s2,
  },
  circle: {
    width: layout.categoryBubbleSize,
    height: layout.categoryBubbleSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
