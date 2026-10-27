/**
 * Onboarding: set the rules every scan is checked against, in two steps,
 * then a screen that shows what was saved.
 *
 *   1. Allergies and diets. Required: you either pick some or tap "None of
 *      these". Each allergy gets a level: Avoid, Moderate or Severe.
 *   2. Anything else you avoid: ingredients and E-numbers. Optional.
 *   Ready: your rules as a list, and the way into the app.
 *
 * A diet here is a shortcut for the allergens it rules out: dairy-free is
 * "avoid milk", gluten-free is "avoid gluten". It is saved as those allergen
 * rules, which the verdict engine already checks, aliases and all. Diets the
 * engine cannot check yet (vegetarian, halal) are left out on purpose: a rule
 * it cannot check would turn every scan into Caution.
 *
 * The same screen edits your rules later from Profile ("edit" mode, no ready
 * screen). Nothing is saved until the end of step 2, so backing out part way
 * changes nothing.
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
import { warmCatalogue } from '@/features/home/use-catalogue';
import {
  loadMyRules,
  saveMyRules,
  toRows,
  type AllergySeverity,
  type MyRules,
} from '@/features/onboarding/my-rules';
import {
  ALLERGENS,
  DIETS,
  E_NUMBER_PATTERN,
  SEVERITY_CHOICES,
  SUGGESTED_E_NUMBERS,
  SUGGESTED_INGREDIENTS,
} from '@/features/onboarding/rule-options';
import { RuleGroups } from '@/features/profile/RuleGroups';
import { allergenWord } from '@/services/verdict';
import { icon, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Mode = 'first-run' | 'edit';
type Step = 1 | 2 | 'ready';

const TOTAL_STEPS = 2;

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

/** A diet is on when every allergen it rules out is already on your list. */
function dietIsOn(diet: (typeof DIETS)[number], allergies: MyRules['allergies']): boolean {
  return diet.allergens.every((slug) => slug in allergies);
}

export function OnboardingScreen({ mode }: { mode: Mode }) {
  const { colors } = useNjamTheme();
  const { member, finishOnboarding } = useAuth();

  const [rules, setRules] = useState<MyRules | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [typedIngredient, setTypedIngredient] = useState('');
  const [typedENumber, setTypedENumber] = useState('');
  const [eNumberError, setENumberError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [showLevels, setShowLevels] = useState(false);

  // While you set your rules, the catalogue downloads in the background, so
  // Home has its products ready when you get there. Edit mode comes from
  // Profile, where the catalogue is already loaded.
  useEffect(() => {
    if (mode === 'first-run') warmCatalogue();
  }, [mode]);

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

  /**
   * Turning a diet on adds the allergens it rules out, as "Avoid", and keeps
   * the level of any you had already picked. Turning it off removes them, and
   * their chips above switch off too, so the change is always visible.
   */
  function toggleDiet(diet: (typeof DIETS)[number]) {
    setRules((current) => {
      if (!current) return current;
      const allergies = { ...current.allergies };
      if (dietIsOn(diet, allergies)) {
        for (const slug of diet.allergens) delete allergies[slug];
      } else {
        for (const slug of diet.allergens) if (!(slug in allergies)) allergies[slug] = null;
      }
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
    // From the ready screen your rules are already saved; saving again replaces them.
    if (step === 'ready') setStep(2);
    else if (step === 2) setStep(1);
    else router.back();
  }

  async function save() {
    if (!rules) return;
    setBusy(true);
    setFailure(null);
    try {
      setRules(await saveMyRules(rules));
      if (mode === 'first-run') setStep('ready');
      else router.back();
    } catch {
      setFailure('We could not save your rules. Check your connection.');
    } finally {
      setBusy(false);
    }
  }

  async function goHome() {
    setBusy(true);
    setFailure(null);
    try {
      // The root layout sees onboarded turn true and opens the tabs on Home.
      await finishOnboarding();
    } catch {
      setFailure('We could not reach Njam. Check your connection.');
      setBusy(false);
    }
  }

  // There is nothing behind the first step of first-run to go back to.
  const showBack = step !== 1 || mode === 'edit';

  return (
    <Screen
      topBar={
        step === 'ready'
          ? { onBack: goBack }
          : { onBack: showBack ? goBack : undefined, middle: <StepProgress step={step} total={TOTAL_STEPS} /> }
      }
      footer={
        step === 'ready' ? (
          <>
            <Button
              label="Go to Home"
              loading={busy}
              loadingLabel="Opening Njam"
              onPress={goHome}
              size="large"
              fullWidth
            />
            {/* Your rules are saved, so changing them now replaces them. */}
            <Button label="Change my rules" variant="text" onPress={() => setStep(1)} fullWidth />
          </>
        ) : undefined
      }>

      {step === 1 && (
        <>
          <SectionHeader
            headline="What can you not eat?"
            deck="Tap everything that applies. A product that contains it comes back Not safe."
            step={1}
            totalSteps={TOTAL_STEPS}
            tag="Allergies and diets"
          />

          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Allergies</Text>
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
          </View>

          {/* Straight under the chips, so a tick shows its level choice where
              you are looking. At the bottom of the page it was easy to miss. */}
          {chosenAllergens.length > 0 && (
            <View style={styles.block}>
              <View style={styles.headingRow}>
                <View style={styles.heading}>
                  <SectionHeader variant="simple" headline="How strict is each one?" />
                </View>
                <IconButton
                  icon="info"
                  accessibilityLabel={showLevels ? 'Hide what each level means' : 'Show what each level means'}
                  selected={showLevels}
                  onPress={() => setShowLevels((shown) => !shown)}
                />
              </View>
              <Text style={[typography.body, { color: colors.inkMuted }]}>
                Every level blocks the allergen. The level tells your household how careful to be.
              </Text>
              {showLevels && (
                <View style={styles.levels}>
                  {SEVERITY_CHOICES.map((choice) => (
                    <View key={choice.label}>
                      <Text style={[typography.title, { color: colors.ink }]}>{choice.label}</Text>
                      <Text style={[typography.body, { color: colors.inkMuted }]}>{choice.meaning}</Text>
                    </View>
                  ))}
                </View>
              )}
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

          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Diets</Text>
            <View style={styles.chips}>
              {DIETS.map((diet) => (
                <RuleChip
                  key={diet.label}
                  label={diet.label}
                  selected={dietIsOn(diet, rules.allergies)}
                  onToggle={() => toggleDiet(diet)}
                />
              ))}
            </View>
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
              A diet marks what it rules out, so dairy-free adds milk to your list.
            </Text>
          </View>

          <Button
            label={chosenAllergens.length > 0 ? 'Next: anything else you avoid' : 'None of these'}
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
            deck="Pick from the lists or type your own. We flag any product whose label lists it."
            step={2}
            totalSteps={TOTAL_STEPS}
            tag="Ingredients and additives"
          />

          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Ingredients</Text>
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
          </View>

          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Additives (E-numbers)</Text>
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
          </View>

          <Button
            label="Save my rules"
            loading={busy}
            loadingLabel="Saving your rules"
            onPress={save}
            size="large"
            fullWidth
          />
        </>
      )}

      {/* One View with no gap of its own: the SectionHeader already leaves
          space under itself, and Screen's gap on top of that left a hole
          between the deck and your rules (as on Home). */}
      {step === 'ready' && (
        <View>
          <SectionHeader
            headline="Your profile is ready"
            deck={
              toRows(rules).length > 0
                ? 'Every scan now checks these rules. You can change any of them on Profile.'
                : 'You have no rules yet, so every scan comes back as Caution. You can add rules on Profile.'
            }
          />
          <RuleGroups rules={toRows(rules)} />
        </View>
      )}

      {failure && (
        <Snackbar
          kind="failure"
          message={failure}
          actionLabel="Retry"
          onAction={step === 'ready' ? goHome : save}
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  block: {
    gap: space.s3,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s2,
  },
  heading: {
    flex: 1,
  },
  levels: {
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
