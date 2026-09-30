/**
 * useSlidingIndicator: the moving highlight behind the chosen item in a row
 * of equal items (TabBar, SegmentedControl, HouseholdBar).
 *
 * - Tap an item: the highlight glides to it (motion.slide, no bounce).
 * - Hold and drag sideways along the row: the highlight follows your finger,
 *   the item under it lights up, and letting go settles it on the nearest
 *   item and selects that one.
 *
 * Every item in the row must be the same width, which all three are. The
 * component draws the highlight as an absolutely positioned view using the
 * returned style, spreads `panHandlers` on the row, and gives each item
 * `onItemLayout(index)`.
 *
 * The phone's reduce-motion setting makes the highlight jump instead of glide.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';

import { motion } from '@/theme/tokens';

type Box = { x: number; y: number; width: number; height: number };

const EASE = Easing.bezier(0.2, 0, 0, 1);
// How far a finger must move sideways before it counts as a drag, not a tap.
const DRAG_THRESHOLD = 8;

export function useSlidingIndicator(
  count: number,
  selectedIndex: number,
  onSelectIndex: (index: number) => void,
) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const x = useRef(new Animated.Value(0)).current;

  // The pan handler is made once, so it reads the latest values from a ref.
  const latest = useRef({ boxes, selectedIndex, onSelectIndex, reduceMotion, startX: 0, currentX: 0 });
  latest.current = { ...latest.current, boxes, selectedIndex, onSelectIndex, reduceMotion };

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const id = x.addListener(({ value }) => {
      latest.current.currentX = value;
    });
    return () => x.removeListener(id);
  }, [x]);

  const slideTo = (index: number) => {
    const box = latest.current.boxes[index];
    if (!box) return;
    if (latest.current.reduceMotion) {
      x.setValue(box.x);
      return;
    }
    Animated.timing(x, { toValue: box.x, duration: motion.slide, easing: EASE, useNativeDriver: true }).start();
  };

  // Glide whenever the selection changes, and jump into place on first layout.
  // Every item has reported its position (the array can have gaps until then).
  const measured = boxes.filter(Boolean).length === count;
  const placed = useRef(false);
  useEffect(() => {
    if (!measured) return;
    if (!placed.current) {
      x.setValue(boxes[selectedIndex]?.x ?? 0);
      placed.current = true;
      return;
    }
    slideTo(selectedIndex);
    // slideTo reads the latest boxes from the ref; only a selection or layout change should move it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, measured, boxes]);

  /** The item whose centre is closest to a highlight position. */
  const nearestIndex = (position: number) => {
    const all = latest.current.boxes;
    let best = 0;
    all.forEach((box, index) => {
      if (Math.abs(box.x - position) < Math.abs(all[best].x - position)) best = index;
    });
    return best;
  };

  const pan = useRef(
    PanResponder.create({
      // Taps stay with the items; only a clear sideways drag takes over.
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) > DRAG_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        x.stopAnimation();
        latest.current.startX = latest.current.currentX;
      },
      onPanResponderMove: (_event, gesture) => {
        const all = latest.current.boxes;
        if (all.length === 0) return;
        const min = all[0].x;
        const max = all[all.length - 1].x;
        const next = Math.min(Math.max(latest.current.startX + gesture.dx, min), max);
        x.setValue(next);
        setDragIndex(nearestIndex(next));
      },
      onPanResponderRelease: () => {
        const index = nearestIndex(latest.current.currentX);
        setDragIndex(null);
        slideTo(index);
        if (index !== latest.current.selectedIndex) latest.current.onSelectIndex(index);
      },
      onPanResponderTerminate: () => {
        setDragIndex(null);
        slideTo(latest.current.selectedIndex);
      },
    }),
  ).current;

  const onItemLayout = (index: number) => (event: LayoutChangeEvent) => {
    const { x: left, y, width, height } = event.nativeEvent.layout;
    setBoxes((current) => {
      const next = [...current];
      next[index] = { x: left, y, width, height };
      return next;
    });
  };

  // Always absolutely positioned, even before it is measured: if the
  // highlight ever took up space in the row, it would push the items along
  // and their measured positions would be wrong.
  const first = boxes[0];
  const indicatorStyle = {
    position: 'absolute' as const,
    left: 0,
    top: first?.y ?? 0,
    width: first?.width ?? 0,
    height: first?.height ?? 0,
    opacity: measured ? 1 : 0,
    transform: [{ translateX: x }],
  };

  return {
    panHandlers: pan.panHandlers,
    onItemLayout,
    indicatorStyle,
    /** The item to light up: the one under the finger while dragging, else the selected one. */
    highlightIndex: dragIndex ?? selectedIndex,
  };
}
