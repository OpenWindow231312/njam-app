/**
 * ShutterButton: the round button that takes the photo (v1.13).
 *
 * In our user test the camera scanned by itself, so people held it on the
 * product without knowing whether a photo had been taken. Now nothing is read
 * until this button is pressed, and the shape is the one everyone knows from
 * the phone's own camera: a white ring round a white core, with a small gap
 * between them.
 *
 *   ready - white core. Tap to take the photo.
 *   busy  - the photo is being read. The core turns surfaceSunken and the
 *           whole button drops to opacity.disabled; it cannot be tapped.
 *
 * layout.shutterSize across (72), well over the 48 touch target. White
 * shapes carry shadow.ambient instead of an outline, which also keeps the
 * ring visible on a pale camera picture.
 */
import { StyleSheet, View } from 'react-native';

import { PressableSurface } from '@/components/design-system/PressableSurface';
import { border, layout, opacity, radius } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ShutterButtonProps = {
  onPress: () => void;
  /** Names what the photo is for: "Take a photo of the barcode". */
  accessibilityLabel: string;
  busy?: boolean;
};

// The core sits inside the ring with a gap as wide as the ring itself.
const CORE_SIZE = layout.shutterSize - border.ring * 4;

export function ShutterButton({ onPress, accessibilityLabel, busy = false }: ShutterButtonProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <PressableSurface
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: busy, busy }}
      radius={radius.pill}
      wash={false}
      style={[
        styles.ring,
        { borderColor: colors.surfaceRaised, opacity: busy ? opacity.disabled : 1 },
        shadows.ambient,
      ]}>
      <View
        style={[
          styles.core,
          { backgroundColor: busy ? colors.surfaceSunken : colors.surfaceRaised },
          shadows.ambient,
        ]}
      />
    </PressableSurface>
  );
}

const styles = StyleSheet.create({
  ring: {
    width: layout.shutterSize,
    height: layout.shutterSize,
    borderRadius: radius.pill,
    borderWidth: border.ring,
    alignItems: 'center',
    justifyContent: 'center',
  },
  core: {
    width: CORE_SIZE,
    height: CORE_SIZE,
    borderRadius: radius.pill,
  },
});
