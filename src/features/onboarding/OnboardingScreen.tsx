/**
 * Onboarding: set the rules every scan is checked against, one question per
 * page, then a screen that shows what was saved.
 *
 *   1. Allergies. Required: you either pick some or tap "I have no
 *      allergies". Tapping an allergen adds it as Severe and opens a sheet
 *      with the three levels; tapping a level closes it.
 *   2. Diet and faith. Optional. Tapping one (halaal, vegan) opens a sheet
 *      listing what it rules out, all ticked, and you untick what you are
 *      fine with. Saved as ingredient, E-number and allergen rules the
 *      engine already checks.
 *   3. Anything else you avoid: ingredients and E-numbers. Optional.
 *   4. Nutrient limits per 100 g, with health presets. Optional.
 *   Ready: your rules as chips, and the way into the app.
 *
 * Every chosen thing becomes a forest chip, and tapping it opens the same
 * sheet again to change or remove it.
 *
 * The same screen edits your rules later from Profile ("edit" mode, no ready
 * screen). Nothing is saved until the end of step 4, so backing out part way
 * changes nothing.
 */
import { router } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import {
  Button,
  ListGroup,
  ListRow,
  LoadingMark,
  RuleChip,
  SectionHeader,
  Snackbar,
  StepProgress,
  TextField,
  type Severity,
} from '@/components/design-system';
import { useAuth } from '@/features/auth/AuthProvider';
import { warmCatalogue } from '@/features/home/use-catalogue';
import { DietSheet } from '@/features/onboarding/DietSheet';
import { LevelSheet } from '@/features/onboarding/LevelSheet';
import { LimitSheet } from '@/features/onboarding/LimitSheet';
import {
  dietItems,
  loadMyRules,
  saveMyRules,
  type AllergySeverity,
  type MyRules,
} from '@/features/onboarding/my-rules';
import {
  ALLERGENS,
  DIET_PRESETS,
  E_NUMBER_PATTERN,
  NUTRIENT_OPTIONS,
  NUTRIENT_PRESETS,
  SUGGESTED_E_NUMBERS,
  SUGGESTED_INGREDIENTS,
} from '@/features/onboarding/rule-options';
import { allergenWord } from '@/services/verdict';
import { icon, radius, space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

type Mode = 'first-run' | 'edit';
type Step = 1 | 2 | 3 | 4 | 'ready';

const TOTAL_STEPS = 4;

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

/** "milk", "milk and peanuts", "milk, peanuts and soy". */
function listWords(words: string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
}

/** "Halaal, 5 rules": a diet's chip once it is on your list. */
function dietChipLabel(label: string, count: number): string {
  return `${label}, ${count} ${count === 1 ? 'rule' : 'rules'}`;
}

/** "Max 5 g". */
function limitWords(limit: number, unit: string): string {
  return `Max ${limit} ${unit}`;
}

/** A preset is on when every limit it sets is set to exactly its amount. */
function presetIsOn(preset: (typeof NUTRIENT_PRESETS)[number], limits: MyRules['limits']): boolean {
  return Object.entries(preset.limits).every(([target, amount]) => limits[target] === amount);
}

export function OnboardingScreen({ mode }: { mode: Mode }) {
  const { colors, shadows } = useNjamTheme();
  const { member, finishOnboarding } = useAuth();

  const [rules, setRules] = useState<MyRules | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [typedIngredient, setTypedIngredient] = useState('');
  const [typedENumber, setTypedENumber] = useState('');
  const [eNumberError, setENumberError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  // Which sheet is open, by what it is about: an allergen slug, a diet key or a nutrient.
  const [levelFor, setLevelFor] = useState<string | null>(null);
  const [dietFor, setDietFor] = useState<string | null>(null);
  const [limitFor, setLimitFor] = useState<string | null>(null);

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
  const severeWords = chosenAllergens.filter((slug) => rules.allergies[slug] === 'severe').map(allergenWord);
  const cardStyle = [styles.card, { backgroundColor: colors.surfaceRaised }, shadows.ambient];

  /** Tapping an allergen adds it as Severe, the safer guess, and asks its level. */
  function tapAllergen(slug: string) {
    setRules((current) => {
      if (!current || slug in current.allergies) return current;
      return { ...current, allergies: { ...current.allergies, [slug]: 'severe' } };
    });
    setLevelFor(slug);
  }

  function setSeverity(slug: string, severity: AllergySeverity) {
    setRules((current) => current && { ...current, allergies: { ...current.allergies, [slug]: severity } });
    setLevelFor(null);
  }

  function removeAllergen(slug: string) {
    setRules((current) => {
      if (!current) return current;
      const allergies = { ...current.allergies };
      delete allergies[slug];
      return { ...current, allergies };
    });
    setLevelFor(null);
  }

  function saveDiet(key: string, ticked: string[]) {
    setRules((current) => current && { ...current, diets: { ...current.diets, [key]: ticked } });
    setDietFor(null);
  }

  function removeDiet(key: string) {
    setRules((current) => {
      if (!current) return current;
      const diets = { ...current.diets };
      delete diets[key];
      return { ...current, diets };
    });
    setDietFor(null);
  }

  function setLimit(target: string, limit: number | null) {
    setRules((current) => {
      if (!current) return current;
      const limits = { ...current.limits };
      if (limit === null) delete limits[target];
      else limits[target] = limit;
      return { ...current, limits };
    });
    setLimitFor(null);
  }

  /** A preset sets its limits, or takes them away again if it is already on. */
  function togglePreset(preset: (typeof NUTRIENT_PRESETS)[number]) {
    setRules((current) => {
      if (!current) return current;
      const limits = { ...current.limits };
      const on = presetIsOn(preset, limits);
      for (const [target, amount] of Object.entries(preset.limits)) {
        if (on) delete limits[target];
        else limits[target] = amount;
      }
      return { ...current, limits };
    });
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
    if (step === 'ready') setStep(4);
    else if (step > 1) setStep((step - 1) as Step);
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

  function footer() {
    if (step === 'ready') {
      return (
        <>
          <Button label="Go to Home" loading={busy} loadingLabel="Opening Njam" onPress={goHome} size="large" fullWidth />
          {/* Your rules are saved, so changing them now replaces them. */}
          <Button label="Change my rules" variant="text" onPress={() => setStep(1)} fullWidth />
        </>
      );
    }
    if (step === 1) {
      return (
        <>
          <Button
            label="Next: diet and faith"
            onPress={() => setStep(2)}
            disabled={chosenAllergens.length === 0}
            size="large"
            fullWidth
          />
          {chosenAllergens.length === 0 && (
            <Button label="I have no allergies" variant="text" onPress={() => setStep(2)} fullWidth />
          )}
        </>
      );
    }
    if (step === 2) return <Button label="Next: things you avoid" onPress={() => setStep(3)} size="large" fullWidth />;
    if (step === 3) return <Button label="Next: nutrient limits" onPress={() => setStep(4)} size="large" fullWidth />;
    return (
      <Button label="Save my rules" loading={busy} loadingLabel="Saving your rules" onPress={save} size="large" fullWidth />
    );
  }

  const openDiet = DIET_PRESETS.find((diet) => diet.key === dietFor) ?? null;
  const openNutrient = NUTRIENT_OPTIONS.find((option) => option.target === limitFor) ?? null;
  const chosenDiets = DIET_PRESETS.filter((diet) => diet.key in rules.diets);

  return (
    <Screen
      topBar={
        step === 'ready'
          ? { onBack: goBack }
          : { onBack: showBack ? goBack : undefined, middle: <StepProgress step={step} total={TOTAL_STEPS} /> }
      }
      footer={footer()}>
      {step === 1 && (
        <>
          <SectionHeader
            headline="Tap what you react to"
            deck="Tap each one. We ask how serious it is next."
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
                onToggle={() => tapAllergen(slug)}
              />
            ))}
          </View>
          {chosenAllergens.length > 0 && (
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
              Tap a chosen one to change its level or remove it.
            </Text>
          )}
          {severeWords.length > 0 && (
            <View style={cardStyle}>
              <Text style={[typography.title, { color: colors.ink }]}>What Severe changes</Text>
              <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
                You marked {listWords(severeWords)} as severe, so a product our team has not checked can never be
                Safe for you.
              </Text>
            </View>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <SectionHeader
            headline="Do you follow a diet or faith?"
            deck="Optional. Tap one to see what it rules out."
            step={2}
            totalSteps={TOTAL_STEPS}
            tag="Diet and faith"
          />
          <View style={styles.chips}>
            {DIET_PRESETS.map((diet) => (
              <RuleChip
                key={diet.key}
                label={diet.key in rules.diets ? dietChipLabel(diet.label, rules.diets[diet.key].length) : diet.label}
                selected={diet.key in rules.diets}
                onToggle={() => setDietFor(diet.key)}
              />
            ))}
          </View>
          {chosenDiets.map((diet) => (
            <View key={diet.key} style={cardStyle}>
              <Text style={[typography.title, { color: colors.ink }]}>{diet.label} rules out</Text>
              <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
                {capitalise(listWords(dietItems(rules, diet.key).map((item) => item.label.toLowerCase())))}.
              </Text>
            </View>
          ))}
          {chosenDiets.length > 0 && (
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
              We check the ingredient list, not a certificate. Tap a diet above to change what it covers.
            </Text>
          )}
        </>
      )}

      {step === 3 && (
        <>
          <SectionHeader
            headline="Anything else you avoid?"
            deck="Optional. Pick from the lists or type your own. We flag any product whose label lists it."
            step={3}
            totalSteps={TOTAL_STEPS}
            tag="Things you avoid"
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
              placeholder="Palm kernel oil"
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
        </>
      )}

      {step === 4 && (
        <>
          <SectionHeader
            headline="Watching any nutrients?"
            deck="Optional. Set a limit per 100 g and we flag anything over it."
            step={4}
            totalSteps={TOTAL_STEPS}
            tag="Nutrient limits"
          />
          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Start from a preset</Text>
            <View style={styles.chips}>
              {NUTRIENT_PRESETS.map((preset) => (
                <RuleChip
                  key={preset.label}
                  label={preset.label}
                  selected={presetIsOn(preset, rules.limits)}
                  onToggle={() => togglePreset(preset)}
                />
              ))}
            </View>
          </View>
          <View style={styles.block}>
            <Text style={[typography.overline, { color: colors.inkMuted }]}>Or set your own</Text>
            <ListGroup>
              {NUTRIENT_OPTIONS.map((option) => (
                <ListRow
                  key={option.target}
                  title={option.label}
                  supporting={option.hint}
                  value={
                    rules.limits[option.target] !== undefined
                      ? limitWords(rules.limits[option.target], option.unit)
                      : 'Not set'
                  }
                  trailing="chevron"
                  onPress={() => setLimitFor(option.target)}
                />
              ))}
            </ListGroup>
            <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
              Presets are a starting point, not medical advice.
            </Text>
          </View>
        </>
      )}

      {step === 'ready' && (
        <>
          <SectionHeader
            headline="Your rules are ready"
            deck={
              chosenAllergens.length + chosenDiets.length + rules.ingredients.length + rules.eNumbers.length > 0 ||
              Object.keys(rules.limits).length > 0
                ? 'Every scan is checked against these. Change them any time on Profile.'
                : 'You have no rules yet, so every scan comes back as Caution. You can add rules on Profile.'
            }
            tag="All set"
          />
          <ReadyGroup title="Allergies">
            {chosenAllergens.map((slug) => (
              <RuleChip
                key={slug}
                label={capitalise(allergenWord(slug))}
                selected
                severity={chipSeverity(rules.allergies[slug])}
                onToggle={() => setStep(1)}
              />
            ))}
          </ReadyGroup>
          <ReadyGroup title="Diet and faith">
            {chosenDiets.map((diet) => (
              <RuleChip
                key={diet.key}
                label={dietChipLabel(diet.label, rules.diets[diet.key].length)}
                selected
                onToggle={() => setStep(2)}
              />
            ))}
          </ReadyGroup>
          <ReadyGroup title="Things you avoid">
            {[...rules.ingredients.map(capitalise), ...rules.eNumbers].map((label) => (
              <RuleChip key={label} label={label} selected onToggle={() => setStep(3)} />
            ))}
          </ReadyGroup>
          <ReadyGroup title="Nutrient limits">
            {NUTRIENT_OPTIONS.filter((option) => rules.limits[option.target] !== undefined).map((option) => (
              <RuleChip
                key={option.target}
                label={`${option.label}, ${limitWords(rules.limits[option.target], option.unit).toLowerCase()}`}
                selected
                onToggle={() => setStep(4)}
              />
            ))}
          </ReadyGroup>
        </>
      )}

      <LevelSheet
        allergen={levelFor ? allergenWord(levelFor) : null}
        severity={levelFor ? (rules.allergies[levelFor] ?? null) : null}
        onChoose={(severity) => levelFor && setSeverity(levelFor, severity)}
        onRemove={() => levelFor && removeAllergen(levelFor)}
        onClose={() => setLevelFor(null)}
      />
      <DietSheet
        key={`diet-${dietFor}`}
        diet={openDiet}
        ticked={dietFor ? (rules.diets[dietFor] ?? null) : null}
        onSave={(ticked) => dietFor && saveDiet(dietFor, ticked)}
        onRemove={() => dietFor && removeDiet(dietFor)}
        onClose={() => setDietFor(null)}
      />
      <LimitSheet
        key={`limit-${limitFor}`}
        nutrient={openNutrient}
        limit={limitFor ? rules.limits[limitFor] : undefined}
        onSave={(limit) => limitFor && setLimit(limitFor, limit)}
        onRemove={() => limitFor && setLimit(limitFor, null)}
        onClose={() => setLimitFor(null)}
      />

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

/** One group on the ready screen: its name over its chips. Left out when it has none. Tapping a chip goes back to its step. */
function ReadyGroup({ title, children }: { title: string; children: ReactNode[] }) {
  const { colors } = useNjamTheme();
  if (children.length === 0) return null;
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
        {title}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
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
  card: {
    gap: space.s1,
    padding: space.s4,
    borderRadius: radius.lg,
  },
});
