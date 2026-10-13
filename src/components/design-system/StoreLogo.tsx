/**
 * StoreLogo: a shop's logo in a round white badge, in the filter sheet and
 * under "Where to buy it".
 *
 * The logo is the shop's own artwork, drawn as an image, so it keeps its own
 * colours. A store with no logo uploaded yet, and "Other", show the
 * storefront icon instead, so the badge never looks broken.
 *
 * It always sits on a white surface (a sheet or a list), so it needs no
 * shadow. Decorative: the store's name always sits beside it in words.
 */
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { layout, radius, space } from '@/theme/tokens';
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
          resizeMode="contain"
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
  // Inset so a square logo sits inside the circle rather than being cut off.
  logo: {
    width: layout.iconBadgeSize - space.s2 * 2,
    height: layout.iconBadgeSize - space.s2 * 2,
  },
});
