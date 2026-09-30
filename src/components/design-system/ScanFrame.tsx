/**
 * ScanFrame: the camera panel on the scanner screen.
 *
 * The page behind stays the light surface (never a dark camera screen). The
 * camera shows inside this rounded panel (radius.xxl). On top of it:
 *   - top row:  the ScopePill (who the scan is for) and the torch button,
 *   - centre:   four white corner brackets marking where the barcode goes,
 *               with a hint pill under them ("Point at a barcode. It scans
 *               by itself."),
 *   - bottom:   one fallback action, e.g. "Type the barcode instead".
 *
 * Pass the live camera (an expo-camera CameraView) as children; it fills the
 * panel behind everything. Until it arrives the panel shows surfaceMedia.
 *
 * Detection is automatic, so there is no shutter button, and nothing on the
 * frame pulses or sweeps at rest.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { IconButton } from '@/components/design-system/IconButton';
import { fontFamilies, layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ScanFrameProps = {
  /** The live camera view. Hidden from screen readers. */
  children?: ReactNode;
  /** The ScopePill. Mandatory in the app; optional here only so previews can leave it out. */
  scope?: ReactNode;
  torchOn: boolean;
  onToggleTorch: () => void;
  /** One short line under the brackets: what to do, or what is happening. */
  hint: string;
  /** One fallback action at the bottom, e.g. a Button to type the barcode. */
  bottomAction?: ReactNode;
};

type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
const CORNERS: Corner[] = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

export function ScanFrame({ children, scope, torchOn, onToggleTorch, hint, bottomAction }: ScanFrameProps) {
  const { colors } = useNjamTheme();

  return (
    <View style={[styles.panel, { backgroundColor: colors.surfaceMedia }]}>
      <View
        style={StyleSheet.absoluteFill}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        {children}
      </View>

      <View style={styles.topRow}>
        <View style={styles.scope}>{scope}</View>
        <IconButton
          icon={torchOn ? 'flashlight_off' : 'flashlight_on'}
          accessibilityLabel={torchOn ? 'Torch off' : 'Torch on'}
          onPress={onToggleTorch}
          variant="raised"
        />
      </View>

      <View style={styles.middle}>
        <View
          style={styles.target}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          {CORNERS.map((corner) => (
            <View
              key={corner}
              style={[styles.bracket, bracketStyles[corner], { borderColor: colors.surfaceRaised }]}
            />
          ))}
        </View>
        <View style={[styles.hint, { backgroundColor: colors.surfaceRaised }]}>
          <Text
            accessibilityLiveRegion="polite"
            style={[typography.body, styles.hintText, { color: colors.ink }]}>
            {hint}
          </Text>
        </View>
      </View>

      {bottomAction && <View style={styles.bottom}>{bottomAction}</View>}
    </View>
  );
}

// Each bracket is a square with two borders drawn and one rounded corner.
const STROKE = layout.scanBracketStroke;
const ROUND = layout.scanBracketSize / 2;
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
    gap: space.s3,
  },
  scope: {
    flexShrink: 1,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: space.s6,
  },
  // Barcodes are wide, so the target spans the panel less space.s10 a side.
  target: {
    alignSelf: 'stretch',
    marginHorizontal: space.s10 - space.s3,
    height: layout.scanFrameHeight,
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
    fontFamily: fontFamilies.textSemiBold,
    textAlign: 'center',
  },
  bottom: {
    alignItems: 'center',
  },
});
