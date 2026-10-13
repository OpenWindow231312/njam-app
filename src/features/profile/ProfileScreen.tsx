/**
 * Profile: who you are, the rules your scans are checked against, and the
 * way out (Log out).
 *
 * Read-only for now. Editing rules belongs to the Profile & filters screen
 * and onboarding, which come next.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Button, ListGroup, ListRow, SectionHeader, Snackbar } from '@/components/design-system';
import { AskNjamHeader } from '@/features/ask-njam/AskNjamHeader';
import { useAuth, type Role } from '@/features/auth/AuthProvider';
import { fetchActiveProfile, type ActiveProfile } from '@/features/profile/active-profile';
import { allergenWord, type ProfileRule } from '@/services/verdict';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Household owner',
  standard: 'Standard user',
  admin: 'Admin and moderator',
};

const RULE_ICONS: Record<string, string> = {
  allergen: 'no_food',
  ingredient: 'block',
  e_number: 'science',
  nutrient: 'nutrition',
  diet: 'restaurant',
};

/** One rule as a row title and supporting line. */
function describeRule(rule: ProfileRule): { title: string; supporting: string } {
  if (rule.type === 'allergen') {
    const word = allergenWord(rule.target);
    return {
      title: word.charAt(0).toUpperCase() + word.slice(1),
      supporting: rule.severity ? `Allergy, marked ${rule.severity}` : 'Allergy',
    };
  }
  if (rule.type === 'e_number') return { title: rule.target.toUpperCase(), supporting: 'E-number you avoid' };
  if (rule.type === 'ingredient') return { title: rule.target, supporting: 'Ingredient you avoid' };
  if (rule.threshold !== null) {
    const comparison = rule.operator === 'gte' ? 'at least' : 'at most';
    return { title: rule.target, supporting: `${comparison} ${rule.threshold} ${rule.unit ?? ''}`.trim() };
  }
  return { title: rule.target, supporting: rule.type };
}

export function ProfileScreen() {
  const { colors } = useNjamTheme();
  const { member, signOut } = useAuth();
  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!member?.householdId) return;
    fetchActiveProfile(member.householdId)
      .then(setProfile)
      .catch(() => setFailed(true));
  }, [member?.householdId]);

  async function logOut() {
    setSigningOut(true);
    try {
      await signOut();
      // The root layout sees the session end and shows the Auth screen.
    } catch {
      setSigningOut(false);
      setFailed(true);
    }
  }

  return (
    <Screen withTabBar>
      <AskNjamHeader>
        <SectionHeader
          headline={member?.displayName ?? 'Your profile'}
          deck={member ? ROLE_LABELS[member.role] : undefined}
        />
      </AskNjamHeader>

      <View style={styles.block}>
        <SectionHeader variant="simple" headline="Your rules" />
        {profile && profile.rules.length === 0 && (
          <Text style={[typography.body, { color: colors.inkMuted }]}>
            You have no rules yet, so every scan comes back as Caution.
          </Text>
        )}
        {profile && profile.rules.length > 0 && (
          <ListGroup>
            {profile.rules.map((rule) => {
              const { title, supporting } = describeRule(rule);
              return (
                <ListRow
                  key={`${rule.type}-${rule.target}`}
                  title={title}
                  supporting={supporting}
                  icon={RULE_ICONS[rule.type] ?? 'rule'}
                  iconBadge="soft"
                  trailing="none"
                />
              );
            })}
          </ListGroup>
        )}
      </View>

      {/* Only an admin sees the way in. The database still refuses a
          verification from anyone else (see admin-review/review-queue.ts). */}
      {member?.role === 'admin' && (
        <ListGroup>
          <ListRow
            title="Review queue"
            supporting="Verify products shoppers added or Njam read from a label"
            icon="admin_panel_settings"
            iconBadge="strong"
            trailing="chevron"
            onPress={() => router.push('/admin-review')}
          />
        </ListGroup>
      )}

      <Button
        label="Log out"
        icon="logout"
        variant="outlined"
        loading={signingOut}
        loadingLabel="Logging you out"
        onPress={logOut}
        fullWidth
      />

      {failed && (
        <Snackbar
          kind="failure"
          message="We could not reach Njam. Check your connection."
          onDismiss={() => setFailed(false)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.s3,
  },
});
