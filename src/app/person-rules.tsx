/**
 * The rules of someone without a phone (a child, a parent you shop for),
 * opened from their sheet on the Household tab. The same Rules tab you use
 * for your own rules, pointed at their profile.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { IconButton, SectionHeader } from '@/components/design-system';
import { RulesTab } from '@/features/profile/RulesTab';

export default function PersonRules() {
  const { profileId, name } = useLocalSearchParams<{ profileId: string; name: string }>();

  return (
    <Screen>
      <View style={styles.back}>
        <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={() => router.back()} />
      </View>
      <SectionHeader headline={`${name}'s rules`} deck="Every scan you run for them is checked against these." />
      <RulesTab profileId={profileId} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: {
    alignSelf: 'flex-start',
  },
});
