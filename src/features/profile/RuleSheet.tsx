/**
 * RuleSheet: the bottom sheet on the Rules tab. It has two views.
 *
 *   add  - "Add a rule": a search, kinds to narrow it, and suggestions as
 *          chips. A diet, an ingredient or an E-number is added straight
 *          away. An allergy moves on to the edit view, to ask how bad a
 *          reaction is, and is added from there.
 *   edit - one rule: for an allergy, its level (Avoid, Moderate, Severe) and
 *          Save; for anything, Remove.
 *
 * Both views live in one sheet on purpose. Going from "add" to "edit" swaps
 * what the sheet shows, instead of closing one modal and opening another,
 * which iOS does not allow while the first is still closing.
 *
 * The sheet never saves on its own. It hands the changed rules to the Rules
 * tab (onSave), which saves them and closes it.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BottomSheet,
  Button,
  FilterChip,
  OptionButton,
  RuleChip,
  TextField,
} from '@/components/design-system';
import type { AllergySeverity, MyRules } from '@/features/onboarding/my-rules';
import {
  ALLERGENS,
  DIETS,
  E_NUMBER_PATTERN,
  SEVERITY_CHOICES,
  SUGGESTED_E_NUMBERS,
  SUGGESTED_INGREDIENTS,
} from '@/features/onboarding/rule-options';
import {
  capitalise,
  dietIsOn,
  withAllergy,
  withDiet,
  withENumber,
  withIngredient,
  withoutRule,
  type RuleRef,
} from '@/features/profile/rule-edits';
import { allergenWord } from '@/services/verdict';
import { space, typography } from '@/theme/tokens';
import { useNjamTheme } from '@/theme/use-njam-theme';

/** What the sheet shows. isNew: an allergy picked in "add", not saved yet. */
export type RuleSheetView = { mode: 'add' } | { mode: 'edit'; rule: RuleRef; isNew: boolean };

type Kind = 'all' | 'allergies' | 'diets' | 'ingredients' | 'eNumbers';

const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'allergies', label: 'Allergies' },
  { value: 'diets', label: 'Diets' },
  { value: 'ingredients', label: 'Ingredients' },
  { value: 'eNumbers', label: 'E-numbers' },
];

/**
 * Diets the engine cannot check yet. Shown greyed out so people know they
 * are coming, never saved: a rule the engine cannot check would turn every
 * scan into Caution (see the note at the top of OnboardingScreen).
 */
const COMING_SOON_DIETS = ['Halaal', 'Kosher', 'Vegetarian', 'Vegan'];

type RuleSheetProps = {
  /** null: the sheet is closed. */
  view: RuleSheetView | null;
  rules: MyRules;
  saving: boolean;
  /** Save these rules; `done` is what the snackbar says afterwards. */
  onSave: (next: MyRules, done: string) => void;
  onClose: () => void;
};

export function RuleSheet({ view, rules, saving, onSave, onClose }: RuleSheetProps) {
  // The view can move from add to edit inside the sheet, so it is kept here.
  // It follows the Rules tab's view each time the sheet opens, and keeps the
  // last one while the sheet fades out, so the content does not vanish first.
  const [shown, setShown] = useState<RuleSheetView>(view ?? { mode: 'add' });
  useEffect(() => {
    if (view) setShown(view);
  }, [view]);

  const rule = shown.mode === 'edit' ? shown.rule : null;
  const isNew = shown.mode === 'edit' && shown.isNew;

  // The level chosen in the edit view. A new allergy starts at Severe, as in
  // onboarding: the strictest choice is the safe default, and you can lower it.
  const savedSeverity = rule?.type === 'allergen' ? (rules.allergies[rule.slug] ?? null) : null;
  const [severity, setSeverity] = useState<AllergySeverity>(null);
  useEffect(() => {
    setSeverity(isNew ? 'severe' : savedSeverity);
  }, [isNew, savedSeverity, rule]);

  // One BottomSheet whatever the view, so moving from add to edit swaps its
  // content instead of opening a second modal.
  let title = 'Add a rule';
  let subtitle = 'Tap one to add it. Allergies ask how bad a reaction is next.';
  let body = (
    <AddRuleBody
      rules={rules}
      onPickAllergen={(slug) => setShown({ mode: 'edit', rule: { type: 'allergen', slug }, isNew: true })}
      onSave={onSave}
    />
  );
  let footer: ReactNode = undefined;

  if (rule) {
    const word = rule.type === 'allergen' ? allergenWord(rule.slug) : rule.value;
    const name = rule.type === 'e_number' ? word : capitalise(word);
    title = name;
    subtitle = rule.type === 'allergen' ? 'Allergy' : rule.type === 'ingredient' ? 'Ingredient you avoid' : 'E-number you avoid';
    body = <EditRuleBody rule={rule} severity={severity} onSeverity={setSeverity} />;
    footer = (
      <>
        {rule.type === 'allergen' && (
          <Button
            label={isNew ? `Add ${word}` : `Save ${word}`}
            size="large"
            fullWidth
            loading={saving}
            loadingLabel="Saving"
            onPress={() =>
              onSave(withAllergy(rules, rule.slug, severity), isNew ? `${name} added to your rules.` : `${name} saved.`)
            }
          />
        )}
        {!isNew && (
          <Button
            label={`Remove ${word} from my rules`}
            variant="text"
            icon="delete"
            fullWidth
            disabled={saving}
            onPress={() => onSave(withoutRule(rules, rule), `${name} removed from your rules.`)}
          />
        )}
      </>
    );
  }

  return (
    <BottomSheet visible={view !== null} title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
      {body}
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Edit one rule                                                       */
/* ------------------------------------------------------------------ */

function EditRuleBody({
  rule,
  severity,
  onSeverity,
}: {
  rule: RuleRef;
  severity: AllergySeverity;
  onSeverity: (severity: AllergySeverity) => void;
}) {
  const { colors } = useNjamTheme();

  if (rule.type !== 'allergen') {
    return (
      <Text style={[typography.body, { color: colors.inkMuted }]}>Njam looks for {rule.value} on every label you scan.</Text>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[typography.title, { color: colors.ink }]}>How bad is a reaction?</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {SEVERITY_CHOICES.map((choice) => (
          <OptionButton
            key={choice.label}
            label={choice.label}
            selected={severity === choice.value}
            onPress={() => onSeverity(choice.value)}
          />
        ))}
      </View>
      <Text style={[typography.bodyS, { color: colors.inkMuted }]}>
        Choose Severe if even a trace makes you ill. Your verdicts say which level you chose.
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Add a rule                                                          */
/* ------------------------------------------------------------------ */

function AddRuleBody({
  rules,
  onPickAllergen,
  onSave,
}: {
  rules: MyRules;
  onPickAllergen: (slug: string) => void;
  onSave: (next: MyRules, done: string) => void;
}) {
  const { colors } = useNjamTheme();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('all');

  const typed = query.trim().toLowerCase();
  const matches = (text: string) => typed === '' || text.toLowerCase().includes(typed);
  const showKind = (wanted: Kind) => kind === 'all' || kind === wanted;

  // Everything you could still add, narrowed by what was typed.
  const allergens = ALLERGENS.filter((slug) => !(slug in rules.allergies) && matches(allergenWord(slug)));
  const diets = DIETS.filter((diet) => !dietIsOn(diet, rules.allergies) && matches(diet.label));
  const comingSoon = COMING_SOON_DIETS.filter(matches);
  const ingredients = SUGGESTED_INGREDIENTS.filter((item) => !rules.ingredients.includes(item) && matches(item));
  const eNumbers = SUGGESTED_E_NUMBERS.filter(
    (item) => !rules.eNumbers.includes(item.code) && (matches(item.code) || matches(item.name)),
  );

  // Something typed that is not a suggestion can still be added: as an
  // E-number if it looks like one ("e 621" becomes "E621"), otherwise as an
  // ingredient you avoid.
  const typedCode = query.replace(/\s/g, '').toUpperCase();
  const typedIsENumber = E_NUMBER_PATTERN.test(typedCode);
  const canAddTypedENumber = typedIsENumber && !rules.eNumbers.includes(typedCode);
  const canAddTypedIngredient =
    !typedIsENumber && typed.length >= 2 && !SUGGESTED_INGREDIENTS.includes(typed) && !rules.ingredients.includes(typed);

  const sections = [
    showKind('allergies') && allergens.length > 0 && (
      <ChipSection key="allergies" title="Allergies">
        {allergens.map((slug) => (
          <RuleChip
            key={slug}
            label={capitalise(allergenWord(slug))}
            selected={false}
            onToggle={() => onPickAllergen(slug)}
          />
        ))}
      </ChipSection>
    ),
    showKind('diets') && (diets.length > 0 || comingSoon.length > 0) && (
      <ChipSection
        key="diets"
        title="Diets"
        note={comingSoon.length > 0 ? 'Greyed out: coming soon. Njam cannot check these diets on a label yet.' : undefined}>
        {diets.map((diet) => (
          <RuleChip
            key={diet.label}
            label={diet.label}
            selected={false}
            onToggle={() => onSave(withDiet(rules, diet), `${diet.label} added to your rules.`)}
          />
        ))}
        {comingSoon.map((label) => (
          <RuleChip key={label} label={label} selected={false} disabled onToggle={() => {}} />
        ))}
      </ChipSection>
    ),
    showKind('ingredients') && ingredients.length > 0 && (
      <ChipSection key="ingredients" title="Ingredients">
        {ingredients.map((item) => (
          <RuleChip
            key={item}
            label={capitalise(item)}
            selected={false}
            onToggle={() => onSave(withIngredient(rules, item), `${capitalise(item)} added to your rules.`)}
          />
        ))}
      </ChipSection>
    ),
    showKind('eNumbers') && eNumbers.length > 0 && (
      <ChipSection key="eNumbers" title="E-numbers">
        {eNumbers.map((item) => (
          <RuleChip
            key={item.code}
            label={`${item.code} ${item.name}`}
            selected={false}
            onToggle={() => onSave(withENumber(rules, item.code), `${item.code} added to your rules.`)}
          />
        ))}
      </ChipSection>
    ),
  ].filter(Boolean);

  return (
    <>
      <TextField
        variant="search"
        label="Search allergies, diets, ingredients and E-numbers"
        value={query}
        onChangeText={setQuery}
        placeholder="Search, like sesame or E102"
        autoCapitalize="none"
        trailingIcon={query.length > 0 ? 'close' : undefined}
        trailingLabel="Clear search"
        onTrailingPress={() => setQuery('')}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kinds}>
        {KINDS.map((item) => (
          <FilterChip key={item.value} label={item.label} active={kind === item.value} onPress={() => setKind(item.value)} />
        ))}
      </ScrollView>

      {canAddTypedENumber && (
        <Button
          label={`Add ${typedCode} as an E-number you avoid`}
          variant="tonal"
          icon="add"
          onPress={() => onSave(withENumber(rules, typedCode), `${typedCode} added to your rules.`)}
        />
      )}
      {canAddTypedIngredient && (
        <Button
          label={`Add "${query.trim()}" as an ingredient you avoid`}
          variant="tonal"
          icon="add"
          onPress={() => onSave(withIngredient(rules, typed), `${capitalise(typed)} added to your rules.`)}
        />
      )}

      {sections}

      {sections.length === 0 && !canAddTypedENumber && !canAddTypedIngredient && (
        <Text style={[typography.body, { color: colors.inkMuted }]}>
          {typed === '' ? 'You have added everything we suggest here.' : `Nothing matches "${query.trim()}".`}
        </Text>
      )}
    </>
  );
}

function ChipSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const { colors } = useNjamTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[typography.overline, { color: colors.inkMuted }]}>
        {title}
      </Text>
      <View style={styles.chips}>{children}</View>
      {note && <Text style={[typography.bodyS, { color: colors.inkMuted }]}>{note}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.s2,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
  kinds: {
    gap: space.s2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.s2,
  },
});
