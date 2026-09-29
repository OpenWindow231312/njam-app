/**
 * TextField: every text input in Njam.
 *
 * Every field shares one look (design system v1.2, 29 Sep 2026): a pill on
 * the surfaceSunken fill with a hairline `line` border, which thickens to the
 * 2px focus ring when the field is active. The variants only change what sits
 * inside the pill:
 *   outlined - the default for every form field. (The name is kept so screens
 *              do not need changing; it is no longer drawn as an outline.)
 *   search   - leading "search" icon, label read to screen readers only.
 *              Home and the product picker only.
 *   numeric  - a unit on the right ("g") and a decimal keyboard.
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

  // Border colour by state. At rest it is the quiet `line`, because the
  // sunken fill already shows the field. Error uses the -ink token, not the
  // saturated verdictUnsafe fill, because a form field is not a scan verdict.
  const borderColor = error ? colors.verdictUnsafeInk : focused ? colors.focusRing : colors.line;

  // On focus the border grows from 1 to 2. Shrinking the padding by the same
  // amount stops the text inside from jumping.
  const borderWidth = focused || error ? border.focus : border.hairline;
  // space.s5 rather than s4, so text clears the rounded ends of the pill.
  const paddingHorizontal = space.s5 - (borderWidth - border.hairline);

  return (
    <View style={[styles.wrapper, { opacity: disabled ? opacity.disabled : 1 }]}>
      {/* The search box is recognisable by its icon and shape, so its label is
          given to screen readers only. Every other field shows its label. */}
      {!isSearch && <Text style={[typography.label, { color: colors.ink }]}>{label}</Text>}

      <View
        style={[
          styles.box,
          {
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceSunken,
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
          // inkMuted, not inkSubtle: inkSubtle falls to 4.15:1 on the sunken fill.
          placeholderTextColor={colors.inkMuted}
          keyboardType={variant === 'numeric' ? 'decimal-pad' : keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          selectionColor={colors.focusRing}
          // Only the font and size from the body style. Giving a TextInput a
          // lineHeight is what pushed the text and password dots to the bottom
          // of the box on iOS, so it is left out on purpose.
          style={[
            styles.input,
            { fontFamily: typography.body.fontFamily, fontSize: typography.body.fontSize, color: colors.ink },
          ]}
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
    // Fill the box's height and centre the text inside it.
    alignSelf: 'stretch',
    textAlignVertical: 'center',
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
