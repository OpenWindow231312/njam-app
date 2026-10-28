/**
 * AskNjamHeader: a screen's SectionHeader with the way into Ask Njam in a
 * row of its own above it, on the right. Search and History use it. Home
 * has the bigger AskNjamRow under its search bar instead. The Scanner has
 * neither: nothing should sit over the camera but the scan. Profile has
 * neither: it is where you change settings, not ask about food.
 *
 * The pill sits above the headline rather than beside it (option A, Figma,
 * 27 Oct), so the headline gets the full width and never wraps round it.
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
    <View style={styles.column}>
      <View style={styles.pillRow}>
        <AskNjamButton />
      </View>
      {children}
    </View>
  );
}

/** The labelled pill on its own, for the top bar of Verdict, Aisle and Alternatives. */
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
  column: {
    gap: space.s1,
  },
  // A row pushed to the end, not alignItems: Button sets its own
  // alignSelf to flex-start, which beats the parent's alignItems and left
  // the pill on the left.
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
});
