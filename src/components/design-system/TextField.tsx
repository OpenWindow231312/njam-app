/**
 * TextField: every text input in Njam.
 *
 * Variants (from the design system TextField card):
 *   outlined - the default for every form field.
 *   search   - pill, sunken fill, no border, leading "search" icon.
 *              Home and the product picker only.
 *   numeric  - outlined with a unit on the right ("g"), decimal keyboard.
 *              For nutrient limits. The caller converts the text to a number.
 *
 * The label always sits above the box and is never a floating label (those
 * break at 200% text size). Placeholders are examples only, never the meaning.
 * Error messages say what to do: "Enter the email you signed up with",
 * never "Invalid email".
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { border, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type TextFieldVariant = 'outlined' | 'search' | 'numeric';

type TextFieldProps = {
  /** A noun: "Email", "Carbs per serving". */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  variant?: TextFieldVariant;
  /** Leading Material Symbols ligature. Decorative. */
  icon?: string;
  /** Something that acts at the end of the field, e.g. an IconButton to show a password. */
  trailing?: ReactNode;
  /** States the constraint or the reason. */
  helper?: string;
  /** When set, the field shows its error state with this message. */
  error?: string;
  /** Unit suffix for the numeric variant, e.g. "g". */
  unit?: string;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
};

export function TextField({
  label,
  value,
  onChangeText,
  variant = 'outlined',
  icon: iconName,
  trailing,
  helper,
  error,
  unit,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  disabled = false,
}: TextFieldProps) {
  const { colors } = useNjamTheme();
  const [focused, setFocused] = useState(false);

  const isSearch = variant === 'search';
  const leadingIcon = isSearch ? 'search' : iconName;

  // Border colour by state. Error uses the -ink token, not the saturated
  // verdictUnsafe fill, because a form field is not a scan verdict.
  const borderColor = error ? colors.verdictUnsafeInk : focused ? colors.focusRing : colors.lineStrong;

  // On focus the border grows from 1 to 2. Shrinking the padding by the same
  // amount stops the text inside from jumping.
  const borderWidth = isSearch ? 0 : focused || error ? border.focus : border.hairline;
  const paddingHorizontal = space.s4 - (borderWidth - border.hairline);

  return (
    <View style={[styles.wrapper, { opacity: disabled ? opacity.disabled : 1 }]}>
      {/* The search box is recognisable by its icon and shape, so its label is
          given to screen readers only. Every other field shows its label. */}
      {!isSearch && <Text style={[typography.label, { color: colors.ink }]}>{label}</Text>}

      <View
        style={[
          styles.box,
          {
            borderRadius: isSearch ? radius.pill : radius.md,
            backgroundColor: isSearch ? colors.surfaceSunken : colors.surface,
            borderWidth,
            borderColor,
            paddingHorizontal,
          },
        ]}>
        {leadingIcon && <Icon name={leadingIcon} color={colors.inkMuted} />}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSubtle}
          keyboardType={variant === 'numeric' ? 'decimal-pad' : keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          selectionColor={colors.focusRing}
          style={[styles.input, typography.body, { color: colors.ink }]}
        />

        {variant === 'numeric' && unit && (
          <Text style={[typography.label, { color: colors.inkMuted }]}>{unit}</Text>
        )}
        {trailing}
      </View>

      {(error || helper) && (
        <View style={styles.helperRow}>
          {error && <Icon name="error" size="sm" color={colors.verdictUnsafeInk} />}
          <Text
            accessibilityLiveRegion={error ? 'polite' : 'none'}
            style={[typography.caption, { color: error ? colors.verdictUnsafeInk : colors.inkMuted }]}>
            {error ?? helper}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: space.s2,
  },
  box: {
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  input: {
    flex: 1,
    // TextInput adds its own vertical padding on Android; remove it so the
    // box height comes from touchTargetMin alone.
    paddingVertical: 0,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
});
