/**
 * Admin review queue: where an admin verifies products that shoppers added or
 * Njam read from a label. Until a product is verified here, the verdict
 * engine caps it at Caution, so this screen is the human half of "no false
 * Safe".
 *
 * Roles, at two levels:
 *   - The app: only an admin sees the way in (on Profile), and anyone else
 *     who reaches this route sees "Only admins can review products".
 *   - The database: products_update allows the change only for an admin
 *     (RLS), so hiding the button is a courtesy, not the protection.
 *
 * Verifying asks first, because it lets the product be Safe for everyone.
 */
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  IconButton,
  LoadingMark,
  ProductCard,
  SectionHeader,
  Snackbar,
} from '@/components/design-system';
import { fetchUnverifiedProducts, verifyProduct } from '@/features/admin-review/review-queue';
import { useAuth } from '@/features/auth/AuthProvider';
import { productDetail, type CatalogueProduct } from '@/features/verdict/catalogue';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Loaded = { kind: 'loading' } | { kind: 'shown'; products: CatalogueProduct[] } | { kind: 'failed' };

function sourceText(product: CatalogueProduct): string {
  if (product.source === 'ai_label_read') return 'Read from a label photo';
  if (product.source === 'user') return 'Added by a shopper';
  return 'Not yet verified';
}

export function AdminReviewScreen() {
  const { colors, shadows } = useNjamTheme();
  const { member } = useAuth();
  const isAdmin = member?.role === 'admin';

  const [loaded, setLoaded] = useState<Loaded>({ kind: 'loading' });
  const [confirming, setConfirming] = useState<CatalogueProduct | null>(null);
  const [message, setMessage] = useState<{ kind: 'neutral' | 'failure'; text: string } | null>(null);

  const load = useCallback(() => {
    setLoaded({ kind: 'loading' });
    fetchUnverifiedProducts()
      .then((products) => setLoaded({ kind: 'shown', products }))
      .catch(() => setLoaded({ kind: 'failed' }));
  }, []);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  async function verify(product: CatalogueProduct) {
    setConfirming(null);
    try {
      await verifyProduct(product.id);
      setMessage({ kind: 'neutral', text: `${product.name} is verified.` });
      load();
    } catch {
      setMessage({ kind: 'failure', text: `We could not verify ${product.name}.` });
    }
  }

  return (
    <Screen>
      <View style={styles.topBar}>
        <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
      </View>

      <SectionHeader
        headline="Review queue"
        deck="Products shoppers added or Njam read from a label. None of them can be Safe until you verify them."
      />

      {!isAdmin && (
        <EmptyState
          icon="lock"
          headline="Only admins can review products"
          body="Verifying a product changes verdicts for every household, so it is kept to admins."
        />
      )}

      {isAdmin && loaded.kind === 'loading' && (
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeLg} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Loading the queue</Text>
        </View>
      )}

      {isAdmin && loaded.kind === 'failed' && (
        <EmptyState
          icon="cloud_off"
          headline="We could not load the queue"
          body="Check your connection and try again."
          actionLabel="Try again"
          onAction={load}
        />
      )}

      {isAdmin && loaded.kind === 'shown' && loaded.products.length === 0 && (
        <EmptyState
          icon="verified"
          headline="Nothing to review"
          body="Every product in the catalogue has been verified."
        />
      )}

      {isAdmin &&
        loaded.kind === 'shown' &&
        loaded.products.map((product) => (
          <View key={product.id} style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
            <ProductCard
              variant="identity"
              name={product.name}
              detail={productDetail(product)}
              metaIcon="info"
              metaText={sourceText(product)}
            />
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
              {product.ingredients.length > 0
                ? product.ingredients.map((item) => item.name).join(', ')
                : 'No ingredient list yet.'}
            </Text>
            <Button
              label="Verify this product"
              icon="verified"
              variant="secondary"
              fullWidth
              onPress={() => setConfirming(product)}
            />
          </View>
        ))}

      <ConfirmDialog
        visible={confirming !== null}
        icon="verified"
        title={`Verify ${confirming?.name ?? 'this product'}?`}
        body="Check the ingredient list against the pack first. Once verified, it can be Safe for anyone whose rules it passes."
        cancelLabel="Not yet"
        confirmLabel="Verify"
        destructive={false}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && verify(confirming)}
      />

      {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Pull the back button out so its 24 icon lines up with the gutter (as on Verdict).
  topBar: {
    marginLeft: -(layout.touchTargetMin - icon.sizeMd) / 2,
    alignItems: 'flex-start',
  },
  loading: {
    alignItems: 'center',
    gap: space.s3,
    paddingVertical: space.s12,
  },
  card: {
    gap: space.s3,
    padding: space.s4,
    borderRadius: radius.lg,
  },
});
