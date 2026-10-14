/**
 * MunchingMark: the Njam mark taking its bite, for the splash screen only.
 *
 * It starts as a whole circle, takes two small nibbles, then one full bite,
 * and ends exactly on the logo (the same geometry as NjamMark). It plays once
 * and stops: no loop, no bounce. With reduce motion on, it shows the finished
 * logo straight away.
 *
 * Why the bite is a circle painted in the ground colour, not a mask like
 * NjamMark: animating a shape inside an SVG mask does not redraw reliably on
 * every phone. A circle on top, filled with the splash ground, looks the same
 * and always redraws. It only works on a flat ground, which the splash is.
 */
import { useEffect } from 'react';
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
 * Geometry in the logo's own 100 x 100 drawing box, as in NjamMark.
 * The mark is a circle of radius 31 at the centre. Each bite is a circle whose
 * centre sits on the diagonal towards the top right, `distance` away from the
 * mark's centre. A bigger bite sits further out, so every bite bites into the
 * edge. The last one (radius 20, at 80,20) is the logo's real bite.
 */
const MARK_CENTRE = 50;
const MARK_RADIUS = 31;
const BITES = [
  { radius: 7, distance: 35 },
  { radius: 12, distance: 37.5 },
  { radius: 20, distance: Math.hypot(30, 30) }, // centre at (80, 20)
];
const FINAL_BITE = BITES[BITES.length - 1];

type MunchingMarkProps = {
  /** Rendered size. Pass a value from the tokens. */
  size: number;
  /** The mark's colour. */
  color: string;
  /** The flat ground behind the mark. The bite is painted in it. */
  groundColor: string;
  /** false holds the whole circle; true starts the bites. */
  play: boolean;
  /** Called once the last bite has landed. */
  onDone: () => void;
};

export function MunchingMark({ size, color, groundColor, play, onDone }: MunchingMarkProps) {
  const reduceMotion = useReducedMotion();

  // Before the first bite: no bite at all (radius 0).
  const biteRadius = useSharedValue(reduceMotion ? FINAL_BITE.radius : 0);
  const biteDistance = useSharedValue(reduceMotion ? FINAL_BITE.distance : BITES[0].distance);

  useEffect(() => {
    if (!play) return;
    if (reduceMotion) {
      onDone();
      return;
    }

    // Each bite snaps shut fast and slows at the end. The slow tail reads as
    // the pause between bites, so no separate delay is needed.
    const timing = { duration: motion.splashBite, easing: Easing.out(Easing.exp) };
    const lastBite = BITES.length - 1;

    biteDistance.value = withSequence(...BITES.map((b) => withTiming(b.distance, timing)));
    biteRadius.value = withSequence(
      ...BITES.map((b, i) =>
        withTiming(b.radius, timing, (finished) => {
          // When the last bite lands, the splash may leave.
          if (finished && i === lastBite) scheduleOnRN(onDone);
        }),
      ),
    );
    // Runs once, when play turns true.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play]);

  // Turn "how far out along the diagonal" into x and y.
  const biteProps = useAnimatedProps(() => {
    const offset = biteDistance.value / Math.SQRT2;
    return {
      cx: MARK_CENTRE + offset,
      cy: MARK_CENTRE - offset,
      r: biteRadius.value,
    };
  });

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Circle cx={MARK_CENTRE} cy={MARK_CENTRE} r={MARK_RADIUS} fill={color} />
      <AnimatedCircle animatedProps={biteProps} fill={groundColor} />
    </Svg>
  );
}
