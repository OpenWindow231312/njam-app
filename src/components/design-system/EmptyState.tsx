/**
 * EmptyState: what a list or screen shows when it has nothing yet.
 * Njam has many of these early on, because the catalogue is built as it goes,
 * so they have to look intentional.
 *
 * A soft circle with the symbol of the thing that is empty, a headline, one
 * or two lines of body copy, and one primary button.
 *
 *   pane   - inside a white card with the ambient shadow (the default, as on
 *            the canvas), e.g. "No scans yet" on Home.
 *   screen - no card, more breathing room, when it fills the whole screen.
 *
 * Copy in three parts: name what is missing ("No scans yet"), say what will
 * fill it ("Scan your first product and it will show up here with its
 * verdict."), offer the one action ("Scan a barcode"). Never apologise. Use
 * the symbol of the empty thing ("history", "filter_alt", "groups",
 * "barcode_scanner"), never "info" or "help". No illustration, ever.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type EmptyStateProps = {
  icon: string;
  headline: string;
  body: string;
  actionLabel?: string;
  actionIcon?: string;
  onAction?: () => void;
  variant?: 'pane' | 'screen';
};

export function EmptyState({
  icon,
  headline,
  body,
  actionLabel,
  actionIcon,
  onAction,
  variant = 'pane',
}: EmptyStateProps) {
  const { colors, shadows } = useNjamTheme();
  const isPane = variant === 'pane';

  return (
    <View
      style={[
        styles.container,
        isPane ? [styles.pane, { backgroundColor: colors.surfaceRaised }, shadows.ambient] : styles.screen,
      ]}>
      <View style={[styles.circle, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name={icon} size="lg" color={colors.brandForest} />
      </View>
      <Text accessibilityRole="header" style={[typography.headline, styles.centred, { color: colors.ink }]}>
        {headline}
      </Text>
      <Text style={[typography.body, styles.centred, { color: colors.inkMuted }]}>{body}</Text>
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} icon={actionIcon} onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: space.s3,
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
  },
  pane: {
    paddingVertical: space.s8,
    paddingHorizontal: space.s6,
    borderRadius: radius.lg,
  },
  screen: {
    paddingVertical: space.s12,
    paddingHorizontal: space.s6,
  },
  circle: {
    width: layout.emptyIconSize,
    height: layout.emptyIconSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centred: {
    textAlign: 'center',
  },
  action: {
    marginTop: space.s1,
  },
});
