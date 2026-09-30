/**
 * IconButton: a single Material Symbol you can tap, for places where a text
 * label would crowd the layout: app bars, the camera overlay, the end of a
 * text field (the password eye).
 *
 * The icon draws at icon.sizeMd (24) but the tappable area is always
 * layout.touchTargetMin (48). Never shrink the target to match the icon.
 *
 * Variants (from the design system IconButton card):
 *   standard - transparent, ink icon. Inside fields and rows.
 *   tonal    - soft sunken circle, ink icon. Back, more, notifications.
 *   filled   - forest circle, lime icon. The one strong action, e.g. filters.
 *   outlined - hairline lineStrong border.
 *   raised   - white circle, ink icon. Over the camera panel (torch), where
 *              the white reads cleanly on any picture (v1.5 canvas).
 *
 * accessibilityLabel is required and names the action ("Show password"),
 * not the icon ("Eye").
 */
import { StyleSheet } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { border, layout, opacity, radius } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type IconButtonVariant = 'standard' | 'tonal' | 'filled' | 'outlined' | 'raised';

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
    tonal: { fill: colors.surfaceSunken, ink: colors.ink },
    filled: { fill: colors.selected, ink: colors.onSelected },
    outlined: { fill: 'transparent', ink: color ?? colors.ink },
    raised: { fill: colors.surfaceRaised, ink: colors.ink },
  }[variant];

  return (
    <PressableSurface
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected }}
      radius={radius.pill}
      style={[
        styles.target,
        { backgroundColor: look.fill, opacity: disabled ? opacity.disabled : 1 },
        variant === 'outlined' && { borderWidth: border.hairline, borderColor: colors.lineStrong },
      ]}>
      <Icon name={icon} color={selected && variant === 'standard' ? colors.brandForestMid : look.ink} selected={selected} />
    </PressableSurface>
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
