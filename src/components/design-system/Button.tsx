/**
 * Button: the action a screen is asking for.
 *
 * Variants (from the design system Button card):
 *   primary   - lime action fill, forest label. ONE per screen, e.g. "Scan a barcode".
 *   secondary - forest fill, paper label. A real second action beside the
 *               primary, e.g. "See alternatives".
 *   tonal     - sunken fill, ink label. Small in-place actions: "Add a rule".
 *   outlined  - white fill with the soft ambient shadow, no outline (v1.5).
 *               Low commitment: "Skip for now". The name is kept for code
 *               compatibility.
 *   text      - no fill, mid-green label. Inline escapes: "Not now".
 *   danger   - verdictUnsafe fill. ONLY inside a confirming BottomSheet,
 *              because that colour means a verdict everywhere else.
 *
 * Sizes: default (48), small (36 drawn, 48 to tap) and large (56), the
 * full-width primary at the foot of a screen: "Save my allergies".
 *
 * Labels are verb phrases that name the action. Never "Continue".
 * Coloured buttons never carry a shadow. Only the white outlined button has
 * the ambient shadow, which replaces its old hairline.
 */
import { StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { LoadingMark } from '@/components/design-system/LoadingMark';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { icon, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ButtonVariant = 'primary' | 'secondary' | 'tonal' | 'outlined' | 'text' | 'danger';
type ButtonSize = 'default' | 'small' | 'large';

type ButtonProps = {
  /** A verb phrase naming the action. */
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading Material Symbols ligature name. Icons always sit on the left. */
  icon?: string;
  loading?: boolean;
  /** What the label changes to while loading, e.g. "Checking 6 rules". */
  loadingLabel?: string;
  disabled?: boolean;
  fullWidth?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon: iconName,
  loading = false,
  loadingLabel,
  disabled = false,
  fullWidth = false,
}: ButtonProps) {
  const { colors, shadows } = useNjamTheme();
  const isSmall = size === 'small';
  const isLarge = size === 'large';

  // Fill and label colour for each variant, all from theme tokens. The
  // pressed state is the same for every variant: PressableSurface eases the
  // pressed wash in over the fill and shrinks the button a touch.
  const look = {
    primary: { fill: colors.action, ink: colors.onAction },
    secondary: { fill: colors.selected, ink: colors.brandPaper },
    tonal: { fill: colors.surfaceSunken, ink: colors.ink },
    outlined: { fill: colors.surfaceRaised, ink: colors.ink },
    // Not `action`: lime text on the pale ground would be unreadable (1.2:1).
    // brandForestMid holds 7.2:1.
    text: { fill: 'transparent', ink: colors.brandForestMid },
    danger: { fill: colors.verdictUnsafe, ink: colors.onVerdictUnsafe },
  }[variant];

  // A small button is drawn 36 tall but must still be 48 to tap. hitSlop
  // extends the tappable area above and below without changing the layout.
  const extraHit = isSmall ? (layout.touchTargetMin - layout.buttonHeightSmall) / 2 : 0;

  return (
    <PressableSurface
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: extraHit, bottom: extraHit }}
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      radius={radius.pill}
      style={[
        styles.base,
        {
          minHeight: isSmall
            ? layout.buttonHeightSmall
            : isLarge
              ? layout.buttonHeightLarge
              : layout.touchTargetMin,
          paddingHorizontal: variant === 'text' ? space.s3 : isSmall ? space.s4 : space.s6,
          borderRadius: radius.pill,
          backgroundColor: look.fill,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? opacity.disabled : 1,
        },
        variant === 'outlined' && shadows.ambient,
      ]}>
      {loading ? (
        <LoadingMark size={icon.sizeXs} color={look.ink} />
      ) : (
        iconName && <Icon name={iconName} size="sm" color={look.ink} />
      )}

      <Text
        style={[
          isSmall ? typography.buttonS : isLarge ? typography.buttonL : typography.button,
          { color: look.ink },
        ]}>
        {loading && loadingLabel ? loadingLabel : label}
      </Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s2,
  },
});
