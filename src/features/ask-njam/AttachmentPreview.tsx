/**
 * AttachmentPreview: what "+" added, in the typing bar above your message.
 *
 *   product - a product you scanned: its photo (or a box icon), name and
 *             brand · size.
 *   label   - an ingredient list read from a label photo: the photo and how
 *             many ingredients were read.
 *   reading - a photo you chose, while the label reader is still reading it.
 *
 * The cross takes it off your question. It never decides anything: the
 * verdict for a label read is drawn by LabelReadBlock once you send it.
 */
import { Image, StyleSheet, Text, View } from 'react-native';

import { Icon, IconButton, LoadingMark } from '@/components/design-system';
import { productDetail, type CatalogueProduct } from '@/features/verdict/catalogue';
import type { LabelRead } from '@/services/ai';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type Attached =
  | { kind: 'product'; product: CatalogueProduct }
  | { kind: 'label'; photoUri: string; read: LabelRead }
  | { kind: 'reading'; photoUri: string };

/** "12 ingredients read", as the Scanner says it. */
export function ingredientsRead(read: LabelRead): string {
  const count = read.ingredients.length;
  return `${count} ${count === 1 ? 'ingredient' : 'ingredients'} read`;
}

/** "Bakers Tennis Biscuits", the name a question uses for a product. */
export function productName(product: CatalogueProduct): string {
  return product.brand ? `${product.brand} ${product.name}` : product.name;
}

export function AttachmentPreview({ attached, onRemove }: { attached: Attached; onRemove: () => void }) {
  const { colors } = useNjamTheme();
  const photo = attached.kind === 'product' ? attached.product.imageUrl : attached.photoUri;

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceSunken }]}>
      <View style={[styles.thumb, { backgroundColor: colors.surfaceMedia }]}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="inventory_2" color={colors.inkMuted} />
        )}
      </View>
      <View style={styles.text}>
        {attached.kind === 'product' && (
          <>
            <Text numberOfLines={1} style={[typography.body, { color: colors.ink }]}>
              {attached.product.name}
            </Text>
            <Text numberOfLines={1} style={[typography.bodyS, { color: colors.inkMuted }]}>
              {productDetail(attached.product)}
            </Text>
          </>
        )}
        {attached.kind === 'label' && (
          <>
            <Text style={[typography.body, { color: colors.ink }]}>Ingredient list from your photo</Text>
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{ingredientsRead(attached.read)}</Text>
          </>
        )}
        {attached.kind === 'reading' && (
          <View accessibilityLiveRegion="polite" style={styles.reading}>
            <LoadingMark size={icon.sizeSm} color={colors.brandForest} />
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>Reading the ingredient list</Text>
          </View>
        )}
      </View>
      <IconButton icon="close" accessibilityLabel="Take this off your question" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Sunken, with no edge, like the search bar: it sits inside the white bar.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s1,
    borderRadius: radius.lg,
  },
  thumb: {
    width: layout.thumbSm,
    height: layout.thumbSm,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  text: {
    flex: 1,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
});
