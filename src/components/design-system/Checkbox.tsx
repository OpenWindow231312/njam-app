/**
 * Checkbox: a yes-or-no setting with its sentence beside it, e.g.
 * 'Warn me about "may contain" traces'. Put several inside a ListGroup; it
 * draws the white card and the dividers.
 *
 *   ticked   - forest box with a lime tick.
 *   unticked - an empty box with a 2px lineStrong edge.
 *
 * The whole row is the target, not only the box. The label says what ticking
 * means, so nobody has to guess from the box alone.
 * For a setting that takes effect immediately, prefer a ListRow switch.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { border, layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type CheckboxProps = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

export function Checkbox({ label, checked, onChange, disabled = false }: CheckboxProps) {
  const { colors } = useNjamTheme();

  return (
    <Pressable
      onPress={() => onChange(!checked)}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.row,
        pressed && { backgroundColor: colors.surfaceSunken },
        disabled && { opacity: opacity.disabled },
      ]}>
      <View
        style={[
          styles.box,
          checked
            ? { backgroundColor: colors.selected }
            : { borderWidth: border.focus, borderColor: colors.lineStrong },
        ]}>
        {checked && <Icon name="check" size="xs" color={colors.onSelected} selected />}
      </View>
      <Text style={[typography.body, styles.label, { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s3,
    paddingHorizontal: space.s4,
  },
  box: {
    width: layout.checkboxSize,
    height: layout.checkboxSize,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
});
