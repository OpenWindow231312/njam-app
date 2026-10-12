/**
 * ProductSearch: a search box over the shared catalogue, with its results.
 *
 * Used on Home and on the Search tab. It searches product names and brands
 * as you type, waiting a quarter of a second after the last key so it does
 * not send a request per letter. An empty box lists the whole catalogue,
 * which is small while it holds only seeded products.
 *
 * Tapping a result opens the Verdict screen for that product.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { EmptyState, LoadingMark, ProductCard, Snackbar, TextField } from '@/components/design-system';
import { productDetail } from '@/features/verdict/catalogue';
import { supabase } from '@/lib/supabase';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const TYPING_PAUSE_MS = 250;
const MAX_RESULTS = 40;

type SearchResult = {
  id: string;
  name: string;
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
};

async function searchProducts(query: string): Promise<SearchResult[]> {
  // The search text goes inside a PostgREST filter, where commas, brackets
  // and wildcards have meanings of their own. Remove them rather than escape.
  const cleaned = query.replace(/[,()%*\\]/g, ' ').trim();

  let request = supabase
    .from('products')
    .select('id, name, brand, serving_size, serving_unit')
    .order('name')
    .limit(MAX_RESULTS);
  if (cleaned.length > 0) {
    request = request.or(`name.ilike.%${cleaned}%,brand.ilike.%${cleaned}%`);
  }

  const { data, error } = await request;
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    brand: row.brand,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
  }));
}

export function ProductSearch() {
  const { colors } = useNjamTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [failed, setFailed] = useState(false);
  // Bumped by Retry, so the effect below runs again with the same query.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // `cancelled` stops an older, slower request overwriting newer results.
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchProducts(query)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setFailed(false);
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setSearching(false));
    }, TYPING_PAUSE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, attempt]);

  return (
    <View style={styles.wrapper}>
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

      {searching && results === null && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Searching the catalogue</Text>
        </View>
      )}

      {results !== null && results.length === 0 && (
        <EmptyState
          icon="search"
          headline={`No products match "${query.trim()}"`}
          body="Check the spelling, or scan the barcode instead."
        />
      )}

      {results?.map((product) => (
        <ProductCard
          key={product.id}
          name={product.name}
          detail={productDetail(product)}
          onPress={() => router.push({ pathname: '/verdict', params: { productId: product.id } })}
        />
      ))}

      {failed && (
        <Snackbar
          kind="failure"
          message="We could not search the catalogue."
          actionLabel="Retry"
          onAction={() => setAttempt((count) => count + 1)}
          onDismiss={() => setFailed(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: space.s3,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
});
