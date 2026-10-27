/**
 * Aisle: every product in one aisle, opened from a row on Search. "saved"
 * as the aisle shows the household's saved products instead.
 *
 * Route params:
 *   aisle   - a category id, or "saved".
 *   verdict - the verdict filter Search had on (optional).
 *   store   - the store id Search had on (optional).
 * The filters start as Search left them, and can be changed here with the
 * filter button. Changing them here does not change Search.
 *
 * Loading, verdicts and saving come from useCatalogue, shared with Home.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, IconButton, LoadingMark, SectionHeader, Snackbar } from '@/components/design-system';
import { FilteredBy } from '@/features/home/FilteredBy';
import { FilterSheet, type VerdictFilter } from '@/features/home/FilterSheet';
import { ProductGrid } from '@/features/home/ProductGrid';
import { applyFilters, useCatalogue } from '@/features/home/use-catalogue';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Params = {
  aisle?: string;
  verdict?: VerdictFilter;
  store?: string;
};

export function AisleScreen() {
  const { colors } = useNjamTheme();
  const params = useLocalSearchParams<Params>();
  const aisle = params.aisle ?? 'all';
  const catalogue = useCatalogue();
  const { loaded, saved } = catalogue;

  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>(params.verdict ?? 'all');
  const [storeId, setStoreId] = useState<string | null>(params.store ?? null);
  const [filtering, setFiltering] = useState(false);

  const shown = applyFilters(catalogue.checked, saved, { query: '', verdictFilter, storeId, aisle, browsing: true });
  const storeName = loaded?.stores.find((store) => store.id === storeId)?.name;
  // "all" is opened by Home's All bubble and its "Safe for you" shelf.
  const aisleName =
    aisle === 'all'
      ? 'All products'
      : aisle === 'saved'
        ? 'Saved products'
        : (loaded?.categories.find((category) => category.id === aisle)?.name ?? 'Aisle');

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.back}>
          <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
        </View>
        <IconButton
          variant="filled"
          icon="tune"
          accessibilityLabel="Filter products"
          onPress={() => setFiltering(true)}
        />
      </View>

      <SectionHeader
        headline={aisleName}
        deck={
          loaded
            ? `${shown.length} ${shown.length === 1 ? 'product' : 'products'}, checked against ${loaded.profile.name}'s rules.`
            : undefined
        }
      />

      <FilteredBy
        verdictFilter={verdictFilter}
        storeName={storeName}
        onClear={() => {
          setVerdictFilter('all');
          setStoreId(null);
        }}
      />

      {!loaded && !catalogue.failed && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking this aisle against your rules</Text>
        </View>
      )}

      {loaded && shown.length === 0 && (
        <EmptyState
          icon={aisle === 'saved' ? 'bookmark' : 'search'}
          headline={aisle === 'saved' ? 'You have not saved anything yet' : 'No products here match your filters'}
          body={
            aisle === 'saved'
              ? 'Tap the bookmark on a product to keep it here for your whole household.'
              : 'Try fewer filters, or scan the barcode of the product you are holding.'
          }
        />
      )}

      <ProductGrid items={shown} saved={saved} onToggleSave={catalogue.toggleSave} />

      {loaded && (
        <FilterSheet
          visible={filtering}
          verdictFilter={verdictFilter}
          onVerdictFilter={setVerdictFilter}
          stores={loaded.stores}
          storeId={storeId}
          onStore={setStoreId}
          resultCount={shown.length}
          onClose={() => setFiltering(false)}
        />
      )}

      {catalogue.failed && (
        <Snackbar
          kind="failure"
          message="We could not load this aisle."
          actionLabel="Retry"
          onAction={catalogue.reload}
          onDismiss={catalogue.dismissFailed}
        />
      )}

      {catalogue.saveFailed && (
        <Snackbar
          kind="failure"
          message="We could not change your saved products. Check your connection."
          onDismiss={catalogue.dismissSaveFailed}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // Pull the back button out so its 24 icon lines up with the screen gutter.
  back: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
});
