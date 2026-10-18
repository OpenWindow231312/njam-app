/**
 * ProductShelf: a titled row of ProductTiles that scrolls sideways, with
 * "See all" on the right, like the deal shelves on Sixty60. Home stacks
 * three of them: Safe for you, Saved by your household, Recently scanned.
 *
 * The row runs edge to edge past the screen gutter, so tiles scroll off the
 * side of the phone rather than stopping at an invisible line.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { SectionHeader } from '@/components/design-system';
import { layout, space } from '@/theme/tokens';

type ProductShelfProps = {
  title: string;
  onSeeAll: () => void;
  children: ReactNode;
};

export function ProductShelf({ title, onSeeAll, children }: ProductShelfProps) {
  return (
    <View style={styles.shelf}>
      <SectionHeader variant="shelf" headline={title} actionLabel="See all" onAction={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.bleed}
        contentContainerStyle={styles.row}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: {
    gap: space.s2,
  },
  bleed: {
    marginHorizontal: -layout.screenGutter,
  },
  // Vertical padding leaves room for the tiles' soft shadow, which the
  // scroll view would otherwise clip.
  row: {
    gap: space.s3,
    paddingHorizontal: layout.screenGutter,
    paddingVertical: space.s2,
  },
});
