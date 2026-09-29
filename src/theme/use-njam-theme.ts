/**
 * The one hook every component uses to get its colours.
 *
 * It reads the phone's light/dark setting and returns the matching Paper or
 * Forest token set, so a component never decides for itself which theme it is
 * in. `action` and `onAction` flip automatically between themes this way.
 *
 * It uses the project's useColorScheme hook rather than React Native's
 * directly, because on the web the React Native one reports light until the
 * page has hydrated.
 */
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getColors, getShadows, type ThemeName } from '@/theme/tokens';

export function useNjamTheme() {
  const systemScheme = useColorScheme();
  // React Native can report 'unspecified'. Paper is the default theme.
  const scheme: ThemeName = systemScheme === 'dark' ? 'dark' : 'light';

  return {
    scheme,
    colors: getColors(scheme),
    shadows: getShadows(scheme),
  };
}
