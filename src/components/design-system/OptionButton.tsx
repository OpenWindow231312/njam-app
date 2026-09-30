/**
 * OptionButton: one choice in a small set where exactly one can be picked,
 * e.g. milk allergy severity: Avoid / Moderate / Severe.
 *
 * Unselected: white pill with the soft ambient shadow (no outline since v1.5)
 * and a mid-green icon.
 * Selected: forest pill with lime text and icon.
 *
 * Put several in a row with flex: 1 each. The parent keeps which one is
 * selected; this component only draws and reports the tap.
 */
import { StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type OptionButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Optional leading Material Symbols ligature. */
  icon?: string;
  disabled?: boolean;
};

export function OptionButton({ label, selected, onPress, icon: iconName, disabled = false }: OptionButtonProps) {
  const { colors, shadows } = useNjamTheme();

  const fill = selected ? colors.selected : colors.surfaceRaised;
  const ink = selected ? colors.onSelected : colors.ink;
  const iconInk = selected ? colors.onSelected : colors.brandForestMid;

  return (
    <PressableSurface
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      radius={radius.pill}
      style={[
        styles.option,
        { backgroundColor: fill, opacity: disabled ? opacity.disabled : 1 },
        // Only the white, unselected option needs the shadow to lift it off
        // the pale ground; the forest fill of a selected one already stands out.
        !selected && shadows.ambient,
      ]}>
      {iconName && <Icon name={iconName} size="sm" color={iconInk} selected={selected} />}
      <Text style={[typography.label, { color: ink }]}>{label}</Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  option: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s1,
    paddingHorizontal: space.s3,
    borderRadius: radius.pill,
  },
});
