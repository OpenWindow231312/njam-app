/**
 * FilteredBy: the line under a search bar while a filter is on, saying which
 * ("Filtered by Safe only, Checkers"), with "Clear filters" beside it. The
 * filters live in a sheet, so without this line they would be invisible.
 * Draws nothing when no filter is on.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/design-system';
import { VERDICT_FILTER_WORDS, type VerdictFilter } from '@/features/home/FilterSheet';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type FilteredByProps = {
  verdictFilter: VerdictFilter;
  /** The chosen store's name, or undefined for any store. */
  storeName: string | undefined;
  onClear: () => void;
};

export function FilteredBy({ verdictFilter, storeName, onClear }: FilteredByProps) {
  const { colors } = useNjamTheme();
  const words = [verdictFilter !== 'all' && VERDICT_FILTER_WORDS[verdictFilter], storeName].filter(Boolean);
  if (words.length === 0) return null;

  return (
    <View style={styles.row}>
      <Text style={[typography.bodyS, styles.text, { color: colors.inkMuted }]}>Filtered by {words.join(', ')}</Text>
      <Button label="Clear filters" variant="text" size="small" onPress={onClear} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  text: {
    flex: 1,
  },
});
