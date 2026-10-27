/**
 * The rules of someone without a phone (a child, a parent you shop for),
 * opened from their sheet on the Household tab. The same Rules tab you use
 * for your own rules, pointed at their profile.
 */
import { router, useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/design-system';
import { RulesTab } from '@/features/profile/RulesTab';

export default function PersonRules() {
  const { profileId, name } = useLocalSearchParams<{ profileId: string; name: string }>();

  return (
    <Screen topBar={{ onBack: () => router.back(), title: `${name}'s rules` }}>
      <SectionHeader headline={`${name}'s rules`} deck="Every scan you run for them is checked against these." />
      <RulesTab profileId={profileId} />
    </Screen>
  );
}
