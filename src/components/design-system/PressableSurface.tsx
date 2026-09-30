/**
 * PressableSurface: the one way anything tappable in Njam responds to a press.
 *
 * On press it eases (motion.pressIn, 120ms) into its pressed state: the
 * pressed wash (statePressedOverlay) fades in over its fill and, for buttons,
 * chips and cards, it shrinks very slightly (motion.pressScale). On release
 * it eases back (motion.stateChange, 160ms). No bounce. With the phone's
 * "reduce motion" setting on, only the wash fades; nothing moves.
 *
 * Every design-system component that can be tapped is built on this, so the
 * whole app feels the same under a finger. Screens should use the components,
 * not this directly.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { motion } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// The standard easing from the motion foundation: quick start, soft landing.
const EASE = Easing.bezier(0.2, 0, 0, 1);

type PressableSurfaceProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** The corner radius of the surface, so the pressed wash follows its shape. */
  radius: number;
  /** Shrink a little while pressed. Off for list rows and checkboxes, which only darken. */
  shrink?: boolean;
  /** Fade the pressed wash in. Off for a product tile, whose image well is not the whole surface. */
  wash?: boolean;
};

export function PressableSurface({
  style,
  children,
  radius,
  shrink = true,
  wash = true,
  onPressIn,
  onPressOut,
  ...pressableProps
}: PressableSurfaceProps) {
  const { colors } = useNjamTheme();
  const progress = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const animateTo = (value: number, duration: number) => {
    Animated.timing(progress, {
      toValue: value,
      duration,
      easing: EASE,
      useNativeDriver: true,
    }).start();
  };

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, motion.pressScale] });
  const moves = shrink && !reduceMotion;

  return (
    <AnimatedPressable
      {...pressableProps}
      onPressIn={(event) => {
        animateTo(1, motion.pressIn);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(0, motion.stateChange);
        onPressOut?.(event);
      }}
      style={[style, moves && { transform: [{ scale }] }]}>
      {/* The pressed wash sits under the content, over the fill. */}
      {wash && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, backgroundColor: colors.statePressedOverlay, opacity: progress },
          ]}
        />
      )}
      {children}
    </AnimatedPressable>
  );
}
