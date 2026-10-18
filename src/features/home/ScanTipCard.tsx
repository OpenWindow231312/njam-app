/**
 * ScanTipCard: the white card on Home that sends you to the scanner, the
 * app's main job. A short tip on the left with "Scan a barcode", and a
 * barcode in a sunken circle on the right.
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Icon } from '@/components/design-system';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export function ScanTipCard() {
  const { colors, shadows } = useNjamTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.text}>
        <Text style={[typography.overline, { color: colors.inkMuted }]}>Quick tip</Text>
        <Text style={[typography.headline, { color: colors.ink }]}>Scan it before it goes in the trolley</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>A verdict for your rules in a few seconds.</Text>
        <View style={styles.button}>
          <Button
            label="Scan a barcode"
            icon="barcode_scanner"
            size="small"
            onPress={() => router.navigate('/scan')}
          />
        </View>
      </View>
      <View style={[styles.art, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name="barcode" size="xl" color={colors.brandForest} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s4,
    padding: space.s4,
    borderRadius: radius.lg,
  },
  text: {
    flex: 1,
    gap: space.s2,
  },
  button: {
    alignSelf: 'flex-start',
  },
  // A thumbnail-sized circle: layout.thumbLg across.
  art: {
    width: layout.thumbLg,
    height: layout.thumbLg,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
