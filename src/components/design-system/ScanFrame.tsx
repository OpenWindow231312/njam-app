/**
 * ScanFrame: the camera panel on the scanner screen.
 *
 * The page behind stays the light surface (never a dark camera screen). The
 * camera shows inside this rounded panel (radius.xxl), which fills the
 * screen (v1.13: the scanner hides the TabBar). On top of it:
 *   - top row:  a close button (left) and the torch button (right),
 *   - message:  an optional CameraMessage, always just under the top row,
 *   - centre:   four white corner brackets marking where the barcode (or the
 *               ingredient list) goes, with a hint pill under them, or the
 *               product that was found (`result`) in its place,
 *   - bottom:   the ShutterButton, or the buttons that replace it
 *               ("Retake" and "Use this photo").
 *
 * Pass the live camera (an expo-camera CameraView) as children; it fills the
 * panel behind everything. Until it arrives the panel shows surfaceMedia.
 * Anything else that should sit on the picture (the frozen photo, the scan
 * line, the floating barcode number) goes in `overlay`.
 *
 * Nothing is read until the shutter is pressed, so nothing on the frame
 * pulses or sweeps while the camera is live.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/design-system/IconButton';
import { border, layout, motion, opacity, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ScanFrameProps = {
  /** The live camera view. Hidden from screen readers. */
  children?: ReactNode;
  /** What sits on the picture: the frozen photo and anything drawn over it. */
  overlay?: ReactNode;
  onClose: () => void;
  torchOn: boolean;
  onToggleTorch: () => void;
  /** A CameraMessage, shown just under the top row. */
  message?: ReactNode;
  /** One short line under the brackets: what to do, or what is happening. */
  hint?: string;
  /** Takes the hint's place under the brackets: the product the barcode found. */
  result?: ReactNode;
  /** barcode: a wide target, scanFrameHeight tall. label: a tall one for an ingredient list. none: no brackets. */
  target?: 'barcode' | 'label' | 'none';
  /** Sits just above the brackets: the barcode number floating up as it is read. */
  readout?: ReactNode;
  /** A lime line sweeps through the brackets while a photo is being read. */
  scanning?: boolean;
  /** The ShutterButton, or the buttons that replace it. */
  bottomAction?: ReactNode;
};

type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
const CORNERS: Corner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

export function ScanFrame({
  children,
  overlay,
  onClose,
  torchOn,
  onToggleTorch,
  message,
  hint,
  result,
  target = 'barcode',
  readout,
  scanning = false,
  bottomAction,
}: ScanFrameProps) {
  const { colors } = useNjamTheme();

  return (
    <View style={[styles.panel, { backgroundColor: colors.surfaceMedia }]}>
      <View
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {children}
      </View>
      {overlay && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {overlay}
        </View>
      )}

      <View style={styles.topRow}>
        <IconButton icon="close" accessibilityLabel="Close the scanner" onPress={onClose} variant="raised" />
        <IconButton
          icon={torchOn ? 'flashlight_off' : 'flashlight_on'}
          accessibilityLabel={torchOn ? 'Torch off' : 'Torch on'}
          onPress={onToggleTorch}
          variant="raised"
        />
      </View>

      {message && <View style={styles.message}>{message}</View>}

      <View style={styles.middle}>
        {readout}
        {target !== 'none' && (
          <View
            style={target === 'label' ? styles.labelTarget : styles.barcodeTarget}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants">
            {CORNERS.map((corner) => (
              <View
                key={corner}
                style={[styles.bracket, bracketStyles[corner], { borderColor: colors.surfaceRaised }]}
              />
            ))}
            {scanning && <ScanLine />}
          </View>
        )}
        {result}
        {!result && hint && (
          <View style={[styles.hint, { backgroundColor: colors.surfaceRaised }]}>
            <Text accessibilityLiveRegion="polite" style={[typography.label, styles.hintText, { color: colors.ink }]}>
              {hint}
            </Text>
          </View>
        )}
      </View>

      {bottomAction && <View style={styles.bottom}>{bottomAction}</View>}
    </View>
  );
}

/**
 * The scan line: one flat lime bar (accent, never a gradient) that sweeps
 * down through the brackets and starts again, once every motion.loadingTurn,
 * while a photo is read. Behind it, the part it has passed takes a flat lime
 * wash (accent at opacity.scanRead), so you can see the photo being read
 * line by line. With "reduce motion" on both hold still at the middle.
 */
function ScanLine() {
  const { colors } = useNjamTheme();
  // Held in state, not a ref, so it can be read while rendering.
  const [progress] = useState(() => new Animated.Value(0));
  const [height, setHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(0.5);
      return;
    }
    const sweep = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration: motion.loadingTurn, easing: Easing.linear, useNativeDriver: true }),
    );
    sweep.start();
    return () => sweep.stop();
  }, [progress, reduceMotion]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(height - border.ring, 0)] });

  return (
    <View style={StyleSheet.absoluteFill} onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      {/* Grows down from the top edge with the line: scaleY from the top. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          styles.readWash,
          { backgroundColor: colors.accent, transform: [{ scaleY: progress }] },
        ]}
      />
      <Animated.View style={[styles.scanLine, { backgroundColor: colors.accent, transform: [{ translateY }] }]} />
    </View>
  );
}

// Each bracket is a square with two borders drawn and one rounded corner.
// v1.13: a thinner stroke and a wider radius, so the corner reads as one
// smooth curve rather than an angle.
const STROKE = layout.scanBracketStroke;
const ROUND = layout.scanBracketRadius;
const bracketStyles = StyleSheet.create({
  topLeft: { left: 0, top: 0, borderLeftWidth: STROKE, borderTopWidth: STROKE, borderTopLeftRadius: ROUND },
  topRight: {
    right: 0,
    top: 0,
    borderRightWidth: STROKE,
    borderTopWidth: STROKE,
    borderTopRightRadius: ROUND,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
    borderLeftWidth: STROKE,
    borderBottomWidth: STROKE,
    borderBottomLeftRadius: ROUND,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: STROKE,
    borderBottomWidth: STROKE,
    borderBottomRightRadius: ROUND,
  },
});

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    padding: space.s3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    marginTop: space.s3,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.s6,
  },
  // Barcodes are wide, so the target spans the panel less space.s10 a side.
  barcodeTarget: {
    alignSelf: 'stretch',
    marginHorizontal: space.s10 - space.s3,
    height: layout.scanFrameHeight,
  },
  // An ingredient list is tall: the target takes the free height in the middle.
  labelTarget: {
    alignSelf: 'stretch',
    flex: 1,
    marginHorizontal: space.s6 - space.s3,
    marginTop: space.s6,
  },
  // Inside the bracket stroke, like the line, with the brackets' rounding.
  readWash: {
    margin: layout.scanBracketStroke,
    borderRadius: layout.scanBracketRadius,
    opacity: opacity.scanRead,
    transformOrigin: 'top',
  },
  // Inset by the bracket stroke so the line never pokes past the corners.
  scanLine: {
    marginHorizontal: layout.scanBracketStroke,
    height: border.ring,
    borderRadius: radius.pill,
  },
  bracket: {
    position: 'absolute',
    width: layout.scanBracketSize,
    height: layout.scanBracketSize,
  },
  hint: {
    paddingVertical: space.s2,
    paddingHorizontal: space.s4,
    borderRadius: radius.pill,
  },
  hintText: {
    textAlign: 'center',
  },
  // The shutter sits space.s3 above the panel's own padding: 24 from the edge.
  bottom: {
    alignItems: 'center',
    marginBottom: space.s3,
  },
});
