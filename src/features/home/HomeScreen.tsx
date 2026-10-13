/**
 * Home: the screen after you log in. "Hi Anika, check your food", a search
 * over the products Njam knows, and a grid of them, each with its verdict
 * for you.
 *
 * Top to bottom:
 *   - the greeting and headline, with Ask Njam on the right.
 *   - the search bar, and the filter button beside it, which opens
 *     FilterSheet (verdict and store). While a filter is on, a line under
 *     the search bar says which, with "Clear filters".
 *   - the aisle bubbles (round icons, like Sixty60's quick shops): All,
 *     Saved, then one per category.
 *   - the products, two to a row.
 *
 * Loading, verdicts and saving come from useCatalogue, shared with Search
 * and the aisle page. The catalogue is small, so it is searched and filtered
 * on the phone, with no request per letter typed.
 *
 * The deck names the profile the verdicts are for, so you know whose rules
 * the marks are for.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  CategoryBubble,
  EmptyState,
  IconButton,
  LoadingMark,
  SectionHeader,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilteredBy } from '@/features/home/FilteredBy';
import { FilterSheet, type VerdictFilter } from '@/features/home/FilterSheet';
import { ProductGrid } from '@/features/home/ProductGrid';
import { applyFilters, useCatalogue, type Aisle } from '@/features/home/use-catalogue';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** "Hi Anika": the first word of the display name. */
function greeting(displayName: string | undefined): string {
  const firstName = displayName?.trim().split(/\s+/)[0];
  return firstName ? `Hi ${firstName}` : 'Hi there';
}

export function HomeScreen() {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  const catalogue = useCatalogue();
  const { loaded, saved } = catalogue;

  const [query, setQuery] = useState('');
  const [aisle, setAisle] = useState<Aisle>('all');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [filtering, setFiltering] = useState(false);

  const shown = applyFilters(catalogue.checked, saved, { query, verdictFilter, storeId, aisle });
  const storeName = loaded?.stores.find((store) => store.id === storeId)?.name;
  const emptySaved = aisle === 'saved' && query.trim() === '';

  return (
    <Screen withTabBar>
      <AskNjamHeader>
        <View style={styles.heading}>
          <Text style={[typography.title, { color: colors.brandForestMid }]}>{greeting(member?.displayName)}</Text>
          <SectionHeader
            headline="Check your food"
            deck={
              loaded
                ? `Each product is checked against ${loaded.profile.name}'s rules.`
                : 'Each product is checked against your rules.'
            }
          />
        </View>
      </AskNjamHeader>

      <View style={styles.searchRow}>
        <View style={styles.flex}>
          <TextField
            variant="search"
            label="Search products"
            value={query}
            onChangeText={setQuery}
            placeholder="Milk, Albany, rusks"
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

      {/* The aisle bubbles scroll sideways, edge to edge past the screen gutter. */}
      <View style={styles.aisles}>
        <SectionHeader variant="shelf" headline="Shop by aisle" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.bleed}
          contentContainerStyle={styles.bubbleRow}>
          <CategoryBubble icon="grid_view" label="All" active={aisle === 'all'} onPress={() => setAisle('all')} />
          <CategoryBubble icon="bookmark" label="Saved" active={aisle === 'saved'} onPress={() => setAisle('saved')} />
          {loaded?.categories.map((category) => (
            <CategoryBubble
              key={category.id}
              icon={category.icon}
              label={category.name}
              active={aisle === category.id}
              onPress={() => setAisle(category.id)}
            />
          ))}
        </ScrollView>
      </View>

      {!loaded && !catalogue.failed && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking the catalogue against your rules</Text>
        </View>
      )}

      {loaded && shown.length === 0 && emptySaved && (
        <EmptyState
          icon="bookmark"
          headline="You have not saved anything yet"
          body="Tap the bookmark on a product to keep it here for your whole household."
        />
      )}

      {loaded && shown.length === 0 && !emptySaved && (
        <EmptyState
          icon="search"
          headline="No products match"
          body="Try another spelling or fewer filters, or scan the barcode instead."
          actionLabel="Scan a barcode"
          actionIcon="barcode_scanner"
          onAction={() => router.navigate('/scan')}
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

const styles = StyleSheet.create({
  heading: {
    gap: space.s1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  flex: {
    flex: 1,
  },
  // Pull the row out to the screen edges, then pad it back in, so bubbles
  // scroll off the edge of the phone rather than vanishing at the gutter.
  bleed: {
    marginHorizontal: -layout.screenGutter,
  },
  aisles: {
    gap: space.s3,
  },
  // Vertical padding leaves room for the bubbles' soft shadow, which the
  // scroll view would otherwise clip.
  bubbleRow: {
    gap: space.s2,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.s2,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
});
