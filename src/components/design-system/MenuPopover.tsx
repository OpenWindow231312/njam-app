/**
 * MenuPopover: a small pop-up menu that opens straight under what you tapped
 * or held: the Njam logo at the top of Ask Njam, or one of your messages.
 *
 * White, radius lg, with shadow.menu. Small pop-up menus are the fourth
 * place real elevation is allowed, beside the sheet, modals and the snackbar
 * (CLAUDE.md rule 6, approved 28 Oct 2026). There is no scrim: the page
 * stays as it is, and a tap anywhere outside the menu closes it.
 *
 * Each row is an icon and a label, 48 tall (layout.touchTargetMin). Tapping a
 * row closes the menu first, then runs its action, so an action that opens
 * something else (a sheet, the keyboard) never has the menu in its way.
 *
 * Where it sits:
 *   center - in the middle of the screen, under the anchor. For the logo,
 *            which is itself centred.
 *   end    - its right edge lined up with the anchor's. For your own
 *            messages, which sit on the right.
 */
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** Where the thing that opened the menu is on screen, from measureInWindow. */
export type MenuAnchor = { x: number; y: number; width: number; height: number };

export type MenuItem = {
  /** Material Symbols ligature name. */
  icon: string;
  /** Names the action: "Edit your question", not "Edit". */
  label: string;
  onPress: () => void;
};

type MenuPopoverProps = {
  visible: boolean;
  anchor: MenuAnchor | null;
  align?: 'center' | 'end';
  items: MenuItem[];
  onClose: () => void;
};

export function MenuPopover({ visible, anchor, align = 'center', items, onClose }: MenuPopoverProps) {
  const { colors, shadows } = useNjamTheme();
  const { width } = useWindowDimensions();
  if (!anchor) return null;

  const top = anchor.y + anchor.height + space.s1;
  const place = align === 'center' ? styles.center : { right: width - (anchor.x + anchor.width) };

  return (
    // statusBarTranslucent: on Android the modal then measures from the top
    // of the screen, as measureInWindow does, so the menu lands under its anchor.
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close the menu"
      />
      <View pointerEvents="box-none" style={[styles.place, { top }, place]}>
        <View accessibilityRole="menu" style={[styles.menu, { backgroundColor: colors.surfaceRaised }, shadows.menu]}>
          {items.map((item) => (
            <PressableSurface
              key={item.label}
              radius={radius.md}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              onPress={() => {
                onClose();
                item.onPress();
              }}
              style={styles.row}>
              <Icon name={item.icon} color={colors.ink} />
              <Text style={[typography.body, { color: colors.ink }]}>{item.label}</Text>
            </PressableSurface>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  place: {
    position: 'absolute',
  },
  center: {
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  menu: {
    borderRadius: radius.lg,
    padding: space.s1,
  },
  row: {
    minHeight: layout.touchTargetMin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
    paddingLeft: space.s3,
    // A little more room after the label than before the icon, so the
    // pressed wash does not hug the end of the words.
    paddingRight: space.s5,
    borderRadius: radius.md,
  },
});
