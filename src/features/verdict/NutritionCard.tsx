/**
 * NutritionCard: the label's nutrition table, closed to one summary line
 * ("Per 100 g: 1480 kJ, 2.9 g sugar") until you open it.
 *
 * Open, it is laid out like a pack label: a column header with the basis,
 * then one row per nutrient. "of which" lines are smaller and muted, as on
 * the pack. We store one basis per product, so there is one amount column.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CardHeader } from '@/features/verdict/CardHeader';
import type { Nutrition } from '@/features/verdict/nutrition';
import { border, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** "Per 100 g: 1480 kJ, 2.9 g sugar", from whichever of the two the label gave. */
function summaryLine(nutrition: Nutrition): string {
  const energy = nutrition.lines.find((line) => line.name === 'Energy');
  const sugar = nutrition.lines.find((line) => line.name === 'of which total sugar');
  const parts = [energy?.amount, sugar && `${sugar.amount} sugar`].filter(Boolean);
  return parts.length > 0 ? `${nutrition.basis}: ${parts.join(', ')}` : nutrition.basis;
}

export function NutritionCard({ nutrition }: { nutrition: Nutrition | null }) {
  const { colors, shadows } = useNjamTheme();
  const [open, setOpen] = useState(false);
  const card = [styles.card, shadows.ambient, { backgroundColor: colors.surfaceRaised }];
  const divider = { borderTopWidth: border.hairline, borderTopColor: colors.line };

  if (!nutrition || nutrition.lines.length === 0) {
    return (
      <View style={card}>
        <CardHeader title="Nutrition" summary="We do not have the nutrition table for this product yet." open={false} />
      </View>
    );
  }

  return (
    <View style={card}>
      <CardHeader title="Nutrition" summary={summaryLine(nutrition)} open={open} onToggle={() => setOpen((now) => !now)} />

      {open && (
        <>
          {/* The column header, like the top of the table on a pack. */}
          <View style={[styles.row, divider]}>
            <View style={styles.flex} />
            <Text style={[typography.overline, styles.amount, { color: colors.inkMuted }]}>{nutrition.basis}</Text>
          </View>

          {nutrition.lines.map((line) => {
            const sub = line.name.startsWith('of which');
            return (
              <View
                key={line.name}
                accessible
                accessibilityLabel={`${line.name}, ${line.amount} ${nutrition.basis.toLowerCase()}`}
                style={[styles.row, divider]}>
                <Text
                  style={[sub ? typography.bodyS : typography.body, styles.flex, { color: sub ? colors.inkMuted : colors.ink }]}>
                  {line.name}
                </Text>
                <Text style={[typography.title, styles.amount, { color: colors.ink }]}>{line.amount}</Text>
              </View>
            );
          })}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingHorizontal: space.s4,
    paddingVertical: space.s2,
  },
  amount: {
    width: layout.nutritionColumnWidth,
    textAlign: 'right',
  },
  flex: {
    flex: 1,
  },
});
