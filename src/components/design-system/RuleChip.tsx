/**
 * RuleChip: one rule from the dietary profile, e.g. "Milk, severe".
 * Onboarding is built almost entirely from these, because a person should be
 * able to set their rules by tapping.
 *
 *   not chosen - white pill with the ambient shadow and a mid-green "add".
 *   chosen     - forest pill with a light label. An allergy also shows its
 *                severity after a thin divider: a dot plus the word in lime.
 *
 * Severity is the one place a verdict colour appears outside a verdict
 * component, because a severe allergy is the rule that will produce a Not
 * safe. The word ("Severe") is always there, so the dot only reinforces it.
 * The dots use the on-forest versions of the verdict hues so they read on
 * the chip.
 *
 * Several can be chosen at once. For a pick-one choice use OptionButton.
 * Tapping a chosen chip is how a screen lets the person change its severity.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { border, fontFamilies, icon, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type Severity = 'severe' | 'moderate' | 'avoid';

const severityWords: Record<Severity, string> = { severe: 'Severe', moderate: 'Moderate', avoid: 'Avoid' };

type RuleChipProps = {
  label: string;
  selected: boolean;
  onToggle: () => void;
  /** Allergies only: how strict the rule is. Shown once the chip is chosen. */
  severity?: Severity;
  disabled?: boolean;
};

const EXTRA_HIT = (layout.touchTargetMin - layout.chipHeightLarge) / 2;

export function RuleChip({ label, selected, onToggle, severity, disabled = false }: RuleChipProps) {
  const { colors, shadows } = useNjamTheme();

  // Only severe and moderate get a dot; "avoid" is a plain preference.
  const dotColor =
    severity === 'severe'
      ? colors.unsafeOnForest
      : severity === 'moderate'
        ? colors.cautionOnForest
        : undefined;
  const showSeverity = selected && severity;

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      hitSlop={{ top: EXTRA_HIT, bottom: EXTRA_HIT }}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={showSeverity ? `${label}, ${severityWords[severity]}` : label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.selected : pressed ? colors.surfaceSunken : colors.surfaceRaised,
          opacity: disabled ? opacity.disabled : 1,
        },
        !selected && !pressed && shadows.ambient,
      ]}>
      {!selected && <Icon name="add" size="sm" color={colors.brandForestMid} />}
      <Text style={[typography.label, { color: selected ? colors.inkInverse : colors.ink }]}>{label}</Text>

      {showSeverity && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.onSelectedDivider }]} />
          <View style={styles.severity}>
            {dotColor && <View style={[styles.dot, { backgroundColor: dotColor }]} />}
            <Text style={[typography.label, styles.severityWord, { color: colors.onSelected }]}>
              {severityWords[severity]}
            </Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: layout.chipHeightLarge,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
  },
  divider: {
    width: border.hairline,
    height: icon.sizeXs,
  },
  severity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
  },
  dot: {
    width: layout.severityDot,
    height: layout.severityDot,
    borderRadius: radius.pill,
  },
  // The severity reads a step quieter than the rule's name.
  severityWord: {
    fontFamily: fontFamilies.textMedium,
  },
});
