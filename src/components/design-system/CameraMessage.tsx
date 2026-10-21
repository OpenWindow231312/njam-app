/**
 * CameraMessage: the one message card on the camera (v1.13).
 *
 * Used for every message the scanner needs to give in words: "We could not
 * read that barcode", "This product is not in Njam yet", and the two photo
 * checks ("Does this photo show the product clearly?"). One card, always in
 * the same place (just under the close and torch buttons, placed by
 * ScanFrame), so the person learns where to look.
 *
 * White (surfaceRaised) with the soft ambient shadow, radius lg like every
 * card. An icon and a title (title style) on one line, then one line of
 * body copy. It carries no buttons: actions stay at the bottom of the camera,
 * where the shutter is.
 *
 * Never coloured in a verdict hue: an error on the camera is not a verdict.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type CameraMessageProps = {
  /** Material Symbols ligature, e.g. "info", "barcode", "photo_camera". */
  icon: string;
  title: string;
  body: string;
};

export function CameraMessage({ icon, title, body }: CameraMessageProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${title}. ${body}`}
      style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
      <View style={styles.titleRow}>
        <Icon name={icon} size="sm" color={colors.ink} />
        <Text style={[typography.title, styles.title, { color: colors.ink }]}>{title}</Text>
      </View>
      <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    padding: space.s4,
    gap: space.s2,
    borderRadius: radius.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  title: {
    flex: 1,
  },
});
