/**
 * ProductGridCard: a product in the two-column grid on Home.
 *
 * A white card (lg radius, ambient shadow, no outline) holding the product
 * photo, its verdict mark in the photo's lower left and a save button in the
 * lower right, then the name and, smaller, the brand and pack size.
 *
 * It stretches to fill its grid column, where ProductTile keeps the fixed
 * shelf width. A product with no photo shows "inventory_2", as ProductTile does.
 *
 * The verdict shows as its shape (circle, triangle, octagon), and the card's
 * screen-reader label says it in words. The full verdict with its reasons is
 * one tap away.
 */
import { Image, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { IconButton } from '@/components/design-system/IconButton';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const spokenWords: Record<VerdictState, string> = { safe: 'safe', caution: 'caution', unsafe: 'not safe' };

type ProductGridCardProps = {
  name: string;
  /** "Clover · 1000 ml": the brand and pack size. */
  detail?: string;
  verdict: VerdictState;
  imageUrl?: string | null;
  saved?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function ProductGridCard({
  name,
  detail,
  verdict,
  imageUrl,
  saved = false,
  onPress,
  onToggleSave,
}: ProductGridCardProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[name, detail, spokenWords[verdict]].filter(Boolean).join(', ')}
      radius={radius.lg}
      style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={[styles.photo, { backgroundColor: colors.surfaceMedia }]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="inventory_2" size="xl" color={colors.inkSubtle} />
        )}

        <View style={styles.mark}>
          <VerdictMark state={verdict} size={icon.markMd} ground="surface" />
        </View>

        {onToggleSave && (
          <View style={styles.save}>
            <IconButton
              icon="bookmark"
              selected={saved}
              accessibilityLabel={saved ? `Remove ${name} from saved` : `Save ${name}`}
              onPress={onToggleSave}
            />
          </View>
        )}
      </View>

      <View style={styles.text}>
        <Text numberOfLines={2} style={[typography.title, { color: colors.ink }]}>
          {name}
        </Text>
        {detail ? (
          <Text numberOfLines={1} style={[typography.bodyS, { color: colors.inkMuted }]}>
            {detail}
          </Text>
        ) : null}
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  // flex: 1 shares the row with the card beside it.
  card: {
    flex: 1,
    padding: space.s2,
    gap: space.s3,
    borderRadius: radius.lg,
  },
  photo: {
    height: layout.productTileImageHeight,
    borderRadius: radius.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  mark: {
    position: 'absolute',
    left: space.s2,
    bottom: space.s2,
  },
  save: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  text: {
    gap: space.s1,
    paddingHorizontal: space.s2,
    paddingBottom: space.s2,
  },
});
