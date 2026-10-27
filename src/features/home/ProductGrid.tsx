/**
 * ProductGrid: products two to a row, each a ProductGridCard with its verdict
 * and save button. Tapping a card opens its Verdict screen.
 *
 * It draws PAGE_SIZE cards at first, and PAGE_SIZE more each time you tap
 * the button under them. The catalogue holds hundreds of products, and
 * drawing every card (and loading every photo) at once makes the screen slow.
 *
 * Used on Home, Search and an aisle page.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, ProductGridCard } from '@/components/design-system';
import type { Checked } from '@/features/home/use-catalogue';
import { packSize } from '@/features/verdict/catalogue';
import { space } from '@/theme/tokens';

type ProductGridProps = {
  items: Checked[];
  saved: Set<string>;
  onToggleSave: (productId: string) => void;
};

/** How many more cards each tap of the button draws. */
const PAGE_SIZE = 40;

/** Splits the list into rows of two. The last row may hold one. */
function inPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += 2) {
    rows.push(items.slice(index, index + 2));
  }
  return rows;
}

export function ProductGrid({ items, saved, onToggleSave }: ProductGridProps) {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const hidden = items.length - limit;

  return (
    <View style={styles.grid}>
      {inPairs(items.slice(0, limit)).map((pair) => (
        <View key={pair[0].product.id} style={styles.row}>
          {pair.map(({ product, verdict }) => (
            <ProductGridCard
              key={product.id}
              name={product.name}
              brand={product.brand}
              size={packSize(product)}
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
      {hidden > 0 && (
        <Button
          label={`Show ${Math.min(hidden, PAGE_SIZE)} more products`}
          variant="outlined"
          onPress={() => setLimit((current) => current + PAGE_SIZE)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.s4,
  },
  // The same gap as between cards on a shelf, so each card is a little wider.
  row: {
    flexDirection: 'row',
    gap: space.s3,
  },
  spacer: {
    flex: 1,
  },
});
