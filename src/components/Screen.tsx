/**
 * Screen: the page every Njam screen sits on.
 *
 * It sets the things every screen shares, so no screen repeats them:
 * the surface background, the frosted strip behind the status bar, the screen gutter, the
 * tablet width cap, and (for tab screens) room at the bottom so the last
 * item is not hidden behind the floating TabBar.
 */
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedStrip } from '@/components/design-system';
import { layout, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ScreenProps = {
  children: ReactNode;
  /** false for screens that manage their own layout, like the scanner. */
  scroll?: boolean;
  /** true on tab screens: leaves room under the content for the TabBar. */
  withTabBar?: boolean;
};

export function Screen({ children, scroll = true, withTabBar = false }: ScreenProps) {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  // The TabBar floats tabBarInset above the phone's own bottom inset (the
  // home indicator strip on iPhones), so the room under the content must
  // include that inset too, or the last item hides behind the bar.
  const bottomRoom = withTabBar
    ? layout.tabBarHeight + layout.tabBarInset + insets.bottom + space.s4
    : space.s8;

  // Content starts below the status bar, but may scroll up behind it,
  // where the frosted strip blurs it (v1.8).
  const topRoom = insets.top + space.s6;

  return (
    <View style={[styles.page, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.page, styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
      <FrostedStrip edge="top" height={insets.top} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.screenGutter,
    gap: space.s6,
  },
});
