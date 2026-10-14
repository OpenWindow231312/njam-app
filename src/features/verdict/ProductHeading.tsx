/**
 * ProductHeading: the top of the Verdict drawer. The brand as an overline,
 * the product name, read-only chips for the pack size and the barcode, and
 * the verdict mark beside the name.
 *
 * The chips are facts, not filters, so each leads with an icon and none of
 * them can be tapped.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Icon, VerdictMark } from '@/components/design-system';
import type { VerdictState } from '@/services/verdict';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ProductHeadingProps = {
  name: string;
  brand: string | null;
  /** "450 g", or null when the pack size is not known. */
  size: string | null;
  barcode: string | null;
  state: VerdictState;
};

/**
 * "2 000000 000077": a 13-digit barcode grouped the way it is printed under
 * the bars, so it is easier to compare with the pack. Anything else as it is.
 */
function groupBarcode(barcode: string): string {
  if (!/^\d{13}$/.test(barcode)) return barcode;
  return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7)}`;
}

export function ProductHeading({ name, brand, size, barcode, state }: ProductHeadingProps) {
  const { colors } = useNjamTheme();
  return (
    <View style={styles.row}>
      <View style={styles.words}>
        {brand && <Text style={[typography.overline, { color: colors.inkMuted }]}>{brand}</Text>}
        <Text accessibilityRole="header" style={[typography.displayL, { color: colors.ink }]}>
          {name}
        </Text>
        <View style={styles.chips}>
          {size && <InfoChip icon="monitor_weight" label={size} accessibilityLabel={`Pack size ${size}`} />}
          <InfoChip
            icon="barcode"
            label={barcode ? groupBarcode(barcode) : 'No barcode'}
            accessibilityLabel={barcode ? `Barcode ${barcode}` : 'No barcode'}
          />
        </View>
      </View>
      <VerdictMark state={state} size={icon.markXl} ground="surface" />
    </View>
  );
}

/** A read-only fact about the product, on a sunken pill. */
function InfoChip({ icon: iconName, label, accessibilityLabel }: { icon: string; label: string; accessibilityLabel: string }) {
  const { colors } = useNjamTheme();
  return (
    <View accessible accessibilityLabel={accessibilityLabel} style={[styles.chip, { backgroundColor: colors.surfaceSunken }]}>
      <Icon name={iconName} size="xs" color={colors.ink} />
      <Text style={[typography.label, { color: colors.ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // The mark stays at the top beside a name that wraps onto two lines.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
  },
  words: {
    flex: 1,
    gap: space.s2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  chip: {
    height: layout.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingHorizontal: layout.chipPaddingStart,
    borderRadius: radius.pill,
  },
});
