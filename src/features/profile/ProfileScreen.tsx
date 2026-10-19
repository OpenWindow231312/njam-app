/**
 * Profile: who you are, then three tabs (as designed in Figma, 18 Oct 2026):
 *
 *   Rules     - the rules every scan is checked against (RulesTab).
 *   Household - who you shop for and what they may change (HouseholdTab).
 *   Settings  - scanning, notifications, privacy, your account (SettingsTab).
 *
 * The tabs are a SegmentedControl, not separate screens, so switching is
 * instant and the bottom TabBar stays on Profile. Each tab reads its own
 * data when it is shown.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { Avatar, SegmentedControl } from '@/components/design-system';
import { useAuth, type Role } from '@/features/auth/AuthProvider';
import { HouseholdTab } from '@/features/household/HouseholdTab';
import { RulesTab } from '@/features/profile/RulesTab';
import { SettingsTab } from '@/features/profile/SettingsTab';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Tab = 'rules' | 'household' | 'settings';

const TABS: { value: Tab; label: string }[] = [
  { value: 'rules', label: 'Rules' },
  { value: 'household', label: 'Household' },
  { value: 'settings', label: 'Settings' },
];

const ROLE_LABELS: Record<Role, string> = {
  owner: 'Household owner',
  standard: 'Household member',
  admin: 'Admin and moderator',
};

export function ProfileScreen() {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  const [tab, setTab] = useState<Tab>('rules');

  return (
    <Screen withTabBar>
      <Text accessibilityRole="header" style={[typography.displayL, { color: colors.ink }]}>
        Profile
      </Text>

      <View style={styles.identity}>
        <Avatar name={member?.displayName} size="lg" tone="strong" />
        <View style={styles.flex}>
          <Text style={[typography.headline, { color: colors.ink }]}>{member?.displayName ?? 'Your profile'}</Text>
          {member && (
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{ROLE_LABELS[member.role]}</Text>
          )}
        </View>
      </View>

      <SegmentedControl segments={TABS} value={tab} onChange={setTab} />

      {tab === 'rules' && <RulesTab />}
      {tab === 'household' && <HouseholdTab />}
      {tab === 'settings' && <SettingsTab />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  flex: {
    flex: 1,
  },
});
