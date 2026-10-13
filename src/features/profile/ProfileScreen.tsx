/**
 * Profile: who you are, the rules your scans are checked against, and the
 * way out (Log out).
 *
 * The rules are grouped by kind (allergies, ingredients, E-numbers), so the
 * screen answers "what can I not eat?" at a glance. "Edit your rules" opens
 * the onboarding steps again, filled in with what is saved.
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Avatar, Button, ListGroup, ListRow, SectionHeader, Snackbar } from '@/components/design-system';
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

/** The groups the rules are shown in, in this order. Any other type falls into "Other rules". */
const RULE_GROUPS: { title: string; types: string[] }[] = [
  { title: 'Allergies', types: ['allergen'] },
  { title: 'Ingredients you avoid', types: ['ingredient'] },
  { title: 'E-numbers you avoid', types: ['e_number'] },
];
const GROUPED_TYPES = RULE_GROUPS.flatMap((group) => group.types);

/** One rule as a row title and supporting line. */
function describeRule(rule: ProfileRule): { title: string; supporting: string } {
  if (rule.type === 'allergen') {
    const word = allergenWord(rule.target);
    return {
      title: word.charAt(0).toUpperCase() + word.slice(1),
      supporting: rule.severity ? `Allergy, marked ${rule.severity}` : 'Allergy you avoid',
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

/** The non-empty groups, each with its rules. */
function groupRules(rules: ProfileRule[]): { title: string; rules: ProfileRule[] }[] {
  const groups = RULE_GROUPS.map((group) => ({
    title: group.title,
    rules: rules.filter((rule) => group.types.includes(rule.type)),
  }));
  groups.push({ title: 'Other rules', rules: rules.filter((rule) => !GROUPED_TYPES.includes(rule.type)) });
  return groups.filter((group) => group.rules.length > 0);
}

/** "Every scan is checked against 4 rules." */
function rulesSummary(count: number): string {
  return `Every scan is checked against ${count} ${count === 1 ? 'rule' : 'rules'}.`;
}

export function ProfileScreen() {
  const { colors } = useNjamTheme();
  const { session, member, signOut } = useAuth();
  const [profile, setProfile] = useState<ActiveProfile | null>(null);
  const [failed, setFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Read again each time the tab comes into view, so rules changed on the
  // edit-rules screen show as soon as you come back.
  const householdId = member?.householdId;
  const load = useCallback(() => {
    if (!householdId) return;
    fetchActiveProfile(householdId)
      .then(setProfile)
      .catch(() => setFailed(true));
  }, [householdId]);

  useFocusEffect(load);

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
        <View style={styles.identity}>
          <Avatar name={member?.displayName} size="lg" tone="strong" />
          <SectionHeader
            headline={member?.displayName ?? 'Your profile'}
            deck={[member ? ROLE_LABELS[member.role] : null, session?.user.email].filter(Boolean).join(', ')}
          />
        </View>
      </AskNjamHeader>

      <Button label="Edit your rules" icon="edit" onPress={() => router.push('/edit-rules')} fullWidth />

      <View style={styles.block}>
        <SectionHeader variant="simple" headline="Your rules" />
        {profile && profile.rules.length === 0 && (
          <Text style={[typography.body, { color: colors.inkMuted }]}>
            You have no rules yet, so every scan comes back as Caution.
          </Text>
        )}
        {profile && profile.rules.length > 0 && (
          <Text style={[typography.body, { color: colors.inkMuted }]}>{rulesSummary(profile.rules.length)}</Text>
        )}
        {profile &&
          groupRules(profile.rules).map((group) => (
            <View key={group.title} style={styles.group}>
              <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
                {group.title}
              </Text>
              <ListGroup>
                {group.rules.map((rule) => {
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
            </View>
          ))}
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
  identity: {
    gap: space.s3,
  },
  block: {
    gap: space.s3,
  },
  group: {
    gap: space.s2,
  },
});
