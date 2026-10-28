/**
 * AvailableAt: the stores that sell the product, logo over name, in a row
 * that scrolls sideways. A store opens the product, or the store, on its
 * website in the in-app browser. "Other" has no website, so it is not
 * tappable. The Verdict screen leaves this out when no store is known.
 *
 * The row runs to both edges of the drawer, so a long list visibly carries
 * on past the edge, while the first logo still lines up with the text above.
 */
import { openBrowserAsync } from 'expo-web-browser';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { StoreLogo } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import type { StoreForProduct } from '@/features/home/stores';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type AvailableAtProps = {
  stores: StoreForProduct[];
  /** The drawer's side padding, so the row can run out to its edges. */
  edgeInset: number;
};

export function AvailableAt({ stores, edgeInset }: AvailableAtProps) {
  const { colors } = useNjamTheme();

  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
        Available at
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -edgeInset }}
        contentContainerStyle={{ paddingHorizontal: edgeInset }}>
        {stores.map((store) => {
          const words = (
            <>
              <StoreLogo logoUrl={store.logoUrl} size={layout.storeLogoLarge} />
              <Text numberOfLines={1} style={[typography.caption, styles.name, { color: colors.ink }]}>
                {store.name}
              </Text>
            </>
          );
          const link = store.link;
          return link ? (
            <PressableSurface
              key={store.id}
              onPress={() => openBrowserAsync(link)}
              accessibilityRole="link"
              accessibilityLabel={`${store.name}, open the website`}
              radius={radius.lg}
              style={styles.store}>
              {words}
            </PressableSurface>
          ) : (
            <View
              key={store.id}
              accessible
              accessibilityLabel={`${store.name}, sold somewhere not on our list`}
              style={styles.store}>
              {words}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.s2,
  },
  // 72 wide and logo-plus-name tall, so every store is over the 48 touch target.
  store: {
    width: layout.storeColumnWidth,
    alignItems: 'center',
    gap: space.s1,
  },
  name: {
    textAlign: 'center',
  },
});
