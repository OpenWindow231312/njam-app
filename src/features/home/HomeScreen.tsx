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
 * The catalogue is small (a few dozen products), so Home loads all of it once
 * and searches and filters on the phone, with no request per letter typed.
 *
 * Each card's verdict is decided by the verdict engine with the household's
 * default profile, the same profile a scan is recorded against. The deck
 * names that profile, so you know whose rules the marks are for.
 *
 * Everything reloads when you come back to this tab, so a product you saved
 * on its own page shows as saved here.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  CategoryBubble,
  EmptyState,
  IconButton,
  LoadingMark,
  ProductGridCard,
  SectionHeader,
  Snackbar,
  TextField,
  type VerdictState,
} from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { fetchCategories, type Category } from '@/features/home/categories';
import { FilterSheet, VERDICT_FILTER_WORDS, type VerdictFilter } from '@/features/home/FilterSheet';
import { fetchSavedProductIds, saveProduct, unsaveProduct } from '@/features/home/saved-products';
import { fetchStores, type Store } from '@/features/home/stores';
import { fetchActiveProfile, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchCatalogue, productDetail, type CatalogueProduct } from '@/features/verdict/catalogue';
import { decideVerdict } from '@/services/verdict';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** The aisle chips: everything, your saved products, or one category's id. */
type Aisle = 'all' | 'saved' | string;

/** Everything Home loads before it can draw the grid. */
type Loaded = {
  products: CatalogueProduct[];
  profile: ActiveProfile;
  categories: Category[];
  stores: Store[];
};

/** A product with its verdict for the default profile. */
type Checked = { product: CatalogueProduct; verdict: VerdictState };

async function loadHome(householdId: string): Promise<{ loaded: Loaded; saved: Set<string> }> {
  const [products, profile, categories, stores, saved] = await Promise.all([
    fetchCatalogue(),
    fetchActiveProfile(householdId),
    fetchCategories(),
    fetchStores(),
    fetchSavedProductIds(),
  ]);
  if (!profile) throw new Error('No diet profile');
  return { loaded: { products, profile, categories, stores }, saved };
}

/** Does a product's name or brand contain what was typed? Ignores case. */
function matchesSearch(product: CatalogueProduct, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted.length === 0) return true;
  return product.name.toLowerCase().includes(wanted) || (product.brand ?? '').toLowerCase().includes(wanted);
}

function matchesVerdict(verdict: VerdictState, filter: VerdictFilter): boolean {
  if (filter === 'safe') return verdict === 'safe';
  if (filter === 'notUnsafe') return verdict !== 'unsafe';
  return true;
}

/** Splits the list into rows of two for the grid. The last row may hold one. */
function inPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

/** "Hi Anika": the first word of the display name. */
function greeting(displayName: string | undefined): string {
  const firstName = displayName?.trim().split(/\s+/)[0];
  return firstName ? `Hi ${firstName}` : 'Hi there';
}

export function HomeScreen() {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const [query, setQuery] = useState('');
  const [aisle, setAisle] = useState<Aisle>('all');
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [filtering, setFiltering] = useState(false);

  const householdId = member?.householdId;
  const load = useCallback(() => {
    if (!householdId) return;
    loadHome(householdId)
      .then((result) => {
        setLoaded(result.loaded);
        setSaved(result.saved);
        setFailed(false);
      })
      .catch((error) => {
        console.warn('Could not load Home', error);
        setFailed(true);
      });
  }, [householdId]);

  useFocusEffect(load);

  // Decide every product once per load, not on every key typed in the search.
  const checked = useMemo<Checked[]>(() => {
    if (!loaded) return [];
    return loaded.products.map((product) => ({
      product,
      verdict: decideVerdict(
        {
          verified: product.verified,
          readFromLabel: false,
          ingredients: product.ingredients,
          mayContain: product.mayContain,
        },
        loaded.profile.rules,
      ).state,
    }));
  }, [loaded]);

  const shown = checked.filter(
    ({ product, verdict }) =>
      matchesSearch(product, query) &&
      matchesVerdict(verdict, verdictFilter) &&
      (storeId === null || product.storeIds.includes(storeId)) &&
      (aisle === 'all' || (aisle === 'saved' ? saved.has(product.id) : product.categoryId === aisle)),
  );

  /** Saves or unsaves at once on screen, and puts it back if the database says no. */
  function toggleSave(productId: string) {
    const wasSaved = saved.has(productId);
    const flip = (current: Set<string>) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    };
    setSaved(flip);
    (wasSaved ? unsaveProduct(productId) : saveProduct(productId)).catch(() => {
      setSaved(flip);
      setSaveFailed(true);
    });
  }

  const storeName = loaded?.stores.find((store) => store.id === storeId)?.name;

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

      {(verdictFilter !== 'all' || storeId !== null) && (
        <View style={styles.filteredRow}>
          <Text style={[typography.bodyS, styles.flex, { color: colors.inkMuted }]}>
            Filtered by{' '}
            {[verdictFilter !== 'all' && VERDICT_FILTER_WORDS[verdictFilter], storeName].filter(Boolean).join(', ')}
          </Text>
          <Button
            label="Clear filters"
            variant="text"
            size="small"
            onPress={() => {
              setVerdictFilter('all');
              setStoreId(null);
            }}
          />
        </View>
      )}

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

      {!loaded && !failed && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking the catalogue against your rules</Text>
        </View>
      )}

      {loaded && shown.length === 0 && aisle === 'saved' && query.trim() === '' && (
        <EmptyState
          icon="bookmark"
          headline="You have not saved anything yet"
          body="Tap the bookmark on a product to keep it here for your whole household."
        />
      )}

      {loaded && shown.length === 0 && !(aisle === 'saved' && query.trim() === '') && (
        <EmptyState
          icon="search"
          headline="No products match"
          body="Try another spelling or fewer filters, or scan the barcode instead."
          actionLabel="Scan a barcode"
          actionIcon="barcode_scanner"
          onAction={() => router.navigate('/scan')}
        />
      )}

      <View style={styles.grid}>
        {inPairs(shown).map((pair) => (
          <View key={pair[0].product.id} style={styles.gridRow}>
            {pair.map(({ product, verdict }) => (
              <ProductGridCard
                key={product.id}
                name={product.name}
                detail={productDetail(product)}
                verdict={verdict}
                imageUrl={product.imageUrl}
                saved={saved.has(product.id)}
                onPress={() => router.push({ pathname: '/verdict', params: { productId: product.id } })}
                onToggleSave={() => toggleSave(product.id)}
              />
            ))}
            {/* An odd last card keeps its half width instead of stretching. */}
            {pair.length === 1 && <View style={styles.flex} />}
          </View>
        ))}
      </View>

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

      {failed && (
        <Snackbar
          kind="failure"
          message="We could not load the catalogue."
          actionLabel="Retry"
          onAction={load}
          onDismiss={() => setFailed(false)}
        />
      )}

      {saveFailed && (
        <Snackbar
          kind="failure"
          message="We could not change your saved products. Check your connection."
          onDismiss={() => setSaveFailed(false)}
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
  // Pull the row out to the screen edges, then pad it back in, so chips
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
  filteredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  grid: {
    gap: space.s4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: space.s4,
  },
});
