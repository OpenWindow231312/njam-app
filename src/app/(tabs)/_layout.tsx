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

import { TabBar, type TabKey } from '@/components/design-system';
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

export default function TabsLayout() {
  const { colors } = useNjamTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.surface } }}
      tabBar={({ state, navigation }) => (
        <TabBar
          active={tabForRoute(state.routes[state.index].name)}
          onSelect={(tab) => navigation.navigate(ROUTE_FOR_TAB[tab])}
        />
      )}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
