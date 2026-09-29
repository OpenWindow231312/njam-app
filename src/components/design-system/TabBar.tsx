/**
 * TabBar: the floating pill navigation at the bottom of the main screens.
 *
 * Four tabs plus a Scan button in the centre. The active tab's icon sits in
 * a lime circle and takes its filled weight; Scan is always a larger forest
 * circle, because scanning is the action the whole app exists for.
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

export type TabKey = 'home' | 'search' | 'history' | 'profile';

type Tab = { key: TabKey; icon: string; label: string };

// Left pair, then Scan, then right pair.
const LEFT_TABS: Tab[] = [
  { key: 'home', icon: 'home', label: 'Home' },
  { key: 'search', icon: 'search', label: 'Search' },
];
const RIGHT_TABS: Tab[] = [
  { key: 'history', icon: 'history', label: 'History' },
  { key: 'profile', icon: 'person', label: 'Profile' },
];

type TabBarProps = {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  onScan: () => void;
};

export function TabBar({ active, onSelect, onScan }: TabBarProps) {
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
        {
          bottom: layout.tabBarInset + insets.bottom,
          backgroundColor: colors.surfaceRaised,
          borderColor: colors.line,
        },
      ]}>
      {LEFT_TABS.map(renderTab)}
      <Pressable
        onPress={onScan}
        accessibilityRole="button"
        accessibilityLabel="Scan a barcode"
        style={[styles.scan, { backgroundColor: colors.selected }]}>
        <Icon name="barcode_scanner" color={colors.onSelected} />
      </Pressable>
      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: layout.screenGutter,
    right: layout.screenGutter,
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
  scan: {
    width: layout.tabScanSize,
    height: layout.tabScanSize,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
