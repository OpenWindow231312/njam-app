/**
 * Rules tab on Profile: the rules every scan is checked against, as chips.
 *
 * Tap a chip to change it in a sheet (an allergy's level, or remove it).
 * "Add a rule" opens the same sheet on its search. Each change is saved as
 * soon as you confirm it, with saveMyRules, the same save onboarding uses,
 * which writes the new rows before it removes the old ones (see my-rules.ts).
 *
 * Below the chips, "Diets and limits": your diets and faiths and your
 * nutrient limits, set in onboarding. On your own profile, tapping either
 * opens the onboarding steps again (edit-rules) to change them.
 *
 * Pass `profileId` to edit someone else's rules instead of your own: someone
 * without a phone, from the Household tab (app/person-rules.tsx).
 */
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListRow, LoadingMark, RuleChip, Snackbar } from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { loadMyRules, loadRules, saveMyRules, type MyRules } from '@/features/onboarding/my-rules';
import { DIET_PRESETS, NUTRIENT_OPTIONS } from '@/features/onboarding/rule-options';
import { CardBlock, SettingsCard } from '@/features/profile/SettingsCard';
import { RuleSheet, type RuleSheetView } from '@/features/profile/RuleSheet';
import { capitalise, ruleCount } from '@/features/profile/rule-edits';
import { allergenWord } from '@/services/verdict';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Message = { kind: 'neutral' | 'failure'; text: string };

/** "Every scan is checked against these 4 rules." */
function rulesCaption(count: number): string {
  if (count === 0) return 'You have no rules yet, so every scan comes back as Caution.';
  return `Every scan is checked against ${count === 1 ? 'this rule' : `these ${count} rules`}. Tap one to change it.`;
}

/** "Halaal, vegan" or what can be set. */
function dietsLine(rules: MyRules): string {
  const chosen = DIET_PRESETS.filter((diet) => diet.key in rules.diets).map((diet) => diet.label);
  return chosen.length > 0 ? chosen.join(', ') : 'None. Vegetarian, vegan, halaal or kosher.';
}

/** "Sugar max 5 g, Sodium max 120 mg", per 100 g. */
function limitsLine(rules: MyRules): string {
  const set = NUTRIENT_OPTIONS.filter((option) => rules.limits[option.target] !== undefined).map(
    (option) => `${option.label} max ${rules.limits[option.target]} ${option.unit}`,
  );
  return set.length > 0 ? `${set.join(', ')}, per 100 g` : 'None set';
}

export function RulesTab({ profileId }: { profileId?: string }) {
  const { colors } = useNjamTheme();
  const { member } = useAuth();
  const [rules, setRules] = useState<MyRules | null>(null);
  const [sheet, setSheet] = useState<RuleSheetView | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  // Read again each time Profile comes into view, so a change made on
  // another phone in the household shows up.
  const load = useCallback(() => {
    if (!member?.householdId) return;
    const loading = profileId ? loadRules(profileId) : loadMyRules(member.id, member.householdId, member.displayName);
    loading
      .then(setRules)
      .catch(() => setMessage({ kind: 'failure', text: 'We could not load these rules. Check your connection.' }));
  }, [member, profileId]);
  useFocusEffect(load);

  async function save(next: MyRules, done: string) {
    setSaving(true);
    try {
      setRules(await saveMyRules(next));
      setSheet(null);
      setMessage({ kind: 'neutral', text: done });
    } catch {
      // The old rules are still in place (the save writes before it deletes).
      // The sheet closes so the message is not hidden behind it.
      setSheet(null);
      setMessage({ kind: 'failure', text: 'We could not save that change. Check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  }

  if (!rules) {
    return (
      <View style={styles.loading}>
        <LoadingMark size={icon.sizeMd} color={colors.brandForest} />
        <Text style={[typography.body, { color: colors.inkMuted }]}>Loading the rules</Text>
        {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
      </View>
    );
  }

  return (
    <View style={styles.tab}>
      <SettingsCard title="Your rules" caption={rulesCaption(ruleCount(rules))} icon="rule">
        <CardBlock>
          <View style={styles.chips}>
            {Object.entries(rules.allergies).map(([slug, severity]) => (
              <RuleChip
                key={slug}
                label={capitalise(allergenWord(slug))}
                selected
                severity={severity ?? 'avoid'}
                onToggle={() => setSheet({ mode: 'edit', rule: { type: 'allergen', slug }, isNew: false })}
              />
            ))}
            {rules.ingredients.map((value) => (
              <RuleChip
                key={value}
                label={capitalise(value)}
                selected
                onToggle={() => setSheet({ mode: 'edit', rule: { type: 'ingredient', value }, isNew: false })}
              />
            ))}
            {rules.eNumbers.map((value) => (
              <RuleChip
                key={value}
                label={value}
                selected
                onToggle={() => setSheet({ mode: 'edit', rule: { type: 'e_number', value }, isNew: false })}
              />
            ))}
            <RuleChip label="Add a rule" selected={false} onToggle={() => setSheet({ mode: 'add' })} />
          </View>
        </CardBlock>
      </SettingsCard>

      <SettingsCard title="Diets and limits" icon="nutrition">
        <ListRow
          title="Diet and faith"
          supporting={dietsLine(rules)}
          trailing={profileId ? 'none' : 'chevron'}
          onPress={profileId ? undefined : () => router.push('/edit-rules')}
        />
        <ListRow
          title="Nutrient limits"
          supporting={limitsLine(rules)}
          trailing={profileId ? 'none' : 'chevron'}
          onPress={profileId ? undefined : () => router.push('/edit-rules')}
        />
        <ListRow
          title={'"May contain" warnings'}
          supporting="A label that says it may contain something you avoid comes back as Caution."
          value="Caution"
          trailing="none"
        />
      </SettingsCard>

      <RuleSheet view={sheet} rules={rules} saving={saving} onSave={save} onClose={() => setSheet(null)} />

      {message && <Snackbar kind={message.kind} message={message.text} onDismiss={() => setMessage(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    gap: space.s6,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s3,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
});
