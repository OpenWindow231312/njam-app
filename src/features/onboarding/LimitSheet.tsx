/**
 * LimitSheet: the most of one nutrient you want per 100 g, opened from the
 * nutrient step of onboarding. A Slider, plus quick picks for the usual
 * "low" and "high" amounts so most people never drag at all.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet, Button, Icon, OptionButton, Slider } from '@/components/design-system';
import type { NutrientOption } from '@/features/onboarding/rule-options';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type LimitSheetProps = {
  /** Null hides the sheet. */
  nutrient: NutrientOption | null;
  /** The limit set now, or undefined when there is none. */
  limit: number | undefined;
  onSave: (limit: number) => void;
  onRemove: () => void;
  onClose: () => void;
};

export function LimitSheet({ nutrient, limit, onSave, onRemove, onClose }: LimitSheetProps) {
  const { colors } = useNjamTheme();
  // A new limit starts on the "low" amount. The parent gives the sheet a new
  // key each time it opens, so this starts again from what is saved.
  const [value, setValue] = useState(() => limit ?? nutrient?.picks[0].value ?? 0);

  if (!nutrient) return null;

  const word = nutrient.label.toLowerCase();

  return (
    <BottomSheet
      visible
      title={`${nutrient.label} limit`}
      subtitle="Per 100 g. We flag anything over it."
      onClose={onClose}
      footer={
        <>
          <Button label={`Set ${word} limit`} onPress={() => onSave(value)} size="large" fullWidth />
          {limit !== undefined && <Button label="Remove limit" variant="text" onPress={onRemove} fullWidth />}
        </>
      }>
      <Slider
        label={`${nutrient.label} per 100 g`}
        value={value}
        onChange={setValue}
        min={0}
        max={nutrient.max}
        step={nutrient.step}
        unit={nutrient.unit}
      />
      <View accessibilityRole="radiogroup" style={styles.picks}>
        {nutrient.picks.map((pick) => (
          <View key={pick.value} style={styles.pick}>
            <OptionButton
              label={`${pick.value} ${nutrient.unit}, ${pick.meaning}`}
              selected={value === pick.value}
              onPress={() => setValue(pick.value)}
            />
          </View>
        ))}
      </View>
      <View style={styles.note}>
        <Icon name="info" size="sm" color={colors.inkMuted} />
        <Text style={[typography.bodyS, styles.noteText, { color: colors.inkMuted }]}>
          {nutrient.hint ? `${nutrient.hint} ` : ''}A label that only gives amounts per serving comes back as Caution.
          A starting point, not medical advice.
        </Text>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  picks: {
    flexDirection: 'row',
    gap: space.s2,
  },
  pick: {
    flex: 1,
  },
  note: {
    flexDirection: 'row',
    gap: space.s2,
  },
  noteText: {
    flex: 1,
  },
});
