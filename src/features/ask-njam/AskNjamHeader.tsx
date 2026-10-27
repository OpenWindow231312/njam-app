/**
 * AskNjamHeader: a screen's SectionHeader with the way into Ask Njam on its
 * right. Home, Search, History and Profile use it. The Scanner does not:
 * nothing should sit over the camera but the scan.
 *
 * The way in is a small tonal Button that says "Ask Njam", led by a small
 * AiAvatar (the Njam mark in a forest circle). The avatar on its own read as
 * a profile picture in the user test on 27 Oct, so the label says what it
 * does; the circle keeps it recognisable as the AI. (A chat icon sat there
 * for a while, but "chat" was never added to icon-paths.ts, so it drew
 * nothing.) Tonal keeps it quiet beside the headline, so it never competes
 * with a screen's lime primary button.
 *
 * A small Button is drawn 36 tall; Button extends its tap area to 48.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AiAvatar, Button } from '@/components/design-system';
import { icon, space } from '@/theme/tokens';

export function AskNjamHeader({ children }: { children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.header}>{children}</View>
      <AskNjamButton />
    </View>
  );
}

/** The labelled pill on its own, for screens with no SectionHeader (the Verdict screen's top bar). */
export function AskNjamButton() {
  return (
    <Button
      variant="tonal"
      size="small"
      leading={<AiAvatar size={icon.sizeMd} />}
      label="Ask Njam"
      onPress={() => router.push('/ask')}
    />
  );
}

const styles = StyleSheet.create({
  // The headline wraps beside the pill rather than running under it.
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.s3,
  },
  header: {
    flex: 1,
  },
});
