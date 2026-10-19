/**
 * BottomSheet: a panel that rises from the bottom of the screen over a scrim.
 *
 * The design system described it but had not drawn it yet. First built for
 * the Rules tab on Profile (18 Oct 2026), where tapping a rule opens it.
 *
 *   - White (surfaceRaised), xl corners on top only, and the sheet shadow:
 *     one of the three places real elevation is allowed.
 *   - Never taller than layout.sheetMaxHeight of the screen. Past that, the
 *     body scrolls and the header and footer stay put.
 *   - A title (displayM), an optional line under it, and a close button.
 *     Tapping the scrim or Android's back button closes it too.
 *   - `footer` holds the actions, so they stay in reach while the body scrolls.
 *
 * Built as a modal, the same way as FilterSheet on Home.
 */
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/design-system/IconButton';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type BottomSheetProps = {
  visible: boolean;
  /** What the sheet is about: "Milk", "Add a rule". */
  title: string;
  /** One line under the title: "Allergy". */
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** The sheet's buttons, kept below the scrolling body. */
  footer?: ReactNode;
};

export function BottomSheet({ visible, title, subtitle, onClose, children, footer }: BottomSheetProps) {
  const { colors, shadows } = useNjamTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: colors.surfaceScrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />

        {/* Lifts the sheet above the keyboard when a field inside it has focus. */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surfaceRaised,
                maxHeight: height * layout.sheetMaxHeight,
                paddingBottom: insets.bottom + space.s6,
              },
              shadows.sheet,
            ]}>
            <View style={styles.header}>
              <View style={styles.titles}>
                <Text accessibilityRole="header" style={[typography.displayM, { color: colors.ink }]}>
                  {title}
                </Text>
                {subtitle && <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{subtitle}</Text>}
              </View>
              <IconButton icon="close" accessibilityLabel="Close" onPress={onClose} />
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>

            {footer && <View style={styles.footer}>{footer}</View>}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    gap: space.s5,
    paddingTop: space.s6,
    paddingHorizontal: space.s6,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  titles: {
    flex: 1,
  },
  // flexShrink lets the body give way, so a long body scrolls inside the
  // sheet's maxHeight instead of pushing the footer off the screen.
  body: {
    flexShrink: 1,
  },
  bodyContent: {
    gap: space.s5,
  },
  footer: {
    gap: space.s2,
  },
});
