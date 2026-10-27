/**
 * AskNjamHeader: a screen's SectionHeader with the way into Ask Njam on its
 * right. Home, Search, History and Profile use it. The Scanner does not:
 * nothing should sit over the camera but the scan.
 *
 * The way in is a small tonal Button that says "Ask Njam", with a chat icon.
 * It used to be the Njam mark in a round forest circle (AiAvatar), but in the
 * user test on 27 Oct that read as a profile picture, so the label now says
 * what it does. Tonal keeps it quiet beside the headline, so it never
 * competes with a screen's lime primary button.
 *
 * A small Button is drawn 36 tall; Button extends its tap area to 48.
 */
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/design-system';
import { space } from '@/theme/tokens';

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
  return <Button variant="tonal" size="small" icon="chat" label="Ask Njam" onPress={() => router.push('/ask')} />;
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
