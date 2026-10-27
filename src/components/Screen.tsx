/**
 * Screen: the page every Njam screen sits on.
 *
 * It sets the things every screen shares, so no screen repeats them:
 * the surface background, the frosted strip behind the status bar, the screen gutter, the
 * tablet width cap, and (for tab screens) room at the bottom so the last
 * item is not hidden behind the floating TabBar.
 *
 * Screens you open from another one pass `topBar`: Screen pins a TopBar
 * over the page instead of the frosted strip, and tells it when content has
 * scrolled under it (the line) and when the headline has gone (the title).
 */
import { useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedStrip, TopBar } from '@/components/design-system';
import { layout, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type ScreenProps = {
  children: ReactNode;
  /** false for screens that manage their own layout, like the scanner. */
  scroll?: boolean;
  /** true on tab screens: leaves room under the content for the TabBar. */
  withTabBar?: boolean;
  /** The pinned bar with the back button. Its title is the page's headline. */
  topBar?: {
    onBack?: () => void;
    title?: string;
    middle?: ReactNode;
    trailing?: ReactNode;
  };
};

export function Screen({ children, scroll = true, withTabBar = false, topBar }: ScreenProps) {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  // The TabBar floats tabBarInset above the phone's own bottom inset (the
  // home indicator strip on iPhones), so the room under the content must
  // include that inset too, or the last item hides behind the bar.
  const bottomRoom = withTabBar
    ? layout.tabBarHeight + layout.tabBarInset + insets.bottom + space.s4
    : space.s8;

  // Content starts below the status bar, but may scroll up behind it,
  // where the frosted strip blurs it (v1.8). With a TopBar, it starts
  // below the bar instead and scrolls up behind that.
  const topRoom = topBar ? insets.top + layout.appBarHeight + space.s2 : insets.top + space.s6;

  // Two yes/no answers for the TopBar, not the scroll distance itself: React
  // skips setting a value that has not changed, so the page only re-renders
  // when the line or the title actually has to change, not on every frame.
  const [scrolled, setScrolled] = useState(false);
  const [headlineGone, setHeadlineGone] = useState(false);
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = event.nativeEvent.contentOffset.y;
    // Anything at all under the bar: show its edge.
    setScrolled(y > 0);
    // Scrolled a whole bar's height: by then the headline, which starts just
    // below the bar, has gone under it, so the bar takes over its title.
    setHeadlineGone(y > layout.appBarHeight);
  }

  return (
    <View style={[styles.page, { backgroundColor: colors.surface }]}>
      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onScroll={topBar ? onScroll : undefined}
            // One scroll event per frame is enough to fade the bar on time.
            scrollEventThrottle={16}
            contentContainerStyle={[styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.page, styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
      {topBar ? (
        <TopBar {...topBar} showLine={scrolled} showTitle={headlineGone} />
      ) : (
        // Exactly as tall as the status bar, so the fade happens behind it.
        <FrostedStrip edge="top" height={insets.top} />
      )}
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
