/**
 * Auth: log in or sign up.
 *
 * One screen with a segmented control rather than two screens, because the
 * fields are almost the same and a person who picked the wrong one can
 * switch without losing what they typed.
 *
 * Layout, from the "🔵 Log in" and "🔵 Sign up" frames in Figma: a forest
 * page with one large lime Njam mark, and a paper sheet rising from the
 * bottom that holds the form. This is the one screen that is not on the
 * surface ground: it is the brand's front door, like the splash.
 *
 * Field errors say what to do, not what went wrong ("Enter the email you
 * signed up with", never "Invalid email"). Anything the server refuses is
 * shown in a failure Snackbar.
 */
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  NjamMark,
  SectionHeader,
  SegmentedControl,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { layout, motion, radius, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Mode = 'login' | 'signup';

/**
 * Where the big mark sits behind the sheet, copied from the Figma frames.
 * The frames are drawn on a phone 390 wide, so these are in those units and
 * get scaled to the real screen width: the mark lands in the same place on
 * every phone. Geometry of one decorative shape, not layout spacing.
 */
const FIGMA_FRAME_WIDTH = 390;
const MARK_SIZE = 614;
const MARK_POSITION: Record<Mode, { left: number; top: number }> = {
  login: { left: -180, top: 13 },
  signup: { left: -158, top: -41 },
};

/**
 * Switching between Log in and Sign up animates like Figma's smart animate:
 * the sheet grows or shrinks, the fields glide to their new places and the
 * mark glides behind. Same duration (motion.sheet) and the same curve as the
 * SegmentedControl's sliding highlight, so everything moves as one.
 */
const EASE = Easing.bezier(0.2, 0, 0, 1);
const glide = LinearTransition.duration(motion.sheet).easing(EASE).reduceMotion(ReduceMotion.System);
const fadeIn = FadeIn.duration(motion.stateChange).reduceMotion(ReduceMotion.System);
const fadeOut = FadeOut.duration(motion.stateChange).reduceMotion(ReduceMotion.System);

/** Supabase's minimum, unless the project raises it. */
const MIN_PASSWORD_LENGTH = 6;

type FieldErrors = { name?: string; email?: string; password?: string };

function checkFields(mode: Mode, name: string, email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === 'signup' && name.trim().length === 0) {
    errors.name = 'Enter the name your household will see.';
  }
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
    errors.email = mode === 'login' ? 'Enter the email you signed up with.' : 'Enter an email address.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return errors;
}

/** Turns Supabase's message into one sentence a person can act on. */
function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  // Supabase Auth errors also carry a code, which is steadier than the wording.
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code === 'email_address_invalid') {
    return 'That email address was not accepted. Use an address you can open on this phone.';
  }
  // Supabase's built-in email sender only sends a few emails an hour.
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return 'Too many sign-ups in a short time. Try again in an hour.';
  }
  if (message.includes('Invalid login credentials')) {
    return 'That email and password do not match an account. Check both and try again.';
  }
  if (message.includes('already registered')) {
    return 'There is already an account with that email. Log in instead.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Open the link we emailed you, then log in.';
  }
  if (message.includes('Network request failed')) {
    return 'You are offline. Connect to the internet and try again.';
  }
  return 'We could not reach Njam. Try again in a moment.';
}

export function AuthScreen() {
  const { colors, shadows } = useNjamTheme();
  const { signIn, signUp } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'neutral' | 'failure'; message: string } | null>(null);

  async function submit() {
    const fieldErrors = checkFields(mode, name, email, password);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setBusy(true);
    setNotice(null);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else {
        const result = await signUp(name, email, password);
        if (result === 'check-email') {
          setNotice({ kind: 'neutral', message: 'Check your email and open the link to finish signing up.' });
          setMode('login');
        }
      }
      // On success the root layout sees the new session and shows the tabs.
    } catch (error) {
      setNotice({ kind: 'failure', message: explain(error) });
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === 'login';

  // The mark's position is animated: when the mode changes, it glides from
  // the old frame's position to the new one. With reduce motion on, it jumps.
  const reduceMotion = useReducedMotion();
  const markLeft = useSharedValue(MARK_POSITION[mode].left);
  const markTop = useSharedValue(MARK_POSITION[mode].top);

  useEffect(() => {
    const target = MARK_POSITION[mode];
    const timing = { duration: motion.sheet, easing: EASE };
    markLeft.value = reduceMotion ? target.left : withTiming(target.left, timing);
    markTop.value = reduceMotion ? target.top : withTiming(target.top, timing);
  }, [mode, reduceMotion, markLeft, markTop]);

  // Scale the Figma placement to this phone's width.
  const scale = screenWidth / FIGMA_FRAME_WIDTH;
  const markStyle = useAnimatedStyle(() => ({
    left: markLeft.value * scale,
    top: markTop.value * scale,
  }));

  return (
    <View style={[styles.page, { backgroundColor: colors.brandForest }]}>
      {/* Light status bar icons, because the top of this screen is forest. */}
      <StatusBar style="light" />

      <Animated.View pointerEvents="none" style={[styles.mark, markStyle]}>
        <NjamMark size={MARK_SIZE * scale} color={colors.brandLime} />
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* The scroll view only matters on short phones or with the keyboard
            open. flexGrow plus flex-end keeps the sheet on the bottom edge. */}
        <ScrollView
          keyboardShouldPersistTaps="handled"
          bounces={false}
          contentContainerStyle={styles.scrollContent}>
          <Animated.View
            layout={glide}
            style={[
              styles.sheet,
              shadows.sheet,
              { backgroundColor: colors.brandPaper, paddingBottom: space.s8 + insets.bottom },
            ]}>
            <View style={styles.column}>
              <View style={styles.form}>
                {/* Keyed by mode, so the new headline fades in instead of snapping. */}
                <Animated.View key={mode} entering={fadeIn}>
                  <SectionHeader headline={isLogin ? 'Log in to Njam' : 'Create your account'} />
                </Animated.View>

                <SegmentedControl<Mode>
                  segments={[
                    { value: 'login', label: 'Log in' },
                    { value: 'signup', label: 'Sign up' },
                  ]}
                  value={mode}
                  onChange={(next) => {
                    setMode(next);
                    setErrors({});
                    setNotice(null);
                  }}
                />

                <View style={styles.fields}>
                  {!isLogin && (
                    <Animated.View entering={fadeIn} exiting={fadeOut}>
                      <TextField
                        label="Your name"
                        value={name}
                        onChangeText={setName}
                        leadingIcon="person"
                        autoCapitalize="words"
                        placeholder="Your name"
                        error={errors.name}
                      />
                    </Animated.View>
                  )}
                  <Animated.View layout={glide}>
                    <TextField
                      label="Email"
                      value={email}
                      onChangeText={setEmail}
                      leadingIcon="mail"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholder="you@example.com"
                      error={errors.email}
                    />
                  </Animated.View>
                  <Animated.View layout={glide}>
                    <TextField
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      leadingIcon="lock"
                      secureTextEntry
                      autoCapitalize="none"
                      helper={isLogin ? undefined : `At least ${MIN_PASSWORD_LENGTH} characters.`}
                      error={errors.password}
                    />
                  </Animated.View>
                </View>
              </View>

              <Animated.View layout={glide}>
                <Button
                  label={isLogin ? 'Log in' : 'Create account'}
                  loadingLabel={isLogin ? 'Logging you in' : 'Creating your account'}
                  loading={busy}
                  onPress={submit}
                  size="large"
                  fullWidth
                />
              </Animated.View>

              {notice && (
                <Snackbar
                  kind={notice.kind}
                  message={notice.message}
                  actionLabel={notice.kind === 'failure' ? 'Retry' : undefined}
                  onAction={notice.kind === 'failure' ? submit : undefined}
                  onDismiss={() => setNotice(null)}
                />
              )}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  mark: {
    position: 'absolute',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  // The paper sheet: xl corners on top only, like every sheet (rule 5).
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: space.s12,
    paddingHorizontal: layout.screenGutter,
  },
  // Caps the form on tablets; the sheet itself stays full width.
  column: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    gap: space.s10,
  },
  form: {
    gap: space.s6,
  },
  fields: {
    gap: space.s4,
  },
});
