/**
 * FilterSheet: narrows the product grid on Home by verdict and by store.
 *
 * Opened three ways: the filter button beside the search bar, and the two
 * dropdown chips under it ("Every verdict", "Any store"). They all open this
 * one sheet, so there is one place to see and change every filter.
 *
 * Choosing a row applies it straight away; the grid behind updates. The
 * button at the bottom closes the sheet and says how many products are left.
 *
 * Built as a modal, the same way as ProfilePicker on the Verdict screen.
 */
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button, IconButton, ListGroup, ListRow } from '@/components/design-system';
import type { Store } from '@/features/home/stores';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/**
 * all      - every product.
 * safe     - only products that are Safe for you.
 * notUnsafe - Safe and Caution, so nothing you cannot eat.
 */
export type VerdictFilter = 'all' | 'safe' | 'notUnsafe';

export const VERDICT_FILTER_WORDS: Record<VerdictFilter, { title: string; supporting: string }> = {
  all: { title: 'Every verdict', supporting: 'Safe, Caution and Not safe' },
  safe: { title: 'Safe only', supporting: 'Nothing in them breaks your rules' },
  notUnsafe: { title: 'Hide Not safe', supporting: 'Safe, and the ones to check' },
};

const VERDICT_FILTERS: VerdictFilter[] = ['all', 'safe', 'notUnsafe'];

type FilterSheetProps = {
  visible: boolean;
  verdictFilter: VerdictFilter;
  onVerdictFilter: (filter: VerdictFilter) => void;
  stores: Store[];
  /** null means any store. */
  storeId: string | null;
  onStore: (storeId: string | null) => void;
  /** How many products the current filters leave, for the close button. */
  resultCount: number;
  onClose: () => void;
};

export function FilterSheet({
  visible,
  verdictFilter,
  onVerdictFilter,
  stores,
  storeId,
  onStore,
  resultCount,
  onClose,
}: FilterSheetProps) {
  const { colors, shadows } = useNjamTheme();
  // A long store list scrolls inside the card rather than running off screen.
  const { height } = useWindowDimensions();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

        <View
          accessibilityViewIsModal
          accessibilityLabel="Filter products"
          style={[
            styles.card,
            { backgroundColor: colors.surfaceRaised, maxHeight: height * layout.sheetMaxHeight },
            shadows.modal,
          ]}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={[typography.displayS, styles.title, { color: colors.ink }]}>
              Filter products
            </Text>
            <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.sections}>
            <View style={styles.section}>
              <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
                Verdict
              </Text>
              <ListGroup>
                {VERDICT_FILTERS.map((filter) => (
                  <ListRow
                    key={filter}
                    title={VERDICT_FILTER_WORDS[filter].title}
                    supporting={VERDICT_FILTER_WORDS[filter].supporting}
                    value={filter === verdictFilter ? 'Chosen' : undefined}
                    trailing="none"
                    onPress={() => onVerdictFilter(filter)}
                  />
                ))}
              </ListGroup>
            </View>

            <View style={styles.section}>
              <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
                Store
              </Text>
              <ListGroup>
                <ListRow
                  title="Any store"
                  icon="storefront"
                  value={storeId === null ? 'Chosen' : undefined}
                  trailing="none"
                  onPress={() => onStore(null)}
                />
                {stores.map((store) => (
                  <ListRow
                    key={store.id}
                    title={store.name}
                    icon="storefront"
                    value={store.id === storeId ? 'Chosen' : undefined}
                    trailing="none"
                    onPress={() => onStore(store.id)}
                  />
                ))}
              </ListGroup>
            </View>
          </ScrollView>

          <Button
            label={`Show ${resultCount} ${resultCount === 1 ? 'product' : 'products'}`}
            fullWidth
            onPress={onClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: space.s4,
    padding: space.s6,
    borderRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
  sections: {
    gap: space.s6,
  },
  section: {
    gap: space.s2,
  },
});
