/**
 * LoadingMark: the Njam mark rotating on its own centre.
 *
 * The design system allows exactly one loading indicator, and this is it.
 * No spinners, no skeletons, no bouncing dots. It turns once every
 * motion.loadingTurn milliseconds at a constant (linear) speed, and holds
 * still when the phone's "reduce motion" setting is on.
 *
 * Always pair it with a line of text that says what is happening,
 * e.g. "Checking 6 rules". The mark itself is hidden from screen readers.
 */
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, Mask, Rect } from 'react-native-svg';

import { motion } from '@/theme/tokens';

type LoadingMarkProps = {
  /** Rendered size. Pass a value from the icon tokens. */
  size: number;
  /** A colour from useNjamTheme().colors, usually the ink of whatever it sits on. */
  color: string;
};

export function LoadingMark({ size, color }: LoadingMarkProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) return;

    const spin = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: motion.loadingTurn,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    spin.start();
    return () => spin.stop();
  }, [reduceMotion, rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, transform: [{ rotate }] }}>
      {/* The logo geometry from the brand system: a circle with a bite taken
          out of the upper right. Coordinates are in a 100 x 100 box.
          In an SVG mask, white means "show" and black means "cut away", so
          these two are mask instructions, not colours that appear on screen. */}
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <Mask id="bite">
            <Rect x={0} y={0} width={100} height={100} fill="white" />
            <Circle cx={80} cy={20} r={20} fill="black" />
          </Mask>
        </Defs>
        <Circle cx={50} cy={50} r={31} fill={color} mask="url(#bite)" />
      </Svg>
    </Animated.View>
  );
}
