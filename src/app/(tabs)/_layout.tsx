/**
 * The five main tabs, drawn by the design system TabBar.
 *
 * Expo Router's Tabs still does the navigating (it keeps each tab's screen
 * alive and remembers where you were). We only swap its default bar for ours
 * through the tabBar prop. The two speak different names for the first tab:
 * the TabBar calls it "home", the route file is index.tsx, so the two small
 * maps below translate between them.
 */
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FrostedStrip, TabBar, type TabKey } from '@/components/design-system';
import { layout } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const ROUTE_FOR_TAB: Record<TabKey, string> = {
  home: 'index',
  search: 'search',
  scan: 'scan',
  history: 'history',
  profile: 'profile',
};

function tabForRoute(routeName: string): TabKey {
  const match = (Object.keys(ROUTE_FOR_TAB) as TabKey[]).find((tab) => ROUTE_FOR_TAB[tab] === routeName);
  return match ?? 'home';
}

/**
 * The TabBar on its frosted strip (v1.9). The strip runs edge to edge from the
 * top of the bar down to the bottom of the screen, and fades in, so
 * content that scrolls under the bar blurs gradually rather than meeting a line.
 */
// What Tabs hands to its tabBar function, read off Tabs' own props so we do
// not need a direct import from React Navigation.
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

function NjamTabBar({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const active = tabForRoute(state.routes[state.index].name);
  // The scanner fills the screen (v1.13); its close button goes back to Home.
  if (active === 'scan') return null;

  // The strip ends level with the top of the bar, so the fade happens behind it.
  const stripHeight = layout.tabBarHeight + layout.tabBarInset + insets.bottom;

  return (
    <>
      <FrostedStrip edge="bottom" height={stripHeight} />
      <TabBar
        active={active}
        onSelect={(tab) => navigation.navigate(ROUTE_FOR_TAB[tab])}
      />
    </>
  );
}

export default function TabsLayout() {
  const { colors } = useNjamTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}
      tabBar={(props) => <NjamTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
