/**
 * Auth: log in or sign up.
 *
 * One screen with a segmented control rather than two screens, because the
 * fields are almost the same and a person who picked the wrong one can
 * switch without losing what they typed.
 *
 * Field errors say what to do, not what went wrong ("Enter the email you
 * signed up with", never "Invalid email"). Anything the server refuses is
 * shown in a failure Snackbar.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  NjamMark,
  SectionHeader,
  SegmentedControl,
  Snackbar,
  TextField,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { icon, space } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Mode = 'login' | 'signup';

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
  const { colors } = useNjamTheme();
  const { signIn, signUp } = useAuth();

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

  return (
    <Screen>
      <View style={styles.mark}>
        <NjamMark size={icon.sizeXl} color={colors.brandForest} />
      </View>

      <SectionHeader
        headline={isLogin ? 'Log in to Njam' : 'Create your account'}
        deck={
          isLogin
            ? 'Your rules and your household are saved to your account.'
            : 'You set your food rules once. Every scan is checked against them.'
        }
      />

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
          <TextField
            label="Your name"
            value={name}
            onChangeText={setName}
            leadingIcon="person"
            autoCapitalize="words"
            placeholder="Anika"
            error={errors.name}
          />
        )}
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
      </View>

      <Button
        label={isLogin ? 'Log in' : 'Create my account'}
        loadingLabel={isLogin ? 'Logging you in' : 'Creating your account'}
        loading={busy}
        onPress={submit}
        size="large"
        fullWidth
      />

      {notice && (
        <Snackbar
          kind={notice.kind}
          message={notice.message}
          actionLabel={notice.kind === 'failure' ? 'Retry' : undefined}
          onAction={notice.kind === 'failure' ? submit : undefined}
          onDismiss={() => setNotice(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: {
    paddingTop: space.s6,
  },
  fields: {
    gap: space.s4,
  },
});
