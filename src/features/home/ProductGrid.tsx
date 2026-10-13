/**
 * ProductGrid: products two to a row, each a ProductGridCard with its verdict
 * and save button. Tapping a card opens its Verdict screen.
 *
 * Used on Home, Search and an aisle page.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ProductGridCard } from '@/components/design-system';
import type { Checked } from '@/features/home/use-catalogue';
import { productDetail } from '@/features/verdict/catalogue';
import { space } from '@/theme/tokens';

type ProductGridProps = {
  items: Checked[];
  saved: Set<string>;
  onToggleSave: (productId: string) => void;
};

/** Splits the list into rows of two. The last row may hold one. */
function inPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

export function ProductGrid({ items, saved, onToggleSave }: ProductGridProps) {
  return (
    <View style={styles.grid}>
      {inPairs(items).map((pair) => (
        <View key={pair[0].product.id} style={styles.row}>
          {pair.map(({ product, verdict }) => (
            <ProductGridCard
              key={product.id}
              name={product.name}
              detail={productDetail(product)}
              verdict={verdict}
              imageUrl={product.imageUrl}
              saved={saved.has(product.id)}
              onPress={() => router.push({ pathname: '/verdict', params: { productId: product.id } })}
              onToggleSave={() => onToggleSave(product.id)}
            />
          ))}
          {/* An odd last card keeps its half width instead of stretching. */}
          {pair.length === 1 && <View style={styles.spacer} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.s4,
  },
  row: {
    flexDirection: 'row',
    gap: space.s4,
  },
  spacer: {
    flex: 1,
  },
});
