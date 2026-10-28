/**
 * LevelSheet: how bad a reaction to one allergen is, asked in a BottomSheet
 * the moment you tap the allergen in onboarding.
 *
 * Three big options, each with what the level does, so nobody needs an info
 * button to understand them. Tapping one saves it and closes the sheet, so
 * the whole choice is one tap. The allergen is already on your list as
 * Severe by then (the safer guess), so closing the sheet without choosing
 * keeps it Severe.
 */
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Icon } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import type { AllergySeverity } from '@/features/onboarding/my-rules';
import { SEVERITY_CHOICES } from '@/features/onboarding/rule-options';
import { border, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type LevelSheetProps = {
  /** The allergen as a word in a sentence: "milk", "tree nuts". Null hides the sheet. */
  allergen: string | null;
  severity: AllergySeverity;
  onChoose: (severity: AllergySeverity) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function LevelSheet({ allergen, severity, onChoose, onRemove, onClose }: LevelSheetProps) {
  return (
    <BottomSheet
      visible={allergen !== null}
      title={`How bad is a reaction to ${allergen ?? ''}?`}
      subtitle="Tap a level. You can change it later."
      onClose={onClose}
      footer={<Button label={`Remove ${allergen ?? ''}`} icon="close" variant="text" onPress={onRemove} fullWidth />}>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {SEVERITY_CHOICES.map((choice) => (
          <LevelOption
            key={choice.label}
            label={choice.label}
            meaning={choice.meaning}
            selected={severity === choice.value}
            onPress={() => onChoose(choice.value)}
          />
        ))}
      </View>
    </BottomSheet>
  );
}

/** One level: a radio mark, the level's name and what it does. Forest when chosen. */
function LevelOption({
  label,
  meaning,
  selected,
  onPress,
}: {
  label: string;
  meaning: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}. ${meaning}`}
      radius={radius.lg}
      style={[
        styles.option,
        { backgroundColor: selected ? colors.selected : colors.surfaceRaised },
        !selected && shadows.ambient,
      ]}>
      <View
        style={[
          styles.radio,
          selected ? { backgroundColor: colors.onSelected } : { borderWidth: border.focus, borderColor: colors.lineStrong },
        ]}>
        {selected && <Icon name="check" size="xs" color={colors.selected} selected />}
      </View>
      <View style={styles.words}>
        <Text style={[typography.title, { color: selected ? colors.onSelected : colors.ink }]}>{label}</Text>
        <Text style={[typography.bodyS, { color: selected ? colors.inkInverse : colors.inkMuted }]}>{meaning}</Text>
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: space.s3,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    minHeight: layout.touchTargetMin,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  radio: {
    width: layout.checkboxSize,
    height: layout.checkboxSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  words: {
    flex: 1,
    gap: space.s1,
  },
});
