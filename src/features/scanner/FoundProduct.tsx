/**
 * FoundProduct: the product a barcode found, shown under the brackets.
 *
 * A white card with the product's name and, under it, its brand and pack
 * size ("Bokomo · 450 g"). It sits on the camera for motion.resultHold just
 * before the Verdict screen opens, so the person sees that Njam found the
 * right thing, and a wrong match is easy to spot.
 *
 * Card radius (lg) and the soft ambient shadow, like every white shape. No
 * verdict colour or mark: the verdict has not been decided yet.
 */
import { StyleSheet, Text, View } from 'react-native';

import { radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type FoundProductProps = {
  name: string;
  /** "Bokomo · 450 g". Left out when we know neither. */
  detail?: string;
};

export function FoundProduct({ name, detail }: FoundProductProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Found ${name}${detail ? `, ${detail}` : ''}`}
      style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <Text style={[typography.title, styles.centre, { color: colors.ink }]} numberOfLines={2}>
        {name}
      </Text>
      {detail ? (
        <Text style={[typography.bodyS, styles.centre, { color: colors.inkMuted }]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Hugs a short name; a long one wraps, clear of the panel's edges.
    marginHorizontal: space.s6,
    paddingVertical: space.s3,
    paddingHorizontal: space.s5,
    gap: space.s1,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  centre: {
    textAlign: 'center',
  },
});
