/**
 * StoreLogo: a shop's logo in a round badge, in the filter sheet and under
 * "Where to buy it".
 *
 * The logo is the shop's own square artwork (its app icon, often a coloured
 * tile with the wordmark), drawn as an image that fills the whole circle, so
 * it keeps its own colours. The files are cropped so the mark sits inside
 * the circle. A store with no logo uploaded yet, and "Other", show the
 * storefront icon on white instead, so the badge never looks broken.
 *
 * It always sits on a white surface (a sheet or a list), so it needs no
 * shadow. Decorative: the store's name always sits beside it in words.
 */
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { layout, radius } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type StoreLogoProps = {
  logoUrl: string | null;
};

export function StoreLogo({ logoUrl }: StoreLogoProps) {
  const { colors } = useNjamTheme();
  // A logo that fails to load (deleted, or no connection) falls back to the icon.
  const [failed, setFailed] = useState(false);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.badge, { backgroundColor: colors.surfaceRaised }]}>
      {logoUrl && !failed ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.logo}
          resizeMode="cover"
          onError={() => setFailed(true)}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon name="storefront" size="sm" color={colors.inkMuted} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: layout.iconBadgeSize,
    height: layout.iconBadgeSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  // The whole circle; the badge's overflow: hidden rounds the square off.
  logo: {
    width: layout.iconBadgeSize,
    height: layout.iconBadgeSize,
  },
});
