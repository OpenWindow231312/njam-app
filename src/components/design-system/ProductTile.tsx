/**
 * ProductTile: a product in a horizontal shelf on Home ("Safe for everyone",
 * "Recent scans").
 *
 * A white image well (ambient shadow) with the product photo, its verdict dot
 * in the lower left and a save button in the lower right, then the name
 * underneath. A product with no photo shows "inventory_2", which is common
 * early on and should look deliberate, not broken.
 *
 * The verdict shows as its shape (circle, triangle, octagon), and the tile's
 * screen-reader label says the verdict in words. The full verdict with its
 * reasons is one tap away.
 */
import { Image, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { IconButton } from '@/components/design-system/IconButton';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const spokenWords: Record<VerdictState, string> = { safe: 'safe', caution: 'caution', unsafe: 'not safe' };

type ProductTileProps = {
  name: string;
  verdict: VerdictState;
  imageUrl?: string;
  saved?: boolean;
  onPress: () => void;
  onToggleSave?: () => void;
};

export function ProductTile({
  name,
  verdict,
  imageUrl,
  saved = false,
  onPress,
  onToggleSave,
}: ProductTileProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${spokenWords[verdict]}`}
      // The tile shrinks a touch; no wash, because the name sits on the page.
      radius={radius.lg}
      wash={false}
      style={styles.tile}>
      <View style={[styles.well, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="inventory_2" size="xl" color={colors.lineStrong} />
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

      <Text numberOfLines={2} style={[typography.label, { color: colors.ink }]}>
        {name}
      </Text>
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: layout.productTileWidth,
    gap: space.s2,
  },
  well: {
    height: layout.productTileImageHeight,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: radius.lg,
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
});
