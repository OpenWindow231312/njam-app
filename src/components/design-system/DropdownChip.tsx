/**
 * DropdownChip: a pill above a list that opens a choice, e.g. which verdicts
 * to show, whose rules to check against, or a category ("Everyone", "Safe
 * only", "Category"). It shows the current choice and a chevron; tapping it
 * opens a sheet or menu that the screen provides.
 *
 *   rest     - white pill with the soft ambient shadow, ink label.
 *   selected - forest pill with a light label, when the choice narrows the
 *              list ("Safe only").
 *
 * It can show verdict dots instead of, or before, a label (the three dots mean
 * "showing Safe, Check and Not safe"). When it shows dots only, pass an
 * accessibilityLabel that says the choice in words.
 *
 * Drawn layout.chipHeightLarge tall; the hit area still extends to 48.
 * Not to be confused with FilterChip, which switches instantly and has no menu.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type DropdownChipProps = {
  label?: string;
  /** Verdict dots to show before the label. */
  verdicts?: VerdictState[];
  selected?: boolean;
  onPress: () => void;
  /** Required when there is no label: the choice in words. */
  accessibilityLabel?: string;
};

const EXTRA_HIT = (layout.touchTargetMin - layout.chipHeightLarge) / 2;

export function DropdownChip({
  label,
  verdicts,
  selected = false,
  onPress,
  accessibilityLabel,
}: DropdownChipProps) {
  const { colors, shadows } = useNjamTheme();

  if (__DEV__ && !label && !accessibilityLabel) {
    console.warn('DropdownChip without a label needs an accessibilityLabel.');
  }

  const ink = selected ? colors.inkInverse : colors.ink;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: EXTRA_HIT, bottom: EXTRA_HIT }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint="Opens the options"
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? colors.selected : pressed ? colors.surfaceSunken : colors.surfaceRaised,
        },
        !selected && !pressed && shadows.ambient,
      ]}>
      {verdicts && verdicts.length > 0 && (
        <View style={styles.marks}>
          {verdicts.map((state) => (
            <VerdictMark key={state} state={state} size={icon.markSm} ground="surface" />
          ))}
        </View>
      )}
      {label && <Text style={[typography.label, { color: ink }]}>{label}</Text>}
      <Icon name="expand_more" size="sm" color={ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: layout.chipHeightLarge,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingLeft: space.s3,
    paddingRight: space.s2,
    borderRadius: radius.pill,
  },
  marks: {
    flexDirection: 'row',
    gap: space.s1,
  },
});
