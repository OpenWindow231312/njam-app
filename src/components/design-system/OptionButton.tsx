/**
 * OptionButton: one choice in a small set where exactly one can be picked,
 * e.g. milk allergy severity: Avoid / Moderate / Severe.
 *
 * Unselected: near-white pill with a hairline and a mid-green icon.
 * Selected: forest pill with lime text and icon.
 *
 * Put several in a row with flex: 1 each. The parent keeps which one is
 * selected; this component only draws and reports the tap.
 */
import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { border, layout, opacity, radius, space, typography } from '@/theme/tokens';
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
  const { colors } = useNjamTheme();

  const fill = selected ? colors.selected : colors.surfaceRaised;
  const ink = selected ? colors.onSelected : colors.ink;
  const iconInk = selected ? colors.onSelected : colors.brandForestMid;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: pressed && !selected ? colors.surfaceSunken : fill,
          // Selected has no border: the forest fill already outlines it.
          borderColor: selected ? fill : colors.line,
          opacity: disabled ? opacity.disabled : 1,
        },
      ]}>
      {iconName && <Icon name={iconName} size="sm" color={iconInk} selected={selected} />}
      <Text style={[typography.label, { color: ink }]}>{label}</Text>
    </Pressable>
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
    borderWidth: border.hairline,
  },
});
