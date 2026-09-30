/**
 * TabBar: the floating pill navigation at the bottom of the main screens.
 *
 * Five equal tabs: Home, Search, Scan, History, Profile. Whichever tab is
 * active sits in a lime circle with its icon filled in; every other tab is a
 * plain outlined icon. The lime circle glides from tab to tab, and a finger
 * held on the bar and dragged sideways pulls it along (v1.7). Scan is not styled differently (decision 29 Sep 2026).
 *
 * The bar floats above the content on the soft ambient shadow, with no
 * outline (v1.5). Real elevation stays reserved for sheets, modals and the
 * snackbar. Screens
 * that use it need bottom padding of layout.tabBarHeight + layout.tabBarInset
 * so the last item in a list is not hidden behind it.
 *
 * This component only draws the bar and reports taps. Wiring it to Expo
 * Router happens when the real screens exist.
 */
import { Animated, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/design-system/Icon';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { useSlidingIndicator } from '@/components/design-system/useSlidingIndicator';
import { layout, radius, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

export type TabKey = 'home' | 'search' | 'scan' | 'history' | 'profile';

type Tab = { key: TabKey; icon: string; label: string };

const TABS: Tab[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
  { key: 'scan', icon: 'barcode_scanner', label: 'Scan' },
  { key: 'history', icon: 'history', label: 'History' },
  { key: 'profile', icon: 'person', label: 'Profile' },
];

type TabBarProps = {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  /** false draws the bar in the normal flow instead of floating (previews only). */
  floating?: boolean;
};

export function TabBar({ active, onSelect, floating = true }: TabBarProps) {
  const { colors, shadows } = useNjamTheme();
  const insets = useSafeAreaInsets();
  const selectedIndex = Math.max(
    TABS.findIndex((tab) => tab.key === active),
    0,
  );
  const { panHandlers, onItemLayout, indicatorStyle, highlightIndex } = useSlidingIndicator(
    TABS.length,
    selectedIndex,
    (index) => onSelect(TABS[index].key),
  );

  return (
    <View
      {...panHandlers}
      accessibilityRole="tablist"
      style={[
        styles.bar,
        floating && { ...styles.floating, bottom: layout.tabBarInset + insets.bottom },
        { backgroundColor: colors.surfaceRaised },
        shadows.ambient,
      ]}>
      {/* The lime circle glides to the active tab, and follows a finger dragged along the bar. */}
      <Animated.View
        pointerEvents="none"
        style={[indicatorStyle, { borderRadius: radius.pill, backgroundColor: colors.accent }]}
      />
      {TABS.map((tab, index) => {
        const lit = index === highlightIndex;
        return (
          <PressableSurface
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            onLayout={onItemLayout(index)}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: index === selectedIndex }}
            radius={radius.pill}
            shrink={false}
            style={styles.tab}>
            <Icon name={tab.icon} filled={lit} color={lit ? colors.onAccent : colors.ink} />
          </PressableSurface>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
  },
  bar: {
    height: layout.tabBarHeight,
    paddingHorizontal: space.s2,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tab: {
    width: layout.tabItemSize,
    height: layout.tabItemSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
