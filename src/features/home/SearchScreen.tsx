/**
 * Search: find a product by name or brand, or browse the catalogue by aisle,
 * like the Discover page in Checkers Sixty60.
 *
 * With the search box empty it lists the aisles, one white row each: the
 * aisle's bubble, its name, how many products it holds, and a chevron. Your
 * saved products come first. A row opens that aisle's page, carrying the
 * filters with it.
 *
 * As soon as you type, the list gives way to the matching products from
 * every aisle, in the same grid as Home.
 *
 * Loading, verdicts and saving come from useCatalogue, shared with Home.
 */
import { router } from 'expo-router';
import { useDeferredValue, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  CategoryBubble,
  EmptyState,
  Icon,
  IconButton,
  LoadingMark,
  SectionHeader,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { FilteredBy } from '@/features/home/FilteredBy';
import { FilterSheet, type VerdictFilter } from '@/features/home/FilterSheet';
import { ProductGrid } from '@/features/home/ProductGrid';
import { applyFilters, useCatalogue, type Aisle } from '@/features/home/use-catalogue';
import { icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export function SearchScreen() {
  const { colors } = useNjamTheme();
  const catalogue = useCatalogue();
  const { loaded, saved } = catalogue;

  const [query, setQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [filtering, setFiltering] = useState(false);

  const searching = query.trim().length > 0;
  /** The products in one aisle that pass the filters, as its page shows them. */
  const inAisle = (aisle: Aisle) =>
    applyFilters(catalogue.checked, saved, { query: '', verdictFilter, storeId, aisle, browsing: true });
  // The box shows each letter at once; the grid follows a moment later, so
  // filtering a thousand products never holds up the typing.
  const searchedFor = useDeferredValue(query);
  const results = applyFilters(catalogue.checked, saved, { query: searchedFor, verdictFilter, storeId, aisle: 'all' });
  const storeName = loaded?.stores.find((store) => store.id === storeId)?.name;

  function openAisle(aisle: Aisle) {
    router.push({ pathname: '/aisle', params: { aisle, verdict: verdictFilter, store: storeId ?? undefined } });
  }

  return (
    <Screen withTabBar>
      <AskNjamHeader>
        <SectionHeader headline="Find a product" deck="Search by name or brand, or browse an aisle." />
      </AskNjamHeader>

      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <TextField
            variant="search"
            label="Search products and brands"
            value={query}
            onChangeText={setQuery}
            placeholder="Search products and brands"
            autoCapitalize="none"
            trailingIcon={query.length > 0 ? 'close' : undefined}
            trailingLabel="Clear search"
            onTrailingPress={() => setQuery('')}
          />
        </View>
        <IconButton
          variant="filled"
          icon="tune"
          accessibilityLabel="Filter products"
          onPress={() => setFiltering(true)}
        />
      </View>

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
          <Text style={[typography.body, { color: colors.inkMuted }]}>Loading the aisles</Text>
        </View>
      )}

      {loaded && !searching && (
        <View style={styles.aisles}>
          <AisleRow icon="bookmark" name="Saved products" count={inAisle('saved').length} onPress={() => openAisle('saved')} />
          {loaded.categories.map((category) => (
            <AisleRow
              key={category.id}
              icon={category.icon}
              name={category.name}
              count={inAisle(category.id).length}
              onPress={() => openAisle(category.id)}
            />
          ))}
        </View>
      )}

      {loaded && searching && results.length === 0 && (
        <EmptyState
          icon="search"
          headline={`No products match "${query.trim()}"`}
          body="Check the spelling, try fewer filters, or scan the barcode instead."
          actionLabel="Scan a barcode"
          actionIcon="barcode_scanner"
          onAction={() => router.navigate('/scan')}
        />
      )}

      {loaded && searching && results.length > 0 && (
        <View style={styles.results}>
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
            {`${results.length} ${results.length === 1 ? 'product' : 'products'}, checked against ${loaded.profile.name}'s rules`}
          </Text>
          <ProductGrid items={results} saved={saved} onToggleSave={catalogue.toggleSave} />
        </View>
      )}

      {loaded && (
        <FilterSheet
          visible={filtering}
          verdictFilter={verdictFilter}
          onVerdictFilter={setVerdictFilter}
          stores={loaded.stores}
          storeId={storeId}
          onStore={setStoreId}
          resultCount={searching ? results.length : inAisle('all').length}
          onClose={() => setFiltering(false)}
        />
      )}

      {catalogue.failed && (
        <Snackbar
          kind="failure"
          message="We could not load the catalogue."
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

/** One aisle as a white row: its bubble, name and product count, and a chevron. */
function AisleRow({ icon: iconName, name, count, onPress }: { icon: string; name: string; count: number; onPress: () => void }) {
  const { colors, shadows } = useNjamTheme();
  const countWords = `${count} ${count === 1 ? 'product' : 'products'}`;
  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${countWords}`}
      radius={radius.lg}
      style={[styles.row, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <CategoryBubble icon={iconName} label={name} onWhite />
      <View style={styles.flex}>
        <Text style={[typography.title, { color: colors.ink }]}>{name}</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{countWords}</Text>
      </View>
      <Icon name="chevron_right" color={colors.inkMuted} />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  flex: {
    flex: 1,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  aisles: {
    gap: space.s3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    padding: space.s3,
    paddingRight: space.s4,
    borderRadius: radius.lg,
  },
  results: {
    gap: space.s3,
  },
});
