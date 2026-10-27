/**
 * AskNjamRow: the way into Ask Njam on Home, a white row under the search
 * bar (option C, Figma, 27 Oct). The Njam circle, "Ask Njam" and a line
 * saying what it is for, then a chevron. The other screens have the small
 * pill above their headline instead (AskNjamHeader).
 *
 * On Home the pill beside "Check your food" pushed the headline onto two
 * lines, and a whole row is easier to find than a pill in the corner.
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AiAvatar, Icon } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export function AskNjamRow() {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={() => router.push('/ask')}
      accessibilityRole="button"
      accessibilityLabel="Ask Njam, ask about any product and your rules"
      radius={radius.lg}
      style={[styles.row, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <AiAvatar size={layout.iconBadgeSize} />
      <View style={styles.text}>
        <Text style={[typography.title, { color: colors.ink }]}>Ask Njam</Text>
        <Text style={[typography.bodyS, { color: colors.inkMuted }]}>Ask about any product and your rules</Text>
      </View>
      <Icon name="chevron_right" color={colors.inkMuted} />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  // Same padding as an aisle row on Search.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    padding: space.s3,
    paddingRight: space.s4,
    borderRadius: radius.lg,
  },
  text: {
    flex: 1,
  },
});
