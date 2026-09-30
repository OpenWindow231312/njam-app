/**
 * Snackbar: a short status message that needs no decision, e.g. "Added to
 * your saved products". It sits above the tab bar and dismisses itself after
 * four seconds, or six when it carries an action.
 *
 * A forest (surfaceInverse) bar with light copy and the menu shadow: one of
 * the three things in Njam allowed real elevation. Only the icon takes a
 * status colour; a full red or orange bar would read as a verdict.
 *
 *   neutral - something worked. Lime icon ("task_alt").
 *   warning - degraded but still working ("cloud_off"). Orange icon.
 *   failure - something did not happen ("sync_problem"). Red-on-forest icon.
 *             Always offer a retry.
 *
 * At most one action, a verb: "Undo", "Retry", "View". Never "OK".
 * Never use a snackbar for a verdict.
 *
 * The screen decides when to show it (render it or not); this component
 * handles the timer and calls onDismiss when it runs out. A neutral (success)
 * snackbar gives one short success vibration as it appears; warnings and
 * failures never vibrate, so a buzz always means "that worked".
 */
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { hapticSuccess } from '@/lib/haptics';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type SnackbarKind = 'neutral' | 'warning' | 'failure';

type SnackbarProps = {
  message: string;
  kind?: SnackbarKind;
  /** Material Symbols ligature. Defaults by kind. */
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Called when the timer runs out. Leave out to keep it on screen. */
  onDismiss?: () => void;
};

const DEFAULT_ICONS: Record<SnackbarKind, string> = {
  neutral: 'task_alt',
  warning: 'cloud_off',
  failure: 'sync_problem',
};

// How long it stays, in milliseconds. Longer with an action, so there is time to tap it.
const DURATION = 4000;
const DURATION_WITH_ACTION = 6000;

export function Snackbar({
  message,
  kind = 'neutral',
  icon,
  actionLabel,
  onAction,
  onDismiss,
}: SnackbarProps) {
  const { colors, shadows } = useNjamTheme();
  const hasAction = Boolean(actionLabel && onAction);

  // One success buzz when a neutral message appears (and again if its text changes).
  useEffect(() => {
    if (kind === 'neutral') hapticSuccess();
  }, [kind, message]);

  useEffect(() => {
    if (!onDismiss) return;
    const timer = setTimeout(onDismiss, hasAction ? DURATION_WITH_ACTION : DURATION);
    return () => clearTimeout(timer);
  }, [onDismiss, hasAction, message]);

  const iconColor = {
    neutral: colors.accent,
    warning: colors.cautionOnForest,
    failure: colors.unsafeOnForest,
  }[kind];

  return (
    <View
      // Polite, so it never interrupts a verdict being read out.
      accessibilityLiveRegion="polite"
      style={[styles.bar, { backgroundColor: colors.surfaceInverse }, shadows.menu]}>
      <Icon name={icon ?? DEFAULT_ICONS[kind]} color={iconColor} />
      <Text style={[typography.body, styles.message, { color: colors.inkInverse }]}>{message}</Text>
      {hasAction && (
        <Pressable onPress={onAction} accessibilityRole="button" style={styles.action}>
          <Text style={[typography.button, { color: colors.accent }]}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    minHeight: layout.touchTargetMin,
    paddingLeft: space.s4,
    paddingRight: space.s2,
    paddingVertical: space.s2,
    borderRadius: radius.lg,
  },
  message: {
    flex: 1,
  },
  action: {
    minHeight: layout.touchTargetMin,
    justifyContent: 'center',
    paddingHorizontal: space.s3,
  },
});
