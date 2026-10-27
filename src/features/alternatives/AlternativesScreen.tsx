/**
 * Alternatives: Safe products of the same kind as one that is not Safe.
 * Opened from "See alternatives" on the Verdict screen.
 *
 * Route params (the product may be unverified, so not in the catalogue
 * this screen loads, which is why its name and aisle travel with it):
 *   productId  - the product to replace, left out of the list.
 *   name       - its name, which decides its kind ("nut butters").
 *   categoryId - its aisle, used only when its kind cannot be told.
 *
 * Which products qualify is decided in alternatives.ts. When none do, the
 * screen says so instead of showing unrelated products.
 *
 * Verdicts are for the household's default profile (useCatalogue), so the
 * Verdict screen only offers this while showing that profile.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { EmptyState, LoadingMark, SectionHeader, Snackbar } from '@/components/design-system';
import { pickAlternatives, productKind } from '@/features/alternatives/alternatives';
import { ProductGrid } from '@/features/home/ProductGrid';
import { useCatalogue } from '@/features/home/use-catalogue';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Params = {
  productId?: string;
  name?: string;
  categoryId?: string;
};

export function AlternativesScreen() {
  const { colors } = useNjamTheme();
  const params = useLocalSearchParams<Params>();
  const catalogue = useCatalogue();
  const { loaded, saved } = catalogue;

  const name = params.name ?? 'this product';
  const kind = productKind(name);
  const shown = pickAlternatives(
    { id: params.productId ?? '', name, categoryId: params.categoryId ?? null },
    catalogue.checked,
  );
  const profileName = loaded?.profile.name ?? 'you';

  return (
    <Screen topBar={{ onBack: () => router.back() }}>

      <SectionHeader
        headline={`Instead of ${name}`}
        deck={
          loaded
            ? `${kind ? `Other ${kind}` : 'Products from the same aisle'} that are Safe for ${profileName}.`
            : undefined
        }
      />

      {!loaded && !catalogue.failed && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Checking alternatives against your rules</Text>
        </View>
      )}

      {loaded && shown.length === 0 && (
        <EmptyState
          icon="search"
          headline={kind ? `No other ${kind} are Safe for ${profileName} yet` : `Nothing like this is Safe for ${profileName} yet`}
          body="We only suggest the same kind of product, checked against every rule. If you find one in the shop, scan it and we will check it."
          actionLabel="Scan a barcode"
          actionIcon="barcode_scanner"
          onAction={() => router.navigate('/scan')}
        />
      )}

      <ProductGrid items={shown} saved={saved} onToggleSave={catalogue.toggleSave} />

      {catalogue.failed && (
        <Snackbar
          kind="failure"
          message="We could not load the alternatives."
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
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
});
