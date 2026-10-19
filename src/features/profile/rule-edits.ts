/**
 * The changes the Rules tab can make to your rules, as small pure functions.
 *
 * Each takes your rules and returns a new copy with one change, leaving the
 * original alone, so the screen can save the copy and keep the old one if
 * the save fails. Saving itself is saveMyRules in onboarding/my-rules.ts.
 */
import type { AllergySeverity, MyRules } from '@/features/onboarding/my-rules';
import type { DIETS } from '@/features/onboarding/rule-options';

/** One rule on the Rules tab, the thing a chip opens. */
export type RuleRef =
  | { type: 'allergen'; slug: string }
  | { type: 'ingredient'; value: string }
  | { type: 'e_number'; value: string };

export function withAllergy(rules: MyRules, slug: string, severity: AllergySeverity): MyRules {
  return { ...rules, allergies: { ...rules.allergies, [slug]: severity } };
}

/** A diet is saved as the allergens it rules out, each with no severity ("Avoid"). */
export function withDiet(rules: MyRules, diet: (typeof DIETS)[number]): MyRules {
  const allergies = { ...rules.allergies };
  for (const slug of diet.allergens) {
    // An allergy you already marked keeps its level.
    if (!(slug in allergies)) allergies[slug] = null;
  }
  return { ...rules, allergies };
}

export function withIngredient(rules: MyRules, ingredient: string): MyRules {
  const value = ingredient.trim().toLowerCase();
  if (rules.ingredients.includes(value)) return rules;
  return { ...rules, ingredients: [...rules.ingredients, value] };
}

export function withENumber(rules: MyRules, code: string): MyRules {
  if (rules.eNumbers.includes(code)) return rules;
  return { ...rules, eNumbers: [...rules.eNumbers, code] };
}

export function withoutRule(rules: MyRules, rule: RuleRef): MyRules {
  if (rule.type === 'allergen') {
    const allergies = { ...rules.allergies };
    delete allergies[rule.slug];
    return { ...rules, allergies };
  }
  if (rule.type === 'ingredient') {
    return { ...rules, ingredients: rules.ingredients.filter((item) => item !== rule.value) };
  }
  return { ...rules, eNumbers: rules.eNumbers.filter((item) => item !== rule.value) };
}

/** A diet is on when every allergen it rules out is already on your list. */
export function dietIsOn(diet: (typeof DIETS)[number], allergies: MyRules['allergies']): boolean {
  return diet.allergens.every((slug) => slug in allergies);
}

/** How many rules a scan is checked against. */
export function ruleCount(rules: MyRules): number {
  return Object.keys(rules.allergies).length + rules.ingredients.length + rules.eNumbers.length;
}

export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
