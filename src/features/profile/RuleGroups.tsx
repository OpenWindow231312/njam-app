/**
 * RuleGroups: a person's rules as lists, grouped by kind, so they answer
 * "what can I not eat?" at a glance. Used on Profile and on the last screen
 * of onboarding.
 */
import { StyleSheet, Text, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/design-system';
import { allergenWord, type ProfileRule } from '@/services/verdict';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

const RULE_ICONS: Record<string, string> = {
  allergen: 'no_food',
  ingredient: 'block',
  e_number: 'science',
  nutrient: 'nutrition',
  diet: 'restaurant',
};

/** The groups the rules are shown in, in this order. Any other type falls into "Other rules". */
const RULE_GROUPS: { title: string; types: string[] }[] = [
  // A diet like dairy-free is saved as an allergen rule with no severity,
  // so both live in this group.
  { title: 'Allergies and diets', types: ['allergen'] },
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
      supporting: rule.severity ? `Allergy, marked ${rule.severity}` : 'You avoid it',
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

export function RuleGroups({ rules }: { rules: ProfileRule[] }) {
  const { colors } = useNjamTheme();

  return (
    <>
      {groupRules(rules).map((group) => (
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
    </>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: space.s2,
  },
});
