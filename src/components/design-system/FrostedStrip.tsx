/**
 * FrostedStrip: the frosted fade behind the status bar and the TabBar.
 *
 * Content that scrolls underneath blurs gradually: barely at the strip's
 * inner edge, fully at the screen edge, as on iOS (v1.9). Two layers do it:
 *
 *   1. Blur bands. expo-blur can only blur a rectangle evenly, so the strip
 *      stacks blur.bands of them. Each starts a little closer to the screen
 *      edge than the one before and runs to the edge, so the blur adds up
 *      towards the edge instead of starting with a hard line.
 *   2. A tint that fades from clear at the inner edge to surface at
 *      blur.tintOpacity at the screen edge, drawn as an SVG gradient. It
 *      keeps the time, the battery and the tab icons readable over any
 *      picture, and softens the steps between the blur bands.
 *
 * This is the one sanctioned gradient in the product UI (CLAUDE.md rule 3).
 *
 * It only draws. It ignores touches, so whatever sits on top of it (the
 * TabBar) and whatever scrolls under it keep working. On phones that cannot
 * blur (some Android models), the tint alone separates it from the content.
 */
import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { blur } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type FrostedStripProps = {
  /** Which edge of the screen the strip hugs. */
  edge: 'top' | 'bottom';
  /** How tall the strip is, from that edge, including the fade. */
  height: number;
};

export function FrostedStrip({ edge, height }: FrostedStripProps) {
  const { colors, scheme } = useNjamTheme();
  const bandIntensity = blur.intensity / blur.bands;
  const bands = Array.from({ length: blur.bands }, (_, index) => index);

  // The gradient runs from the inner edge (clear) to the screen edge (tinted).
  // For a strip at the top of the screen, the screen edge is y = 0.
  const atTop = edge === 'top';

  return (
    <View
      pointerEvents="none"
      // Nothing here to read, so screen readers skip it.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.strip, { height }, atTop ? styles.top : styles.bottom]}>
      {bands.map((index) => {
        // Band 0 covers the whole strip; each later band is shorter, so more
        // bands overlap (and more blur builds up) nearer the screen edge.
        const bandHeight = height * (1 - index / blur.bands);
        return (
          <BlurView
            key={index}
            intensity={bandIntensity}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={[styles.band, { height: bandHeight }, atTop ? styles.top : styles.bottom]}
          />
        );
      })}

      {/* The gradient id is named after the edge, so the top and bottom strips
          never pick up each other's gradient on the web, where ids are shared. */}
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={`frost-${edge}`} x1="0" y1={atTop ? '1' : '0'} x2="0" y2={atTop ? '0' : '1'}>
            <Stop offset="0" stopColor={colors.surface} stopOpacity={0} />
            <Stop offset="1" stopColor={colors.surface} stopOpacity={blur.tintOpacity} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#frost-${edge})`} />
      </Svg>
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
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  top: {
    top: 0,
  },
  bottom: {
    bottom: 0,
  },
});
