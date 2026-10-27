/**
 * MunchingMark: the Njam mark taking its bite, for the splash screen only.
 *
 * It starts so big that the mark fills the whole screen. It takes one big
 * bite out of the top right corner, then pulls back until it is exactly the
 * logo (the same geometry as NjamMark) at `size`, centred on `centre`. It
 * plays once and stops: no loop, no bounce. With reduce motion on, it shows
 * the finished logo straight away.
 *
 * Why it draws across the whole screen instead of scaling a small logo up:
 * a view scaled 30 times is drawn small and then stretched, so the edge of
 * the bite would look blurry. Drawing the circles at their real size keeps
 * every edge sharp.
 *
 * Why the bite is a circle painted in the ground colour, not a mask like
 * NjamMark: animating a shape inside an SVG mask does not redraw reliably on
 * every phone. A circle on top, filled with the splash ground, looks the same
 * and always redraws. It only works on a flat ground, which the splash is.
 */
import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { motion } from '@/theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/*
 * The logo's geometry as a share of its size, from NjamMark's 100 x 100 box:
 * a circle of radius 31, with a bite of radius 20 whose centre sits on the
 * diagonal towards the top right, at (80, 20).
 */
const MARK_RADIUS = 0.31;
const BITE_RADIUS = 0.2;
const BITE_DISTANCE = Math.hypot(0.3, 0.3);

/*
 * The first bite, as a share of how far the screen edge is from the centre
 * along that diagonal. 1.58 puts the bite's centre off screen and 0.82 makes
 * it big enough to reach a quarter of the way in, so it reads as a bite out
 * of the screen's corner. Tuned by eye in the prototype.
 */
const FIRST_BITE_DISTANCE = 1.58;
const FIRST_BITE_RADIUS = 0.82;

type MunchingMarkProps = {
  /** The finished logo's size. Pass a value from the tokens. */
  size: number;
  /** Where the finished logo's centre sits on the screen. */
  centre: { x: number; y: number };
  /** The mark's colour. */
  color: string;
  /** The flat ground behind the mark. The bite is painted in it. */
  groundColor: string;
  /** false holds the full-screen mark; true takes the bite and pulls back. */
  play: boolean;
  /** Called once the mark has settled as the logo. */
  onDone: () => void;
};

export function MunchingMark({ size, centre, color, groundColor, play, onDone }: MunchingMarkProps) {
  const reduceMotion = useReducedMotion();
  const screen = useWindowDimensions();

  // The finished logo.
  const finalMark = MARK_RADIUS * size;
  const finalBite = BITE_RADIUS * size;
  const finalDistance = BITE_DISTANCE * size;

  // Full screen: the screen's diagonal is further than any corner can be
  // from the centre, so a circle that big always covers the whole screen.
  const fullMark = Math.hypot(screen.width, screen.height);
  // How far the screen edge is from the centre along the bite's diagonal.
  const edge = Math.min(screen.width - centre.x, centre.y) * Math.SQRT2;

  const markRadius = useSharedValue(reduceMotion ? finalMark : fullMark);
  const biteRadius = useSharedValue(reduceMotion ? finalBite : 0);
  const biteDistance = useSharedValue(reduceMotion ? finalDistance : FIRST_BITE_DISTANCE * edge);

  useEffect(() => {
    if (!play) return;
    if (reduceMotion) {
      onDone();
      return;
    }

    // The bite snaps shut fast and slows at the end. Then the pull back
    // starts and ends gently, so the logo eases into place.
    const bite = { duration: motion.splashBite, easing: Easing.out(Easing.exp) };
    const zoom = { duration: motion.splashZoom, easing: Easing.inOut(Easing.cubic) };

    // The mark holds its full size while the bite lands, then shrinks.
    markRadius.value = withSequence(withTiming(fullMark, bite), withTiming(finalMark, zoom));
    biteDistance.value = withSequence(
      withTiming(FIRST_BITE_DISTANCE * edge, bite),
      withTiming(finalDistance, zoom),
    );
    biteRadius.value = withSequence(
      withTiming(FIRST_BITE_RADIUS * edge, bite),
      withTiming(finalBite, zoom, (finished) => {
        // When the logo has settled, the splash may go on.
        if (finished) scheduleOnRN(onDone);
      }),
    );
    // Runs once, when play turns true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  const markProps = useAnimatedProps(() => ({ r: markRadius.value }));

  // Turn "how far out along the diagonal" into x and y.
  const biteProps = useAnimatedProps(() => {
    const offset = biteDistance.value / Math.SQRT2;
    return {
      cx: centre.x + offset,
      cy: centre.y - offset,
      r: biteRadius.value,
    };
  });

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      width={screen.width}
      height={screen.height}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <AnimatedCircle cx={centre.x} cy={centre.y} animatedProps={markProps} fill={color} />
      <AnimatedCircle animatedProps={biteProps} fill={groundColor} />
    </Svg>
  );
}
