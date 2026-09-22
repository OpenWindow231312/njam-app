/**
 * The single Supabase client for the app.
 *
 * Everything that talks to the backend imports this. Do not call createClient
 * anywhere else: a second client means a second auth session, and the two will
 * disagree about who is signed in.
 */

// Supabase's JS client expects a browser-shaped URL implementation.
// React Native's is incomplete, so this polyfill has to load first.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Fail loudly at startup rather than with a confusing network error later.
if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase environment variables are missing. Copy .env.example to .env, ' +
      'fill in both values, then restart Expo with: npx expo start --clear',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Keep the session on the device so a person is not signed out every launch.
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // This is only meaningful on the web, where Supabase reads the token out of
    // the URL after an email link. In a native app there is no such URL.
    detectSessionInUrl: false,
  },
});
