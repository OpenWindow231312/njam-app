/**
 * StepProgress: how far through a multi-step flow a person is, e.g. onboarding
 * "2 of 6". One short bar per step: finished and current steps are forest,
 * the rest are the quiet line colour. The count is also written out, so the
 * bars are never the only way to tell.
 */
import { StyleSheet, Text, View } from 'react-native';

import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type StepProgressProps = {
  /** The current step, counting from 1. */
  step: number;
  total: number;
};

export function StepProgress({ step, total }: StepProgressProps) {
  const { colors } = useNjamTheme();
  const steps = Array.from({ length: total }, (_, index) => index + 1);

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${step} of ${total}`}
      accessibilityValue={{ min: 1, max: total, now: step }}
      style={styles.row}>
      <View style={styles.bars}>
        {steps.map((n) => (
          <View
            key={n}
            style={[styles.bar, { backgroundColor: n <= step ? colors.selected : colors.line }]}
          />
        ))}
      </View>
      <Text style={[typography.label, { color: colors.inkMuted }]}>{`${step} of ${total}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  bars: {
    flex: 1,
    flexDirection: 'row',
    gap: space.s1,
  },
  bar: {
    flex: 1,
    height: layout.progressHeight,
    borderRadius: radius.pill,
  },
});
