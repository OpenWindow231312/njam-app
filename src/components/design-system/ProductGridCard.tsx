/**
 * ProductGridCard: a product as a white card, the one card Njam uses for a
 * product everywhere: the two-column grid on Home, Search and the aisles,
 * and (through ProductTile) the sideways shelves on Home.
 *
 * Laid out as option E on the product card canvas (26 Oct 2026):
 *   - the product photo, layout.productTileImageHeight tall, with its
 *     verdict mark in the lower left and a save button in the upper right.
 *   - under it the brand as an overline, the name in two lines at most,
 *     and the pack size.
 *
 * The save button is a small circle so it reads on any photo: white with a
 * forest outline bookmark when not saved, forest with a lime filled bookmark
 * when saved. It used to be a bare outline, which disappeared on dark packs.
 * The circle is layout.saveButtonSize (32), smaller than an IconButton's 48
 * so it covers less of the pack, but the tap area around it is still 48.
 *
 * A white card (lg radius, ambient shadow, no outline). In the grid it
 * stretches to fill its column; with `shelf` it keeps the fixed shelf width.
 * A product with no photo shows "inventory_2", which is common early on and
 * should look deliberate, not broken.
 *
 * The verdict shows as its shape (circle, triangle, octagon), and the card's
 * screen-reader label says it in words. The full verdict with its reasons is
 * one tap away.
 */
import { Image, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const spokenWords: Record<VerdictState, string> = { safe: 'safe', caution: 'caution', unsafe: 'not safe' };

type ProductGridCardProps = {
  name: string;
  /** "Clover". Left out when the brand is not known. */
  brand?: string | null;
  /** "1000 ml". Left out when the pack size is not known. */
  size?: string | null;
  verdict: VerdictState;
  imageUrl?: string | null;
  saved?: boolean;
  /** true in a sideways shelf: a fixed width instead of filling a grid column. */
  shelf?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function ProductGridCard({
  name,
  brand,
  size,
  verdict,
  imageUrl,
  saved = false,
  shelf = false,
  onPress,
  onToggleSave,
}: ProductGridCardProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[brand, name, size, spokenWords[verdict]].filter(Boolean).join(', ')}
      radius={radius.lg}
      style={[
        styles.card,
        shelf ? styles.shelf : styles.grid,
        { backgroundColor: colors.surfaceRaised },
        shadows.ambient,
      ]}>
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
          <PressableSurface
            onPress={onToggleSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${name} from saved` : `Save ${name}`}
            accessibilityState={{ selected: saved }}
            radius={radius.pill}
            // The 48 target is invisible, so only the circle shrinks; no wash.
            wash={false}
            style={styles.saveTarget}>
            <View style={[styles.saveCircle, { backgroundColor: saved ? colors.selected : colors.surfaceRaised }]}>
              <Icon name="bookmark" size="sm" filled={saved} color={saved ? colors.onSelected : colors.selected} />
            </View>
          </PressableSurface>
        )}
      </View>

      <View style={styles.text}>
        {brand ? (
          <Text numberOfLines={1} style={[typography.overline, { color: colors.inkMuted }]}>
            {brand}
          </Text>
        ) : null}
        <Text numberOfLines={2} style={[typography.title, { color: colors.ink }]}>
          {name}
        </Text>
        {size ? (
          <Text numberOfLines={1} style={[typography.bodyS, { color: colors.inkMuted }]}>
            {size}
          </Text>
        ) : null}
      </View>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.s2,
    gap: space.s3,
    borderRadius: radius.lg,
  },
  // flex: 1 shares the row with the card beside it.
  grid: {
    flex: 1,
  },
  shelf: {
    width: layout.productTileWidth,
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
  // The full 48 tap area, in the photo's corner, with the circle centred in it.
  saveTarget: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: layout.touchTargetMin,
    height: layout.touchTargetMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveCircle: {
    width: layout.saveButtonSize,
    height: layout.saveButtonSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: space.s1,
    paddingHorizontal: space.s1,
    paddingBottom: space.s1,
  },
});
