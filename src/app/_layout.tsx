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
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { useNjamTheme } from '@/theme/use-njam-theme';

SplashScreen.preventAutoHideAsync();

/**
 * Decides which half of the app a person can reach.
 *
 * Stack.Protected removes the screens inside it while its guard is false, so
 * a signed-out person cannot reach the tabs even by a deep link, and a
 * signed-in person is moved off the Auth screen as soon as the session lands.
 *
 * Onboarding works the same way. A signed-in person who has not set their
 * rules yet can reach only onboarding, and is moved to the tabs the moment
 * they finish it. Changing rules later uses a separate route, edit-rules.
 */
function RootNavigator() {
  const { session, onboarded, loading } = useAuth();
  const { colors } = useNjamTheme();
  const signedIn = session !== null;

  // Render nothing until we know whether someone is signed in, so the Auth
  // screen never flashes for a person who already is. The splash overlay
  // covers the screen meanwhile.
  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="edit-rules" />
        <Stack.Screen name="verdict" />
        <Stack.Screen name="aisle" />
        <Stack.Screen name="ask" />
        <Stack.Screen name="admin-review" />
        <Stack.Screen name="explore" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
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
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
