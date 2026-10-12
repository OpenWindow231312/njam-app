/**
 * The verdict engine: decides Safe, Caution or Not safe.
 *
 * Deterministic on purpose. No network, no AI, no imports from the app: the
 * same product and the same rules always give the same verdict, so it can be
 * tested on its own against the regression suite.
 *
 * How it decides:
 *   1. Every rule that the ingredient list breaks is a Not safe reason.
 *   2. Every rule it could not check (no ingredient list, no nutrition facts,
 *      a rule type the engine does not know yet) is a Caution reason.
 *   3. A product nobody has verified can never be Safe. It is capped at
 *      Caution, but a broken rule still makes it Not safe.
 *   4. Safe only when every rule was checked and none was broken.
 *
 * When unsure, it says Caution. A false Caution is a nuisance; a false Safe
 * is a health incident.
 */

export type VerdictState = 'safe' | 'caution' | 'unsafe';

/** One ingredient, already resolved through the alias chain. */
export type VerdictIngredient = {
  /** As printed on the label: "milk solids". */
  name: string;
  /** The canonical ingredient it is an alias of ("milk"), or null. */
  canonicalName: string | null;
  /** allergens.slug, e.g. "milk", or null. */
  allergen: string | null;
  /** "E621", or null. */
  eNumber: string | null;
};

export type VerdictProduct = {
  /** False for a user-added or AI-read record nobody has checked. */
  verified: boolean;
  /** True when this came straight from a label photo or typed label text. */
  readFromLabel: boolean;
  ingredients: VerdictIngredient[];
  /** Allergen slugs from a "may contain" line. */
  mayContain: string[];
};

/** A row from profile_rules. */
export type ProfileRule = {
  type: string;
  target: string;
  operator: 'excludes' | 'requires' | 'lte' | 'gte' | 'equals';
  threshold: number | null;
  unit: string | null;
  severity: 'mild' | 'moderate' | 'severe' | null;
};

export type VerdictReason = {
  /** Material Symbols name, as VerdictBanner expects. */
  icon: string;
  text: string;
};

export type Verdict = {
  state: VerdictState;
  /** Worst first, at most five, as VerdictBanner expects. */
  reasons: VerdictReason[];
  /** How many rules were checked, for "Checked against 3 rules in your profile." */
  rulesChecked: number;
};

const MAX_REASONS = 5;

/** How an allergen slug reads in a sentence. Also used by the Profile screen. */
const ALLERGEN_WORDS: Record<string, string> = {
  milk: 'milk',
  egg: 'egg',
  fish: 'fish',
  'crustacean-mollusc': 'shellfish',
  peanut: 'peanuts',
  soy: 'soy',
  'tree-nut': 'tree nuts',
  gluten: 'gluten',
};

export function allergenWord(slug: string): string {
  return ALLERGEN_WORDS[slug] ?? slug;
}

/** "You marked milk as severe." or, with no severity, "You avoid milk." */
function yourRule(thing: string, severity: ProfileRule['severity']): string {
  return severity ? `You marked ${thing} as ${severity}.` : `You avoid ${thing}.`;
}

function same(a: string | null, b: string): boolean {
  return a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

type RuleOutcome = { broken: VerdictReason | null; unchecked: VerdictReason | null };

const PASSED: RuleOutcome = { broken: null, unchecked: null };

function checkAllergen(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const word = allergenWord(rule.target);
  const hit = product.ingredients.find((item) => item.allergen === rule.target);
  if (hit) {
    return { broken: { icon: 'no_food', text: `Contains ${hit.name}. ${yourRule(word, rule.severity)}` }, unchecked: null };
  }
  if (product.mayContain.includes(rule.target)) {
    return {
      broken: null,
      unchecked: { icon: 'no_food', text: `The label says it may contain ${word}. ${yourRule(word, rule.severity)}` },
    };
  }
  return PASSED;
}

function checkIngredient(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const hit = product.ingredients.find(
    (item) => same(item.name, rule.target) || same(item.canonicalName, rule.target),
  );
  if (!hit) return PASSED;
  return { broken: { icon: 'no_food', text: `Contains ${hit.name}, which you avoid.` }, unchecked: null };
}

function checkENumber(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const hit = product.ingredients.find((item) => same(item.eNumber, rule.target));
  if (!hit) return PASSED;
  return {
    broken: { icon: 'science', text: `Contains ${rule.target.toUpperCase()} (${hit.name}), which you avoid.` },
    unchecked: null,
  };
}

/** Checks one rule against the product. */
function checkRule(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  // Only exclusions can be checked against an ingredient list today.
  if (rule.operator === 'excludes') {
    if (rule.type === 'allergen') return checkAllergen(rule, product);
    if (rule.type === 'ingredient') return checkIngredient(rule, product);
    if (rule.type === 'e_number') return checkENumber(rule, product);
  }

  if (rule.type === 'nutrient') {
    // Nutrition facts are not loaded yet, so a limit cannot be checked.
    return {
      broken: null,
      unchecked: {
        icon: 'nutrition',
        text: `We have no nutrition facts for this product, so we could not check your ${rule.target} limit.`,
      },
    };
  }

  return {
    broken: null,
    unchecked: { icon: 'restaurant', text: `We cannot check your ${rule.target} rule yet.` },
  };
}

export function decideVerdict(product: VerdictProduct, rules: ProfileRule[]): Verdict {
  const broken: VerdictReason[] = [];
  const unchecked: VerdictReason[] = [];

  if (product.ingredients.length === 0) {
    // Nothing to check against. Every rule is unknown, not passed.
    unchecked.push({
      icon: 'info',
      text: 'We have no ingredient list for this product, so we could not check your rules.',
    });
  } else {
    for (const rule of rules) {
      const outcome = checkRule(rule, product);
      if (outcome.broken) broken.push(outcome.broken);
      if (outcome.unchecked) unchecked.push(outcome.unchecked);
    }
  }

  if (rules.length === 0) {
    unchecked.push({ icon: 'info', text: 'Your profile has no rules yet, so there was nothing to check.' });
  }

  if (!product.verified) {
    unchecked.push({
      icon: 'info',
      text: product.readFromLabel
        ? 'We read this from the label, and nobody has checked it yet.'
        : 'Nobody has checked this ingredient list yet.',
    });
  }

  let state: VerdictState;
  if (broken.length > 0) state = 'unsafe';
  else if (unchecked.length > 0) state = 'caution';
  else state = 'safe';

  const reasons =
    state === 'safe'
      ? [{ icon: 'task_alt', text: 'None of your rules matched the ingredient list.' }]
      : [...broken, ...unchecked].slice(0, MAX_REASONS);

  return { state, reasons, rulesChecked: rules.length };
}
