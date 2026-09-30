/**
 * ProductCard: a product from the catalogue.
 *
 *   row      - a white card (ambient shadow) in search results and
 *              alternatives: thumbnail, name, brand and size, and the verdict
 *              on the right as its dot with the word under it.
 *   identity - no card: the product at the top of the result screen, with a
 *              larger thumbnail and a meta line such as "Ouma · 500 g ·
 *              Verified". The verdict is shown by the card below it, so it
 *              is not repeated here.
 *
 * Product photography only, never an illustration. With no photo the
 * thumbnail shows "inventory_2". Names wrap to two lines then truncate; brand
 * and size never truncate. Njam is not a price comparison app, so price is
 * never the main detail.
 */
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { VerdictMark, type VerdictState } from '@/components/design-system/VerdictMark';
import { icon, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const words: Record<VerdictState, string> = { safe: 'Safe', caution: 'Check', unsafe: 'Not safe' };
const spokenWords: Record<VerdictState, string> = { safe: 'safe', caution: 'caution', unsafe: 'not safe' };

type ProductCardProps = {
  name: string;
  /** Brand and size, e.g. "Clover · 1 L". */
  detail: string;
  imageUrl?: string;
  variant?: 'row' | 'identity';
  /** Row variant: the verdict against the active scope. */
  verdict?: VerdictState;
  /** Identity variant: an icon before the meta line, e.g. "verified". */
  metaIcon?: string;
  /** Identity variant: e.g. "Verified" or "Read from a label photo, not yet verified". */
  metaText?: string;
  onPress?: () => void;
};

export function ProductCard({
  name,
  detail,
  imageUrl,
  variant = 'row',
  verdict,
  metaIcon,
  metaText,
  onPress,
}: ProductCardProps) {
  const { colors, shadows } = useNjamTheme();
  const isRow = variant === 'row';
  const thumbSize = isRow ? layout.thumbSm : layout.thumbLg;

  const spoken = [name, detail, verdict && spokenWords[verdict], metaText].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={spoken}
      style={({ pressed }) => [
        styles.card,
        isRow && [styles.rowCard, { backgroundColor: pressed ? colors.surfaceSunken : colors.surfaceRaised }],
        isRow && !pressed && shadows.ambient,
      ]}>
      <View
        style={[
          styles.thumb,
          { width: thumbSize, height: thumbSize, backgroundColor: colors.surfaceSunken },
        ]}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} accessibilityIgnoresInvertColors />
        ) : (
          <Icon name="inventory_2" color={colors.lineStrong} />
        )}
      </View>

      <View style={styles.text}>
        <Text
          numberOfLines={2}
          style={[isRow ? typography.title : typography.headline, { color: colors.ink }]}>
          {name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{detail}</Text>
          {!isRow && metaText && (
            <>
              <Text style={[typography.bodyS, { color: colors.inkMuted }]}>·</Text>
              {metaIcon && <Icon name={metaIcon} size="xs" color={colors.brandForest} />}
              <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{metaText}</Text>
            </>
          )}
        </View>
      </View>

      {isRow && verdict && (
        <View style={styles.verdict}>
          <VerdictMark state={verdict} size={icon.markMd} ground="surface" />
          <Text style={[typography.caption, { color: colors.inkMuted }]}>{words[verdict]}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  rowCard: {
    minHeight: layout.touchTargetMin,
    padding: space.s3,
    borderRadius: radius.lg,
  },
  thumb: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  text: {
    flex: 1,
    gap: space.s1,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.s1,
  },
  verdict: {
    flexShrink: 0,
    alignItems: 'center',
    gap: space.s1,
  },
});
