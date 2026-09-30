import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  // Every font the design system names, loaded once here. Keys must match
  // fontFamilies in src/theme/tokens.ts, because that is how components ask for them.
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });
  // Icons are SVG paths now (see Icon.tsx), so the Material Symbols font no
  // longer needs loading here.

  // Render nothing until fonts are ready. The splash screen is still showing,
  // and without this text would briefly flash in the system font.
  if (!fontsLoaded) {
    return null;
  }

  return (
    // Always the light navigation theme while dark mode is paused (see use-njam-theme.ts).
    <ThemeProvider value={DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
