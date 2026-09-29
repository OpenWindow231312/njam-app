/**
 * IconButton: a single Material Symbol you can tap, for places where a text
 * label would crowd the layout: app bars, the camera overlay, the end of a
 * text field (the password eye).
 *
 * The icon draws at icon.sizeMd (24) but the tappable area is always
 * layout.touchTargetMin (48). Never shrink the target to match the icon.
 *
 * Variants (from the design system IconButton card):
 *   standard - transparent, ink icon. The default.
 *   tonal    - actionTonal fill. A secondary action that needs to be findable.
 *   filled   - action fill. One per app bar at most.
 *   outlined - hairline lineStrong border.
 *
 * accessibilityLabel is required and names the action ("Show password"),
 * not the icon ("Eye").
 */
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { border, layout, opacity, radius } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type IconButtonVariant = 'standard' | 'tonal' | 'filled' | 'outlined';

type IconButtonProps = {
  /** Material Symbols ligature name. */
  icon: string;
  /** What the button does, read by screen readers. Required. */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  /** Shows the icon in its selected (heavier) weight and the action colour. */
  selected?: boolean;
  disabled?: boolean;
  /** Icon colour for the standard variant, e.g. inkMuted inside a text field. */
  color?: string;
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'standard',
  selected = false,
  disabled = false,
  color,
}: IconButtonProps) {
  const { colors } = useNjamTheme();

  if (__DEV__ && !accessibilityLabel) {
    throw new Error(`IconButton "${icon}" needs an accessibilityLabel.`);
  }

  const look = {
    standard: { fill: 'transparent', ink: color ?? colors.ink },
    tonal: { fill: colors.actionTonal, ink: colors.onActionTonal },
    filled: { fill: colors.action, ink: colors.onAction },
    outlined: { fill: 'transparent', ink: color ?? colors.ink },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      style={({ pressed }) => [
        styles.target,
        { backgroundColor: look.fill, opacity: disabled ? opacity.disabled : 1 },
        variant === 'outlined' && { borderWidth: border.hairline, borderColor: colors.lineStrong },
        pressed && { backgroundColor: variant === 'filled' ? colors.actionPressed : colors.statePressedOverlay },
      ]}>
      <Icon name={icon} color={selected && variant === 'standard' ? colors.action : look.ink} selected={selected} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  target: {
    width: layout.touchTargetMin,
    height: layout.touchTargetMin,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
