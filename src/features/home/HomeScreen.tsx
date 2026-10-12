/**
 * Home: the screen after you log in. The way into the scanner, and a search
 * over the products Njam already knows.
 */
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, SectionHeader } from '@/components/design-system';
import { ProductSearch } from '@/features/home/ProductSearch';
import { space } from '@/theme/tokens';

export function HomeScreen() {
  return (
    <Screen withTabBar>
      <SectionHeader
        headline="Check a product"
        deck="Scan a barcode, or search the products Njam knows. Each one is checked against your rules."
      />

      <Button
        label="Scan a barcode"
        icon="barcode_scanner"
        size="large"
        fullWidth
        onPress={() => router.navigate('/scan')}
      />

      <View style={styles.block}>
        <SectionHeader variant="simple" headline="Search the catalogue" />
        <ProductSearch />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.s3,
  },
});
