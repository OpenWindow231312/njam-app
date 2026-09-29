/**
 * TabBar: the floating pill navigation at the bottom of the main screens.
 *
 * Five equal tabs: Home, Search, Scan, History, Profile. Whichever tab is
 * active sits in a lime circle and takes its filled weight; every other tab
 * is a plain icon. Scan is not styled differently (decision 29 Sep 2026).
 *
 * The bar floats above the content with a hairline border, not a shadow
 * (elevation stays reserved for sheets, modals and the snackbar). Screens
 * that use it need bottom padding of layout.tabBarHeight + layout.tabBarInset
 * so the last item in a list is not hidden behind it.
 *
 * This component only draws the bar and reports taps. Wiring it to Expo
 * Router happens when the real screens exist.
 */
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/design-system/Icon';
import { border, layout, radius, space } from '@/theme/tokens';
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
  const { colors } = useNjamTheme();
  const insets = useSafeAreaInsets();

  const renderTab = (tab: Tab) => {
    const isActive = tab.key === active;
    return (
      <Pressable
        key={tab.key}
        onPress={() => onSelect(tab.key)}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive }}
        style={[styles.tab, isActive && { backgroundColor: colors.accent }]}>
        <Icon name={tab.icon} selected={isActive} color={isActive ? colors.onAccent : colors.ink} />
      </Pressable>
    );
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        floating && { ...styles.floating, bottom: layout.tabBarInset + insets.bottom },
        { backgroundColor: colors.surfaceRaised, borderColor: colors.line },
      ]}>
      {TABS.map(renderTab)}
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
    borderWidth: border.hairline,
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
