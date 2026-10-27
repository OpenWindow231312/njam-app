/**
 * BarcodeReadout: the barcode number floating up above the brackets.
 *
 * Once the photo is read, the number appears in a white pill, one digit at
 * a time, with the digits still to come as faint placeholders. It shows the
 * person what Njam read, so a wrong number is easy to spot. When the lookup
 * is done the barcode icon turns into a check.
 *
 * The digits reveal over one motion.loadingTurn in total, so a long number
 * is not slower than a short one. With "reduce motion" on they all show at
 * once. Give it key={barcode} so a new number starts from the first digit.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system';
import { formatBarcode } from '@/features/scanner/barcode';
import { motion, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type BarcodeReadoutProps = {
  barcode: string;
  /** true once the lookup has finished: the icon becomes a check. */
  done?: boolean;
};

/** Where the first `count` digits end in a grouped number, skipping the spaces. */
function indexAfterDigits(grouped: string, count: number): number {
  let digits = 0;
  for (let i = 0; i < grouped.length; i++) {
    if (digits === count) return i;
    if (grouped[i] !== ' ') digits++;
  }
  return grouped.length;
}

export function BarcodeReadout({ barcode, done = false }: BarcodeReadoutProps) {
  const { colors, shadows } = useNjamTheme();
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (cancelled) return;
      if (reduceMotion) {
        setShown(barcode.length);
        return;
      }
      const step = motion.loadingTurn / barcode.length;
      timer = setInterval(() => {
        setShown((count) => {
          if (count + 1 >= barcode.length && timer) clearInterval(timer);
          return Math.min(count + 1, barcode.length);
        });
      }, step);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [barcode]);

  // Read digits in ink, the rest as underscores in inkSubtle, kept in the
  // same groups so the pill does not change width as the digits arrive.
  const read = formatBarcode(barcode.slice(0, shown) + '_'.repeat(barcode.length - shown));
  const split = indexAfterDigits(read, shown);

  return (
    <View
      accessible
      accessibilityLabel={`Barcode ${barcode.split('').join(' ')}`}
      style={[styles.pill, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <Icon name={done ? 'check' : 'barcode'} size="sm" color={colors.ink} />
      <Text style={[typography.buttonL, { color: colors.ink }]}>
        {read.slice(0, split)}
        <Text style={{ color: colors.inkSubtle }}>{read.slice(split)}</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
  },
});
