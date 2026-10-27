/**
 * Screen: the page every Njam screen sits on.
 *
 * It sets the things every screen shares, so no screen repeats them:
 * the surface background, the frosted strip behind the status bar, the screen gutter, the
 * tablet width cap, and (for tab screens) room at the bottom so the last
 * item is not hidden behind the floating TabBar.
 *
 * Screens you open from another one pass `topBar`: Screen pins a TopBar
 * over the page instead of the frosted strip, and tells it when the
 * headline has scrolled away, so it can show the title.
 *
 * A screen whose main buttons must stay in reach passes `footer`: Screen
 * pins it under the page, above the phone's bottom inset, and only the
 * content above it scrolls.
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
    /** Leave out to keep the bar empty; only aisles and tab screens show one. */
    title?: string;
    /** Tab screens: no bar until the headline has gone, then it fades in with the title. */
    hideUntilScrolled?: boolean;
    middle?: ReactNode;
    trailing?: ReactNode;
  };
  /** Buttons pinned to the bottom of the screen, under the scrolling content. */
  footer?: ReactNode;
};

export function Screen({ children, scroll = true, withTabBar = false, topBar, footer }: ScreenProps) {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  // The TabBar floats tabBarInset above the phone's own bottom inset (the
  // home indicator strip on iPhones), so the room under the content must
  // include that inset too, or the last item hides behind the bar.
  // A footer takes care of the bottom inset itself, so the content above it
  // needs only a little room.
  const bottomRoom = withTabBar
    ? layout.tabBarHeight + layout.tabBarInset + insets.bottom + space.s4
    : footer
      ? space.s4
      : space.s8;

  // Content starts below the status bar, but may scroll up behind it,
  // where the frosted strip blurs it (v1.8). With a pinned TopBar, it
  // starts below the bar and its fade instead, and scrolls up behind them,
  // so the fade never covers the headline at rest. A bar hidden
  // until you scroll takes no room, so the page starts where it always did.
  const pinnedBar = topBar && !topBar.hideUntilScrolled;
  const topRoom = pinnedBar ? insets.top + layout.appBarHeight + layout.topBarFade : insets.top + space.s6;

  // A yes/no answer for the TopBar, not the scroll distance itself: React
  // skips setting a value that has not changed, so the page only re-renders
  // when the title actually has to change, not on every frame. Scrolled a
  // whole bar's height, the headline has gone under the bar, so the bar
  // takes over its title.
  const [headlineGone, setHeadlineGone] = useState(false);
  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setHeadlineGone(event.nativeEvent.contentOffset.y > layout.appBarHeight);
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
            // One scroll event per frame is enough to fade the title on time.
            scrollEventThrottle={16}
            contentContainerStyle={[styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.page, styles.column, { paddingTop: topRoom, paddingBottom: bottomRoom }]}>
            {children}
          </View>
        )}
        {footer && (
          <View style={[styles.column, styles.footer, { paddingBottom: insets.bottom + space.s4 }]}>{footer}</View>
        )}
      </KeyboardAvoidingView>
      {/* Exactly as tall as the status bar, so the fade happens behind it.
          A pinned TopBar covers the status bar itself, so it needs none. */}
      {!pinnedBar && <FrostedStrip edge="top" height={insets.top} />}
      {topBar && <TopBar {...topBar} showTitle={headlineGone} />}
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
  footer: {
    gap: space.s3,
    paddingTop: space.s3,
  },
});
