/**
 * ConfirmDialog: asks before something that cannot be undone, e.g.
 * "Delete Thabo's profile?".
 *
 * A white card on radius.xl with the modal shadow (one of the three places
 * Njam allows elevation), over the scrim. A soft circle with the symbol of
 * the thing at stake, a title, one or two lines saying exactly what will be
 * lost, then two buttons side by side: the safe choice on the left (tonal)
 * and the confirming one on the right.
 *
 * When `destructive` is on (the default) the confirming button is the red
 * danger variant and tapping the scrim does nothing: dismissal must be a
 * deliberate tap on "Keep". The danger colour means a verdict everywhere
 * else, so it only ever appears inside this dialog or a confirming sheet.
 */
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/design-system/Button';
import { Icon } from '@/components/design-system/Icon';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ConfirmDialogProps = {
  visible: boolean;
  /** Material Symbols ligature for the thing at stake, e.g. "delete". */
  icon: string;
  /** A question: "Delete Thabo's profile?" */
  title: string;
  /** What will be lost: "His 6 rules and scan history go too. This cannot be undone." */
  body: string;
  /** The safe choice, named for what it keeps: "Keep profile". */
  cancelLabel: string;
  /** The action, a verb: "Delete". */
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  destructive?: boolean;
};

export function ConfirmDialog({
  visible,
  icon,
  title,
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  destructive = true,
}: ConfirmDialogProps) {
  const { colors, shadows } = useNjamTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        {/* Tapping outside only closes a dialog that destroys nothing. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={destructive ? undefined : onCancel}
          accessible={false}
        />

        <View
          accessibilityViewIsModal
          accessibilityLabel={title}
          style={[styles.card, { backgroundColor: colors.surfaceRaised }, shadows.modal]}>
          <View style={[styles.circle, { backgroundColor: colors.surfaceSunken }]}>
            <Icon name={icon} color={destructive ? colors.verdictUnsafeInk : colors.brandForest} />
          </View>
          <Text accessibilityRole="header" style={[typography.displayM, { color: colors.ink }]}>
            {title}
          </Text>
          <Text style={[typography.body, { color: colors.inkMuted }]}>{body}</Text>

          <View style={styles.actions}>
            <View style={styles.actionSlot}>
              <Button label={cancelLabel} variant="tonal" onPress={onCancel} fullWidth />
            </View>
            <View style={styles.actionSlot}>
              <Button
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                fullWidth
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'center',
    padding: layout.screenGutter,
  },
  card: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: space.s3,
    padding: space.s6,
    borderRadius: radius.xl,
  },
  circle: {
    width: layout.dialogIconSize,
    height: layout.dialogIconSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: space.s2,
    marginTop: space.s1,
  },
  actionSlot: {
    flex: 1,
  },
});
