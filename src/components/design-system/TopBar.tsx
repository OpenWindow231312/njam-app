/**
 * TopBar: the bar pinned to the top of every screen you open from another
 * one, with the back button always in the same place (option C, 27 Oct 2026).
 *
 * - Solid surface, as tall as the status bar plus layout.appBarHeight (56),
 *   so the back button's centre sits 28 below the status bar on every screen.
 * - It has no edge, even with content under it (no line, 27 Oct 2026).
 * - On an aisle, once the big headline has scrolled away, it comes back as a
 *   small title in the bar (showTitle), so you still know where you are.
 * - On a tab screen, which has no back button, the whole bar stays hidden
 *   (hideUntilScrolled) and fades in with the title, so the page looks the
 *   same as before at the top.
 *
 * It only draws the bar. The screen decides when it has scrolled far enough,
 * because only the screen knows what is scrolling (Screen does this for you).
 *
 * The phone's reduce-motion setting makes the title appear at once instead
 * of fading in.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconButton } from '@/components/design-system/IconButton';
import { icon, layout, motion, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type TopBarProps = {
  /** Leave out where there is nothing to go back to, like the first onboarding step. */
  onBack?: () => void;
  /** The page's headline, shown small once showTitle is true. */
  title?: string;
  showTitle?: boolean;
  /** Tab screens: no bar at all until the title shows. */
  hideUntilScrolled?: boolean;
  /** Something other than a title in the middle, always shown: StepProgress on onboarding. */
  middle?: ReactNode;
  /** Controls on the right: a filter button, the "For Anika" switch. */
  trailing?: ReactNode;
};

/** How tall the whole bar is, status bar included, so a screen can start its content below it. */
export function useTopBarHeight() {
  const insets = useSafeAreaInsets();
  return insets.top + layout.appBarHeight;
}

export function TopBar({
  onBack,
  title,
  showTitle = false,
  hideUntilScrolled = false,
  middle,
  trailing,
}: TopBarProps) {
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();
  const titleOpacity = useFade(showTitle);

  return (
    <Animated.View
      // While hidden it must not catch taps meant for the page under it.
      pointerEvents={hideUntilScrolled && !showTitle ? 'none' : 'auto'}
      style={[
        styles.bar,
        { paddingTop: insets.top, backgroundColor: colors.surface },
        hideUntilScrolled && { opacity: titleOpacity },
      ]}>
      <View style={[styles.row, onBack ? styles.withBack : styles.withoutBack]}>
        {onBack && <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={onBack} />}

        {middle ? (
          <View style={styles.title}>{middle}</View>
        ) : (
        <Animated.View
          style={[styles.title, { opacity: titleOpacity }]}
          // Hidden from screen readers until it shows, so the headline is not read twice.
          accessibilityElementsHidden={!showTitle}
          importantForAccessibility={showTitle ? 'auto' : 'no-hide-descendants'}>
          {title && (
            <Text numberOfLines={1} style={[typography.title, { color: colors.ink }]}>
              {title}
            </Text>
          )}
        </Animated.View>
        )}

        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
    </Animated.View>
  );
}

/** An opacity that fades to 1 when shown and back to 0 when not (motion.stateChange). */
function useFade(shown: boolean) {
  const value = useRef(new Animated.Value(shown ? 1 : 0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  useEffect(() => {
    const target = shown ? 1 : 0;
    if (reduceMotion) {
      value.setValue(target);
      return;
    }
    Animated.timing(value, { toValue: target, duration: motion.stateChange, useNativeDriver: true }).start();
  }, [shown, reduceMotion, value]);

  return value;
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    height: layout.appBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    // Controls on the right sit on the gutter as they are.
    paddingRight: layout.screenGutter,
  },
  // The back button's 48 hit area is wider than its 24 icon, so the bar
  // starts that much short of the gutter: the icon itself lines up with it.
  withBack: {
    paddingLeft: layout.screenGutter - (layout.touchTargetMin - icon.sizeMd) / 2,
  },
  withoutBack: {
    paddingLeft: layout.screenGutter,
  },
  title: {
    flex: 1,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
});
