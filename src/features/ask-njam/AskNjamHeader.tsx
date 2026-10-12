/**
 * AskNjamHeader: a screen's SectionHeader with the way into Ask Njam on its
 * right: the Njam mark in a forest circle (AiAvatar), which is how Njam
 * shows the AI everywhere. Home, Search, History and Profile use it. The
 * Scanner does not: nothing should sit over the camera but the scan.
 *
 * The avatar is 52 across, so it already meets the 48 touch target.
 * AiAvatar itself is not tappable, so PressableSurface gives it the same
 * press feedback as every other control.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiAvatar } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { radius, space } from '@/theme/tokens';

export function AskNjamHeader({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>{children}</View>
      <PressableSurface
        onPress={() => router.push('/ask')}
        accessibilityRole="button"
        accessibilityLabel="Ask Njam"
        accessibilityHint="Opens the assistant, which answers using your rules"
        radius={radius.pill}>
        <AiAvatar />
      </PressableSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  // The headline wraps beside the avatar rather than running under it.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
  },
  header: {
    flex: 1,
  },
});
