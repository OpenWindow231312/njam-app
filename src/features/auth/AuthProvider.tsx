/**
 * AuthProvider: who is signed in, for the whole app.
 *
 * It holds two things:
 *   session - Supabase's sign-in session, or null when signed out.
 *   member  - that person's row in public.users (name, role, household).
 *
 * The root layout reads `session` to decide whether to show the Auth screen
 * or the tabs, and `onboarded` to decide whether to show onboarding first.
 * Screens read `member` for the person's name, role and household. Nothing
 * else in the app talks to supabase.auth directly.
 */
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

export type Role = 'owner' | 'standard' | 'admin';

export type Member = {
  id: string;
  displayName: string;
  role: Role;
  householdId: string | null;
};

type SignUpResult = 'signed-in' | 'check-email';

/** Supabase's minimum, unless the project raises it. Used by every password field. */
export const MIN_PASSWORD_LENGTH = 6;

type AuthContextValue = {
  session: Session | null;
  member: Member | null;
  /** True once this person has set their rules in onboarding. */
  onboarded: boolean;
  /** True until the saved session has been read from the phone. */
  loading: boolean;
  /**
   * True while a forgotten password is being reset. Checking the emailed code
   * signs the person in before the new password is saved, so the root layout
   * keeps the Auth screen up until both are done (see resetPassword).
   */
  resettingPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  /** Emails a reset code to this address, if it has an account. */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Checks the emailed code, then sets the new password. Signs the person in. */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
  /** Marks onboarding as done, so the app opens on the tabs from now on. */
  finishOnboarding: () => Promise<void>;
  /** Reads your row again, after something on the server changed your household or role. */
  reloadMember: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * A random id for a new household, made on the phone.
 *
 * The household has to exist before the person's own row can point at it,
 * but RLS only lets you read a household once you belong to it. So the id
 * is chosen here, rather than read back from the insert. It only needs to
 * be unique, not secret.
 */
function newId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** Reads the signed-in person's row. Null if it does not exist yet. */
async function fetchMember(userId: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, role, household_id')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    role: data.role,
    householdId: data.household_id,
  };
}

/**
 * First sign-in after sign-up: give the person a household, their own row
 * (as the household owner) and an empty default diet profile, so the
 * scanner has something to check against.
 */
async function createMember(userId: string, displayName: string): Promise<Member> {
  const householdId = newId();

  const household = await supabase
    .from('households')
    .insert({ id: householdId, name: `${displayName}'s household` });
  if (household.error) throw household.error;

  const user = await supabase
    .from('users')
    .insert({ id: userId, household_id: householdId, display_name: displayName, role: 'owner' });
  if (user.error) throw user.error;

  const profile = await supabase
    .from('diet_profiles')
    .insert({ household_id: householdId, user_id: userId, name: displayName, is_default: true });
  if (profile.error) throw profile.error;

  return { id: userId, displayName, role: 'owner', householdId };
}

/** The member row for this session, creating it on the very first sign-in. */
async function loadMember(session: Session): Promise<Member> {
  const existing = await fetchMember(session.user.id);
  if (existing) return existing;

  // The name typed at sign-up travels in the auth user's metadata.
  const name = session.user.user_metadata?.display_name ?? session.user.email ?? 'You';
  return createMember(session.user.id, name);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);

  useEffect(() => {
    // Supabase reports the saved session first (INITIAL_SESSION), then every
    // sign-in, sign-out and token refresh after that.
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      // A token refresh is the same person; their row has not changed. A user
      // update (finishOnboarding) only changes the session's metadata.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;
      if (!nextSession) {
        setMember(null);
        setLoading(false);
        return;
      }
      // Supabase warns against awaiting its own calls inside this callback,
      // so the database read is started on the next tick instead.
      setTimeout(() => {
        loadMember(nextSession)
          .then(setMember)
          .catch((error) => console.warn('Could not load your account', error))
          .finally(() => setLoading(false));
      }, 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
  }

  async function signUp(name: string, email: string, password: string): Promise<SignUpResult> {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) throw error;
    // With email confirmation switched on, Supabase returns no session until
    // the link in the email is opened.
    return data.session ? 'signed-in' : 'check-email';
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  // Forgot password works with a code typed into the app, not a link in the
  // email. A link has to open the app, and in Expo Go the app's address
  // changes with the laptop's network (exp://192.168.x.x:8081), so a link
  // saved in Supabase would break. A code works the same on every phone.
  // The "Reset password" email template in Supabase must include
  // {{ .Token }} for the code to appear in the email.
  async function sendPasswordReset(email: string) {
    // Supabase answers the same whether or not the email has an account, so
    // this cannot be used to find out who has signed up.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  }

  async function resetPassword(email: string, code: string, newPassword: string) {
    setResettingPassword(true);
    try {
      // A correct code signs the person in, the same as a password would.
      const verified = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery',
      });
      if (verified.error) throw verified.error;

      const updated = await supabase.auth.updateUser({ password: newPassword });
      if (updated.error) {
        // The code is used up but the password did not change. Sign out
        // again, so nobody is left signed in without knowing their password.
        await supabase.auth.signOut();
        throw updated.error;
      }
    } finally {
      setResettingPassword(false);
    }
  }

  async function finishOnboarding() {
    // Kept in the auth user's metadata rather than a new column, so no
    // migration is needed. It only decides which screen opens first; it
    // grants nothing, so it does not matter that a person can change it.
    const { error } = await supabase.auth.updateUser({ data: { onboarded: true } });
    if (error) throw error;
  }

  // Joining, leaving or handing over a household happens in the database
  // (see household.ts), so the app has to read the row again to see it.
  async function reloadMember() {
    if (!session) return;
    const fresh = await fetchMember(session.user.id);
    if (fresh) setMember(fresh);
  }

  // A person can finish onboarding with no rules at all (no allergies, nothing
  // avoided), so "has rules" cannot stand in for "has been through onboarding".
  const onboarded = session?.user.user_metadata?.onboarded === true;

  return (
    <AuthContext.Provider
      value={{
        session,
        member,
        onboarded,
        loading,
        resettingPassword,
        signIn,
        signUp,
        signOut,
        sendPasswordReset,
        resetPassword,
        finishOnboarding,
        reloadMember,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
