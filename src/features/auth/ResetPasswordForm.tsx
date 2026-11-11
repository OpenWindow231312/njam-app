/**
 * Forgot password: the two steps, shown inside the Auth screen's paper sheet.
 *
 *   1. email - the person types the email they signed up with, and we send it
 *              a code.
 *   2. code  - they type the code from the email and a new password. A right
 *              code signs them in with the new password, and the root layout
 *              moves them into the app.
 *
 * A code rather than a link, because a link has to open the app and in Expo
 * Go the app's address changes with the network (see AuthProvider).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, SectionHeader, Snackbar, TextField } from '@/components/design-system';
import { MIN_PASSWORD_LENGTH, useAuth } from '@/features/auth/AuthProvider';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Step = 'email' | 'code';

type FieldErrors = { email?: string; code?: string; password?: string };

/** Supabase's email codes are 6 digits unless the project sets more (up to 10). */
const CODE_PATTERN = /^\d{6,10}$/;

/** Turns Supabase's message into one sentence a person can act on. */
function explain(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  // Supabase uses the same code for a wrong code and an old one.
  if (code === 'otp_expired') {
    return 'That code is wrong or has expired. Check it, or send a new one.';
  }
  if (code === 'same_password') {
    return 'That is the password you have now. Choose a new one, then send a new code.';
  }
  if (code === 'weak_password') {
    return 'That password is too easy to guess. Choose a longer one, then send a new code.';
  }
  // Supabase lets one email ask for a code once a minute, and its built-in
  // sender only sends a few emails an hour.
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return message.includes('seconds')
      ? 'Wait a minute before you ask for another code.'
      : 'Too many emails in a short time. Try again in an hour.';
  }
  if (message.includes('Network request failed')) {
    return 'You are offline. Connect to the internet and try again.';
  }
  return 'We could not reach Njam. Try again in a moment.';
}

type Props = {
  /** Whatever was already typed in the log in form, so it need not be typed again. */
  initialEmail: string;
  onBack: () => void;
};

export function ResetPasswordForm({ initialEmail, onBack }: Props) {
  const { colors } = useNjamTheme();
  const { sendPasswordReset, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'neutral' | 'failure'; message: string } | null>(null);

  async function sendCode() {
    // The same check as the log in form.
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrors({ email: 'Enter the email you signed up with.' });
      return;
    }
    setErrors({});
    setBusy(true);
    setNotice(null);
    try {
      await sendPasswordReset(email);
      setCode('');
      setStep('code');
    } catch (error) {
      setNotice({ kind: 'failure', message: explain(error) });
    } finally {
      setBusy(false);
    }
  }

  async function setNewPassword() {
    const fieldErrors: FieldErrors = {};
    if (!CODE_PATTERN.test(code.trim())) {
      fieldErrors.code = 'Enter the code from the email, numbers only.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      fieldErrors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setBusy(true);
    setNotice(null);
    try {
      await resetPassword(email, code, password);
      // On success the root layout sees the session and shows the app.
    } catch (error) {
      setNotice({ kind: 'failure', message: explain(error) });
    } finally {
      setBusy(false);
    }
  }

  const isEmailStep = step === 'email';

  return (
    <>
      <View style={styles.form}>
        <View style={styles.heading}>
          <SectionHeader headline={isEmailStep ? 'Forgot your password?' : 'Check your email'} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>
            {isEmailStep
              ? 'Enter the email you signed up with. If it has an account, we will send it a code.'
              : `We sent a code to ${email.trim()}. Enter it here with your new password.`}
          </Text>
        </View>

        <View style={styles.fields}>
          {isEmailStep ? (
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
          ) : (
            <>
              <TextField
                label="Code from the email"
                value={code}
                onChangeText={setCode}
                leadingIcon="mail"
                keyboardType="number-pad"
                placeholder="123456"
                error={errors.code}
              />
              <TextField
                label="New password"
                value={password}
                onChangeText={setPassword}
                leadingIcon="lock"
                secureTextEntry
                autoCapitalize="none"
                helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
                error={errors.password}
              />
            </>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          label={isEmailStep ? 'Send a reset code' : 'Set new password'}
          loadingLabel={isEmailStep ? 'Sending your code' : 'Saving your new password'}
          loading={busy}
          onPress={isEmailStep ? sendCode : setNewPassword}
          size="large"
          fullWidth
        />
        {!isEmailStep && (
          <Button label="Send a new code" variant="text" onPress={sendCode} disabled={busy} fullWidth />
        )}
        <Button label="Back to log in" variant="text" onPress={onBack} disabled={busy} fullWidth />
      </View>

      {notice && (
        <Snackbar kind={notice.kind} message={notice.message} onDismiss={() => setNotice(null)} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: space.s6,
  },
  heading: {
    gap: space.s2,
  },
  fields: {
    gap: space.s4,
  },
  actions: {
    gap: space.s2,
  },
});
