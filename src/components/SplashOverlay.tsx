/**
 * SplashOverlay: the Njam splash, shown over the app while it starts.
 *
 * The native splash (app.json) is a plain forest screen. As soon as this
 * overlay has drawn the same forest ground with the mark and wordmark on top,
 * the native splash is hidden, so the hand-over is invisible. The overlay then
 * waits until `ready` (fonts loaded and the session known) and fades out.
 *
 * Forest (surfaceInverse) is the sanctioned splash ground in tokens.ts; every
 * other screen sits on surface.
 */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeOut, ReduceMotion } from 'react-native-reanimated';

import { NjamMark } from '@/components/design-system/NjamMark';
import { layout, motion, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SplashOverlayProps = {
  /** true once the app behind the overlay can be shown. */
  ready: boolean;
};

export function SplashOverlay({ ready }: SplashOverlayProps) {
  const { colors } = useNjamTheme();
  const [drawn, setDrawn] = useState(false);

  // Hide the native splash only after this overlay is on screen, so there is
  // never a frame with neither of them showing.
  useEffect(() => {
    if (drawn) SplashScreen.hideAsync();
  }, [drawn]);

  // Unmounting triggers the `exiting` fade below.
  if (ready && drawn) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(motion.splashFade).reduceMotion(ReduceMotion.System)}
      onLayout={() => setDrawn(true)}
      accessibilityLabel="Njam is starting"
      style={[styles.overlay, { backgroundColor: colors.surfaceInverse }]}>
      <NjamMark size={layout.splashMarkSize} color={colors.brandLime} />
      <Text style={[typography.displayXl, styles.wordmark, { color: colors.inkInverse }]}>
        Njam
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    // Above the navigator, which renders after it in the tree.
    zIndex: 1,
  },
  wordmark: {
    marginTop: space.s4,
  },
});
