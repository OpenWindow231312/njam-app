/**
 * Onboarding: set the rules every scan is checked against, in three steps.
 *
 *   1. Allergies, with how strict each one is. Required: you either pick
 *      some or say you have none.
 *   2. Ingredients you avoid.
 *   3. E-numbers you avoid.
 *
 * These are the three rule types the verdict engine can check against an
 * ingredient list today. Diets and nutrient limits come later, because a
 * rule the engine cannot check would turn every scan into Caution.
 *
 * The same screen edits your rules later from Profile ("edit" mode). Nothing
 * is saved until the last step, so backing out part way changes nothing.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  IconButton,
  LoadingMark,
  OptionButton,
  RuleChip,
  SectionHeader,
  Snackbar,
  StepProgress,
  TextField,
  type Severity,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { loadMyRules, saveMyRules, type AllergySeverity, type MyRules } from '@/features/onboarding/my-rules';
import { allergenWord } from '@/services/verdict';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Mode = 'first-run' | 'edit';

const TOTAL_STEPS = 3;

/** The eight allergens R146 makes a label declare, as seeded in the allergens table. */
const ALLERGENS = ['milk', 'egg', 'peanut', 'tree-nut', 'soy', 'gluten', 'fish', 'crustacean-mollusc'];

/**
 * Suggestions are ingredients the catalogue already knows by these names,
 * so a rule made from one is sure to match a label. Anything else can be
 * typed in.
 */
const SUGGESTED_INGREDIENTS = ['palm oil', 'sugar', 'caffeine', 'cocoa', 'coconut', 'maize', 'onion', 'garlic'];

const SUGGESTED_E_NUMBERS: { code: string; name: string }[] = [
  { code: 'E621', name: 'MSG' },
  { code: 'E211', name: 'sodium benzoate' },
  { code: 'E202', name: 'potassium sorbate' },
  { code: 'E282', name: 'calcium propionate' },
  { code: 'E150D', name: 'caramel colour' },
  { code: 'E322', name: 'lecithin' },
];

/** E100 to E1521, with an optional letter: E150d, E160a. */
const E_NUMBER_PATTERN = /^E\d{3,4}[A-Z]?$/;

const SEVERITY_CHOICES: { value: AllergySeverity; label: string }[] = [
  { value: null, label: 'Avoid' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The RuleChip's word for a severity. No severity reads as "Avoid". */
function chipSeverity(severity: AllergySeverity): Severity {
  return severity ?? 'avoid';
}

/** Adds the item if it is missing, removes it if it is there. */
function toggled(list: string[], item: string): string[] {
  return list.includes(item) ? list.filter((entry) => entry !== item) : [...list, item];
}

/** The suggestions plus anything typed in, so a typed one shows as a chosen chip. */
function withChosen(suggestions: string[], chosen: string[]): string[] {
  return [...suggestions, ...chosen.filter((item) => !suggestions.includes(item))];
}

export function OnboardingScreen({ mode }: { mode: Mode }) {
  const { colors } = useNjamTheme();
  const { member, finishOnboarding } = useAuth();

  const [rules, setRules] = useState<MyRules | null>(null);
  const [step, setStep] = useState(1);
  const [typedIngredient, setTypedIngredient] = useState('');
  const [typedENumber, setTypedENumber] = useState('');
  const [eNumberError, setENumberError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // A new account's member row is created just after sign-up, so this waits
  // for it. In edit mode your current rules fill the screen.
  useEffect(() => {
    if (!member?.householdId) return;
    loadMyRules(member.id, member.householdId, member.displayName)
      .then(setRules)
      .catch(() => setFailure('We could not load your rules. Check your connection.'));
  }, [member?.id, member?.householdId, member?.displayName, attempt]);

  if (!rules) {
    return (
      <Screen scroll={false}>
        <View style={styles.loading}>
          <LoadingMark size={icon.sizeLg} color={colors.brandForest} />
          <Text style={[typography.body, { color: colors.inkMuted }]}>Loading your rules</Text>
        </View>
        {failure && (
          <Snackbar
            kind="failure"
            message={failure}
            actionLabel="Retry"
            onAction={() => {
              setFailure(null);
              setAttempt((n) => n + 1);
            }}
            onDismiss={() => setFailure(null)}
          />
        )}
      </Screen>
    );
  }

  const chosenAllergens = Object.keys(rules.allergies);

  function toggleAllergen(slug: string) {
    setRules((current) => {
      if (!current) return current;
      const allergies = { ...current.allergies };
      if (slug in allergies) delete allergies[slug];
      // A new allergy starts as severe: the safer guess until you say otherwise.
      else allergies[slug] = 'severe';
      return { ...current, allergies };
    });
  }

  function setSeverity(slug: string, severity: AllergySeverity) {
    setRules((current) => current && { ...current, allergies: { ...current.allergies, [slug]: severity } });
  }

  function toggleIngredient(name: string) {
    setRules((current) => current && { ...current, ingredients: toggled(current.ingredients, name) });
  }

  function toggleENumber(code: string) {
    setRules((current) => current && { ...current, eNumbers: toggled(current.eNumbers, code) });
  }

  function addTypedIngredient() {
    const name = typedIngredient.trim().toLowerCase();
    if (!name) return;
    if (!rules?.ingredients.includes(name)) toggleIngredient(name);
    setTypedIngredient('');
  }

  function addTypedENumber() {
    const code = typedENumber.trim().toUpperCase().replace(/\s|-/g, '');
    if (!E_NUMBER_PATTERN.test(code)) {
      setENumberError('Type an E-number as it is printed, like E621.');
      return;
    }
    if (!rules?.eNumbers.includes(code)) toggleENumber(code);
    setTypedENumber('');
    setENumberError(undefined);
  }

  function goBack() {
    if (step > 1) setStep(step - 1);
    else router.back();
  }

  async function save() {
    if (!rules) return;
    setSaving(true);
    setFailure(null);
    try {
      setRules(await saveMyRules(rules));
      if (mode === 'first-run') {
        // The root layout sees onboarded turn true and opens the tabs.
        await finishOnboarding();
      } else {
        router.back();
      }
    } catch {
      setFailure('We could not save your rules. Check your connection.');
      setSaving(false);
    }
  }

  // The back arrow is hidden on the very first step of first-run, because
  // there is nothing behind it to go back to.
  const showBack = step > 1 || mode === 'edit';

  return (
    <Screen>
      <View style={styles.topBar}>
        {showBack && <IconButton icon="arrow_back" accessibilityLabel="Go back" onPress={goBack} />}
        <StepProgress step={step} total={TOTAL_STEPS} />
      </View>

      {step === 1 && (
        <>
          <SectionHeader
            headline="Do you have any food allergies?"
            deck="Tap each one you react to. A product that contains it comes back Not safe."
            step={1}
            totalSteps={TOTAL_STEPS}
            tag="Allergies"
          />
          <View style={styles.chips}>
            {ALLERGENS.map((slug) => (
              <RuleChip
                key={slug}
                label={capitalise(allergenWord(slug))}
                selected={slug in rules.allergies}
                severity={slug in rules.allergies ? chipSeverity(rules.allergies[slug]) : undefined}
                onToggle={() => toggleAllergen(slug)}
              />
            ))}
          </View>

          {chosenAllergens.length > 0 && (
            <View style={styles.block}>
              <SectionHeader variant="simple" headline="How strict is each one?" />
              <Text style={[typography.body, { color: colors.inkMuted }]}>
                Every level blocks the allergen. The level tells your household how careful to be.
              </Text>
              {chosenAllergens.map((slug) => (
                <View key={slug} style={styles.severityRow}>
                  <Text style={[typography.title, { color: colors.ink }]}>{capitalise(allergenWord(slug))}</Text>
                  <View accessibilityRole="radiogroup" style={styles.options}>
                    {SEVERITY_CHOICES.map((choice) => (
                      <OptionButton
                        key={choice.label}
                        label={choice.label}
                        selected={rules.allergies[slug] === choice.value}
                        onPress={() => setSeverity(slug, choice.value)}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          <Button
            label={chosenAllergens.length > 0 ? 'Next: ingredients you avoid' : 'I have no food allergies'}
            onPress={() => setStep(2)}
            size="large"
            fullWidth
          />
        </>
      )}

      {step === 2 && (
        <>
          <SectionHeader
            headline="Is there anything else you avoid?"
            deck="Pick an ingredient or type your own. We flag any product whose label lists it."
            step={2}
            totalSteps={TOTAL_STEPS}
            tag="Ingredients"
          />
          <View style={styles.chips}>
            {withChosen(SUGGESTED_INGREDIENTS, rules.ingredients).map((name) => (
              <RuleChip
                key={name}
                label={capitalise(name)}
                selected={rules.ingredients.includes(name)}
                onToggle={() => toggleIngredient(name)}
              />
            ))}
          </View>
          <TextField
            label="Add an ingredient"
            value={typedIngredient}
            onChangeText={setTypedIngredient}
            placeholder="Gelatine"
            helper="Spell it the way a label would."
            trailingIcon="add"
            trailingLabel="Add this ingredient"
            onTrailingPress={addTypedIngredient}
          />
          <Button label="Next: E-numbers you avoid" onPress={() => setStep(3)} size="large" fullWidth />
        </>
      )}

      {step === 3 && (
        <>
          <SectionHeader
            headline="Are there additives you avoid?"
            deck="Labels list additives by their E-number. Pick any you stay away from."
            step={3}
            totalSteps={TOTAL_STEPS}
            tag="E-numbers"
          />
          <View style={styles.chips}>
            {withChosen(
              SUGGESTED_E_NUMBERS.map((item) => item.code),
              rules.eNumbers,
            ).map((code) => {
              const name = SUGGESTED_E_NUMBERS.find((item) => item.code === code)?.name;
              return (
                <RuleChip
                  key={code}
                  label={name ? `${code}, ${name}` : code}
                  selected={rules.eNumbers.includes(code)}
                  onToggle={() => toggleENumber(code)}
                />
              );
            })}
          </View>
          <TextField
            label="Add an E-number"
            value={typedENumber}
            onChangeText={(text) => {
              setTypedENumber(text);
              setENumberError(undefined);
            }}
            placeholder="E220"
            autoCapitalize="characters"
            error={eNumberError}
            trailingIcon="add"
            trailingLabel="Add this E-number"
            onTrailingPress={addTypedENumber}
          />
          <Button
            label={mode === 'first-run' ? 'Save and start scanning' : 'Save my rules'}
            loading={saving}
            loadingLabel="Saving your rules"
            onPress={save}
            size="large"
            fullWidth
          />
        </>
      )}

      {failure && (
        <Snackbar
          kind="failure"
          message={failure}
          actionLabel="Retry"
          onAction={save}
          onDismiss={() => setFailure(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s3,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  block: {
    gap: space.s3,
  },
  severityRow: {
    gap: space.s2,
  },
  options: {
    flexDirection: 'row',
    gap: space.s2,
  },
});
