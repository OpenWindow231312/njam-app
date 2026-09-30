/**
 * TextField: every text input in Njam.
 *
 * Every field shares one shape: a pill, layout.fieldHeight tall (v1.5).
 * Form fields are white (surfaceRaised) with the soft ambient shadow and no
 * outline at rest. The search bar sits on surfaceSunken with no edge and no
 * shadow, so it reads as part of the page rather than a form. When a field is
 * active it draws a quiet 1.5px dark-green outline (border.fieldFocus in
 * brandForest) and its label and leading icon turn the same green (v1.6).
 * An error draws the same outline in verdictUnsafeInk. The variants only
 * change what sits inside the pill:
 *   outlined - the default for every form field. (The name is kept so screens
 *              do not need changing; it is no longer drawn as an outline.)
 *   search   - leading "search" icon, label read to screen readers only.
 *              Home and the product picker only.
 *   numeric  - a unit on the right ("g") and a decimal keyboard.
 *              For nutrient limits. The caller converts the text to a number.
 *
 * Icon slots, like a Figma component's toggles:
 *   leadingIcon  - an icon on the left (mail, lock, search). Pass a name to
 *                  switch it on, leave it out to switch it off. Decorative.
 *   trailingIcon - a tappable icon on the right, with onTrailingPress and a
 *                  trailingLabel for screen readers.
 * A password field (secureTextEntry) gets its own show/hide eye in the
 * trailing slot automatically.
 *
 * The label always sits above the box and is never a floating label (those
 * break at 200% text size). Placeholders are examples only, never the meaning.
 * Error messages say what to do: "Enter the email you signed up with",
 * never "Invalid email".
 */
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { IconButton } from '@/components/design-system/IconButton';
import { border, icon, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type TextFieldVariant = 'outlined' | 'search' | 'numeric';

type TextFieldProps = {
  /** A noun: "Email", "Carbs per serving". */
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  variant?: TextFieldVariant;
  /** Left slot: a Material Symbols ligature. Omit to switch the slot off. The search variant always shows "search". */
  leadingIcon?: string;
  /** Right slot: a tappable Material Symbols ligature. Omit to switch the slot off. */
  trailingIcon?: string;
  /** What tapping the trailing icon does. */
  onTrailingPress?: () => void;
  /** Screen reader label for the trailing icon, naming the action: "Clear search". */
  trailingLabel?: string;
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
  leadingIcon,
  trailingIcon,
  onTrailingPress,
  trailingLabel,
  helper,
  error,
  unit,
  placeholder,
  keyboardType,
  secureTextEntry,
  autoCapitalize,
  disabled = false,
}: TextFieldProps) {
  const { colors, shadows } = useNjamTheme();
  const [focused, setFocused] = useState(false);

  // Password fields start hidden; the eye flips this.
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isSearch = variant === 'search';
  const leading = isSearch ? 'search' : leadingIcon;

  // No edge at rest (v1.5): the white fill and shadow already show the field.
  // The outline is always there but transparent until it is needed, so the
  // text never jumps when it appears. Error uses the -ink token, not the
  // saturated verdictUnsafe fill, because a form field is not a scan verdict.
  const borderColor = error ? colors.verdictUnsafeInk : focused ? colors.brandForest : 'transparent';
  // The label and leading icon join in, so the active field reads at a glance
  // without a heavy ring.
  const accent = error ? colors.verdictUnsafeInk : focused ? colors.brandForest : undefined;
  // space.s5 rather than s4, so text clears the rounded ends of the pill.
  const paddingHorizontal = space.s5 - border.fieldFocus;

  return (
    <View style={[styles.wrapper, { opacity: disabled ? opacity.disabled : 1 }]}>
      {/* The search box is recognisable by its icon and shape, so its label is
          given to screen readers only. Every other field shows its label. */}
      {!isSearch && <Text style={[typography.label, { color: accent ?? colors.ink }]}>{label}</Text>}

      <View
        style={[
          styles.box,
          {
            borderRadius: radius.pill,
            backgroundColor: isSearch ? colors.surfaceSunken : colors.surfaceRaised,
            borderWidth: border.fieldFocus,
            borderColor,
            paddingHorizontal,
          },
          !isSearch && shadows.ambient,
        ]}>
        {leading && <Icon name={leading} color={accent ?? colors.inkMuted} />}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          placeholder={placeholder}
          placeholderTextColor={colors.inkSubtle}
          keyboardType={variant === 'numeric' ? 'decimal-pad' : keyboardType}
          secureTextEntry={secureTextEntry && !passwordVisible}
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
        {/* Password fields get the eye; otherwise the trailing slot if one was given.
            The eye shows what tapping will do: "visibility" to reveal,
            "visibility_off" to hide again. */}
        {secureTextEntry ? (
          <View style={styles.trailingSlot}>
            <IconButton
              icon={passwordVisible ? 'visibility_off' : 'visibility'}
              accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
              onPress={() => setPasswordVisible(!passwordVisible)}
              color={colors.inkMuted}
            />
          </View>
        ) : (
          trailingIcon &&
          onTrailingPress && (
            <View style={styles.trailingSlot}>
              <IconButton
                icon={trailingIcon}
                accessibilityLabel={trailingLabel ?? trailingIcon}
                onPress={onTrailingPress}
                color={colors.inkMuted}
              />
            </View>
          )
        )}
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
    minHeight: layout.fieldHeight,
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
    // The browser draws its own box round a focused input on the web preview;
    // the field's own outline already shows focus.
    outlineWidth: 0,
  },
  // The IconButton's 48 hit area is wider than its 24 icon. Pulling it
  // outward by the difference keeps the visible icon the same distance from
  // the edge as the leading icon, while the whole 48 stays tappable.
  trailingSlot: {
    marginRight: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
});
