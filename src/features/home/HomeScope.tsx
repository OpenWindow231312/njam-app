/**
 * HomeScope: the two small pills under Home's headline, saying whose rules
 * every verdict on Home is for: "Checking for Anika" and "4 rules".
 *
 * "Checking for" opens Profile, where those rules are listed and changed.
 * White with the ambient shadow like every white control on the pale ground;
 * the rule count sits on a sunken chip, because it is a fact, not a button.
 */
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Icon } from '@/components/design-system';
import { PressableSurface } from '@/components/design-system/PressableSurface';
import { layout, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type HomeScopeProps = {
  /** The profile the verdicts are for. */
  name: string;
  ruleCount: number;
};

export function HomeScope({ name, ruleCount }: HomeScopeProps) {
  const { colors, shadows } = useNjamTheme();
  const rules = `${ruleCount} ${ruleCount === 1 ? 'rule' : 'rules'}`;

  return (
    <View style={styles.row}>
      <PressableSurface
        onPress={() => router.navigate('/profile')}
        accessibilityRole="button"
        accessibilityLabel={`Checking for ${name}, ${rules}`}
        accessibilityHint="Opens your rules on Profile"
        radius={radius.pill}
        style={[styles.pill, { backgroundColor: colors.surfaceRaised }, shadows.ambient]}>
        <Avatar name={name} size="sm" tone="strong" />
        <Text style={[typography.label, { color: colors.ink }]}>Checking for {name}</Text>
      </PressableSurface>
      <View
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[styles.chip, { backgroundColor: colors.surfaceSunken }]}>
        <Icon name="rule" size="xs" color={colors.ink} />
        <Text style={[typography.label, { color: colors.ink }]}>{rules}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  pill: {
    height: layout.scopePillHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
    paddingLeft: space.s1,
    paddingRight: space.s3,
    borderRadius: radius.pill,
  },
  chip: {
    height: layout.chipHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s1,
    paddingHorizontal: layout.chipPaddingStart,
    borderRadius: radius.pill,
  },
});
