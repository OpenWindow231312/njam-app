/**
 * Home: the screen after you log in. Laid out as "Home 1 · Shelves" in Figma
 * (18 Oct 2026), after the deal shelves on Sixty60.
 *
 * Top to bottom:
 *   - "Hi Anika, check your food", with Ask Njam on the right.
 *   - whose rules the verdicts are for: "Checking for Anika", "4 rules".
 *     Tapping it opens a tick list of everyone in the household.
 *   - the search bar.
 *   - "Shop by aisle": round aisle bubbles. Each opens that aisle's page.
 *   - a tip card that sends you to the scanner.
 *   - three shelves that scroll sideways, each with See all:
 *       Safe for you            - products Safe for your rules.
 *       Saved by your household - left out until something is saved.
 *       Recently scanned        - left out until there is a scan.
 *
 * The two product shelves only show products with a photo, a brand and a
 * real name (readyToBrowse in use-catalogue.ts), as the aisle pages do.
 * Search shows them all.
 *
 * Typing in the search swaps everything under it for the matching products,
 * two to a row, so searching still works without leaving Home. Clearing the
 * search brings the shelves back.
 *
 * The greeting, search bar, "Checking for" pill and aisle
 * bubbles draw as soon as the small things are in (useCatalogue's basics).
 * Only the shelves wait for the products.
 *
 * Loading, verdicts and saving come from useCatalogue, shared with Search
 * and the aisle page. The catalogue is small, so it is searched on the
 * phone, with no request per letter typed.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useDeferredValue, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  CategoryBubble,
  EmptyState,
  LoadingMark,
  ProductTile,
  SectionHeader,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { useAuth } from '@/features/auth/AuthProvider';
import { HomeScope, scopeName } from '@/features/home/HomeScope';
import { ProductGrid } from '@/features/home/ProductGrid';
import { ProductShelf } from '@/features/home/ProductShelf';
import { ScanTipCard } from '@/features/home/ScanTipCard';
import { applyFilters, readyToBrowse, useCatalogue, type Checked } from '@/features/home/use-catalogue';
import { cardPhotoUrl, packSize } from '@/features/verdict/catalogue';
import { fetchRecentScans, type ScanRecord } from '@/features/verdict/scans';
import { icon, layout, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** How many tiles a shelf shows. The rest are behind See all. */
const SHELF_SIZE = 8;

/** "Hi Anika": the first word of the display name. */
function greeting(displayName: string | undefined): string {
  const firstName = displayName?.trim().split(/\s+/)[0];
  return firstName ? `Hi ${firstName}` : 'Hi there';
}

function openProduct(productId: string) {
  router.push({ pathname: '/verdict', params: { productId } });
}

export function HomeScreen() {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  // Whose rules Home checks against. Empty means the default profile, which
  // is what useCatalogue falls back to until someone is ticked.
  const [checkingFor, setCheckingFor] = useState<string[]>([]);
  const catalogue = useCatalogue(checkingFor);
  const { basics, loaded, saved } = catalogue;

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<ScanRecord[]>([]);

  // Read again each time Home comes into view, so a scan you just made shows.
  // If it fails, the shelf simply stays hidden: it is a shortcut, not the point of Home.
  useFocusEffect(
    useCallback(() => {
      fetchRecentScans(SHELF_SIZE)
        .then(setRecent)
        .catch(() => setRecent([]));
    }, []),
  );

  const selectedIds = basics && checkingFor.length === 0 ? [basics.profile.id] : checkingFor;
  const forWhom = basics ? scopeName(basics.profiles, selectedIds) : '';

  // The box shows each letter at once; the grid follows a moment later, so
  // filtering a thousand products never holds up the typing.
  const searchedFor = useDeferredValue(query);
  const searching = query.trim().length > 0;
  const results = applyFilters(catalogue.checked, saved, {
    query: searchedFor,
    verdictFilter: 'all',
    storeId: null,
    aisle: 'all',
  });
  const onShelf = catalogue.checked.filter((item) => readyToBrowse(item.product));
  const safe = onShelf.filter((item) => item.verdict === 'safe').slice(0, SHELF_SIZE);
  const savedItems = onShelf.filter((item) => saved.has(item.product.id)).slice(0, SHELF_SIZE);

  /** One catalogue product as a tile, with its verdict and bookmark. */
  const tile = ({ product, verdict }: Checked) => (
    <ProductTile
      key={product.id}
      name={product.name}
      brand={product.brand}
      size={packSize(product)}
      verdict={verdict}
      imageUrl={cardPhotoUrl(product.imageUrl)}
      saved={saved.has(product.id)}
      onPress={() => openProduct(product.id)}
      onToggleSave={() => catalogue.toggleSave(product.id)}
    />
  );

  return (
    <Screen withTabBar>
      {/* One View with no gap of its own: the SectionHeader already leaves
          space.s7 under itself, and Screen's gap on top of that pushed the
          scope pill too far from the headline. */}
      <View>
        <AskNjamHeader>
          <View style={styles.heading}>
            <Text style={[typography.title, { color: colors.brandForestMid }]}>{greeting(member?.displayName)}</Text>
            <SectionHeader headline="Check your food" />
          </View>
        </AskNjamHeader>

        {basics && <HomeScope profiles={basics.profiles} selectedIds={selectedIds} onChange={setCheckingFor} />}
      </View>

      {/* No scan button beside the search: the tip card right under it
          already says "Scan a barcode" (user test, 27 Oct). */}
      <TextField
        variant="search"
        label="Search products"
        value={query}
        onChangeText={setQuery}
        placeholder="Search products and brands"
        autoCapitalize="none"
        trailingIcon={query.length > 0 ? 'close' : undefined}
        trailingLabel="Clear search"
        onTrailingPress={() => setQuery('')}
      />

      {/* Searching: the matching products take the shelves' place. */}
      {loaded && searching && (
        <>
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
            {`${results.length} ${results.length === 1 ? 'product' : 'products'}, checked for ${forWhom}`}
          </Text>
          {results.length === 0 && (
            <EmptyState
              icon="search"
              headline="No products match"
              body="Try another spelling, or scan the barcode instead."
              actionLabel="Scan a barcode"
              actionIcon="barcode_scanner"
              onAction={() => router.navigate('/scan')}
            />
          )}
          <ProductGrid items={results} saved={saved} onToggleSave={catalogue.toggleSave} />
        </>
      )}

      {basics && !searching && (
        <View style={styles.aisles}>
          <SectionHeader
            variant="shelf"
            headline="Shop by aisle"
            actionLabel="See all"
            onAction={() => router.navigate('/search')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bleed}
            contentContainerStyle={styles.bubbleRow}>
            <CategoryBubble
              icon="grid_view"
              label="All"
              active
              onPress={() => router.push({ pathname: '/aisle', params: { aisle: 'all' } })}
            />
            <CategoryBubble
              icon="bookmark"
              label="Saved"
              onPress={() => router.push({ pathname: '/aisle', params: { aisle: 'saved' } })}
            />
            {basics.categories.map((category) => (
              <CategoryBubble
                key={category.id}
                icon={category.icon}
                label={category.name}
                onPress={() => router.push({ pathname: '/aisle', params: { aisle: category.id } })}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {!searching && <ScanTipCard />}

      {/* Only the products wait: everything above is already drawn. */}
      {!loaded && !catalogue.failed && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking the catalogue against your rules</Text>
        </View>
      )}

      {loaded && !searching && (
        <>
          {safe.length > 0 && (
            <ProductShelf
              title={`Safe for ${forWhom}`}
              onSeeAll={() => router.push({ pathname: '/aisle', params: { aisle: 'all', verdict: 'safe' } })}>
              {safe.map(tile)}
            </ProductShelf>
          )}

          {savedItems.length > 0 && (
            <ProductShelf
              title="Saved by your household"
              onSeeAll={() => router.push({ pathname: '/aisle', params: { aisle: 'saved' } })}>
              {savedItems.map(tile)}
            </ProductShelf>
          )}

          {recent.length > 0 && (
            <ProductShelf title="Recently scanned" onSeeAll={() => router.navigate('/history')}>
              {recent.map((scan) => (
                <ProductTile
                  key={scan.id}
                  name={scan.productName ?? 'Product from a label photo'}
                  brand={scan.productBrand}
                  verdict={scan.verdict}
                  imageUrl={cardPhotoUrl(scan.productImageUrl)}
                  onPress={() => router.push({ pathname: '/verdict', params: { scanId: scan.id } })}
                />
              ))}
            </ProductShelf>
          )}
        </>
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
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  aisles: {
    gap: space.s2,
  },
  // Pull the row out to the screen edges, then pad it back in, so bubbles
  // scroll off the edge of the phone rather than vanishing at the gutter.
  bleed: {
    marginHorizontal: -layout.screenGutter,
  },
  // Vertical padding leaves room for the bubbles' soft shadow, which the
  // scroll view would otherwise clip.
  bubbleRow: {
    gap: space.s2,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.s2,
  },
});
