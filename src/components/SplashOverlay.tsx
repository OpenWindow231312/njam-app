/**
 * SplashOverlay: the Njam splash, shown over the app while it starts.
 *
 * The native splash (app.json) is a plain forest screen. As soon as this
 * overlay has drawn the same forest ground with the mark and wordmark on top,
 * the native splash is hidden, so the hand-over is invisible. Then, in order:
 * the mark takes its three bites, "Njam" floats up beneath it, and the whole
 * thing holds still for a moment. The overlay fades out once that is done and
 * the app is `ready` (fonts loaded and the session known), whichever comes last.
 *
 * Forest (surfaceInverse) is the sanctioned splash ground in tokens.ts; every
 * other screen sits on surface.
 */
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { MunchingMark } from '@/components/MunchingMark';
import { layout, motion, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SplashOverlayProps = {
  /** true once the app behind the overlay can be shown. */
  ready: boolean;
};

export function SplashOverlay({ ready }: SplashOverlayProps) {
  const { colors } = useNjamTheme();
  const [drawn, setDrawn] = useState(false);
  const [munched, setMunched] = useState(false);
  const [settled, setSettled] = useState(false);
  const reduceMotion = useReducedMotion();

  // 0 = the wordmark hidden and sitting low, 1 = shown in its place.
  const wordProgress = useSharedValue(0);

  // Hide the native splash only after this overlay is on screen, so there is
  // never a frame with neither of them showing.
  useEffect(() => {
    if (drawn) SplashScreen.hideAsync();
  }, [drawn]);

  // Once the last bite lands: float the wordmark in, then hold before leaving.
  // With reduce motion on, the wordmark simply appears.
  useEffect(() => {
    if (!munched) return;
    wordProgress.value = reduceMotion
      ? 1
      : withTiming(1, { duration: motion.splashWord, easing: Easing.out(Easing.cubic) });

    const wordTime = reduceMotion ? 0 : motion.splashWord;
    const timer = setTimeout(() => setSettled(true), wordTime + motion.splashHold);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [munched]);

  // Fades in while rising space.s4 from below to its place.
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordProgress.value,
    transform: [{ translateY: (1 - wordProgress.value) * space.s4 }],
  }));

  // Unmounting triggers the `exiting` fade below.
  if (ready && settled) return null;

  return (
    <Animated.View
      exiting={FadeOut.duration(motion.splashFade).reduceMotion(ReduceMotion.System)}
      onLayout={() => setDrawn(true)}
      accessibilityLabel="Njam is starting"
      style={[styles.overlay, { backgroundColor: colors.surfaceInverse }]}>
      <MunchingMark
        size={layout.splashMarkSize}
        color={colors.brandLime}
        groundColor={colors.surfaceInverse}
        play={drawn}
        onDone={() => setMunched(true)}
      />
      <Animated.Text
        style={[typography.displayXl, styles.wordmark, { color: colors.inkInverse }, wordStyle]}>
        Njam
      </Animated.Text>
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
