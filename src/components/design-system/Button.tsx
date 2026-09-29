/**
 * Button: the action a screen is asking for.
 *
 * Variants (from the design system Button card):
 *   primary  - action fill, pill. ONE per screen, e.g. "Scan a barcode".
 *   tonal    - actionTonal fill, pill. A real but secondary action.
 *   outlined - border only, pill. A low-commitment action; the border
 *              rather than a fill tells it apart.
 *   text     - no fill. Dismissals: "Skip for now", "Not now".
 *   danger   - verdictUnsafe fill. ONLY inside a confirming BottomSheet,
 *              because that colour means a verdict everywhere else.
 *
 * Labels are verb phrases that name the action. Never "Continue".
 * No shadows on buttons, ever.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { LoadingMark } from '@/components/design-system/LoadingMark';
import { border, icon, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ButtonVariant = 'primary' | 'tonal' | 'outlined' | 'text' | 'danger';
type ButtonSize = 'default' | 'small';

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
  const { colors } = useNjamTheme();
  const isSmall = size === 'small';

  // Fill and label colour for each variant, all from theme tokens.
  const look = {
    primary: { fill: colors.action, pressedFill: colors.actionPressed, ink: colors.onAction },
    tonal: { fill: colors.actionTonal, pressedFill: undefined, ink: colors.onActionTonal },
    outlined: { fill: 'transparent', pressedFill: undefined, ink: colors.ink },
    text: { fill: 'transparent', pressedFill: undefined, ink: colors.action },
    danger: { fill: colors.verdictUnsafe, pressedFill: undefined, ink: colors.onVerdictUnsafe },
  }[variant];

  // A small button is drawn 36 tall but must still be 48 to tap. hitSlop
  // extends the tappable area above and below without changing the layout.
  const extraHit = isSmall ? (layout.touchTargetMin - layout.buttonHeightSmall) / 2 : 0;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={{ top: extraHit, bottom: extraHit }}
      accessibilityRole="button"
      accessibilityLabel={loading && loadingLabel ? loadingLabel : label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: isSmall ? layout.buttonHeightSmall : layout.touchTargetMin,
          paddingHorizontal:
            variant === 'text' ? space.s3 : isSmall ? space.s4 : space.s6,
          borderRadius: radius.pill,
          backgroundColor: pressed && look.pressedFill ? look.pressedFill : look.fill,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          opacity: disabled ? opacity.disabled : 1,
        },
        variant === 'outlined' && {
          borderWidth: border.hairline,
          borderColor: colors.lineStrong,
        },
      ]}>
      {({ pressed }) => (
        <>
          {/* Variants without their own pressed colour get the pressed overlay
              laid over the fill instead, as the motion-and-states foundation asks. */}
          {pressed && !look.pressedFill && (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: colors.statePressedOverlay,
                  borderRadius: radius.pill,
                },
              ]}
            />
          )}

          {loading ? (
            <LoadingMark size={icon.sizeXs} color={look.ink} />
          ) : (
            iconName && <Icon name={iconName} size="sm" color={look.ink} />
          )}

          <Text style={[isSmall ? typography.buttonS : typography.button, { color: look.ink }]}>
            {loading && loadingLabel ? loadingLabel : label}
          </Text>
        </>
      )}
    </Pressable>
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
