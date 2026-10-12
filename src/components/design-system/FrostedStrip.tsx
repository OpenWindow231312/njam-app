/**
 * FrostedStrip: the flat frosted band behind the status bar and the TabBar.
 *
 * Content that scrolls underneath is blurred, with surfaceFrost laid flat
 * on top so the time, the battery and the tab icons stay readable over any
 * picture or text (v1.8). It is one even tint from edge to edge: never a
 * gradient (CLAUDE.md, rule 3).
 *
 * It only draws. It ignores touches, so whatever sits on top of it (the
 * TabBar) and whatever scrolls under it keep working.
 *
 * On phones that cannot blur (some Android models), expo-blur shows no blur
 * and the surfaceFrost tint alone separates the strip from the content.
 */
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';

import { blur } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type FrostedStripProps = {
  /** Which edge of the screen the strip hugs. */
  edge: 'top' | 'bottom';
  /** How tall the strip is, from that edge. */
  height: number;
};

export function FrostedStrip({ edge, height }: FrostedStripProps) {
  const { colors, scheme } = useNjamTheme();

  return (
    <View
      pointerEvents="none"
      // Nothing here to read, so screen readers skip it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.strip, { height }, edge === 'top' ? styles.top : styles.bottom]}>
      <BlurView intensity={blur.intensity} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceFrost }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Keeps the blur inside the strip's own box.
    overflow: 'hidden',
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
