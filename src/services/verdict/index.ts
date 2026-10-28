/**
 * The verdict engine: decides Safe, Caution or Not safe.
 *
 * Deterministic on purpose. No network, no AI, no imports from the app: the
 * same product and the same rules always give the same verdict, so it can be
 * tested on its own against the regression suite. Its one import is
 * aliases.ts, the other names an ingredient goes by ("black tea" has
 * caffeine), which lives beside it under the same rules.
 *
 * The ".ts" on that import lets Node's test runner load this file as it is
 * (npm test); the app's bundler reads it the same either way.
 *
 * How it decides:
 *   1. Every rule that the ingredient list breaks is a Not safe reason.
 *   2. Every rule it could not check (no ingredient list, no nutrition facts,
 *      a rule type the engine does not know yet) is a Caution reason.
 *   3. A product nobody has verified can be Safe or Not safe, and its
 *      reasons say our team has not checked the list. The one exception: if
 *      the profile has a severe allergy, an unverified list is capped at
 *      Caution, because a misread label there could send someone to hospital.
 *   4. Open Food Facts records are decided by how complete they are (see
 *      isCompleteList). A complete one was typed in from the real label, so
 *      it is decided like a verified one. A thin one is always Caution,
 *      whatever the profile, because the missing part may hold the allergen.
 *   5. Safe only when every rule was checked and none was broken.
 *   6. A profile with no rules is Safe for everything: with nothing to check,
 *      nothing on a label can go against it.
 *
 * When unsure, it says Caution. A false Caution is a nuisance; a false Safe
 * is a health incident.
 */

import { aliasGroupFor, matchIngredient, mentions, type AliasGroup } from './aliases.ts';

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
  /**
   * How sure the label reader was, for a label it just read. Anything below
   * "high" caps the verdict at Caution: a word it misread could be the allergen.
   */
  readConfidence?: 'high' | 'medium' | 'low';
  /**
   * True when the ingredient list came from Open Food Facts. A complete one
   * is trusted like a verified record; a thin one stays capped at Caution.
   */
  fromOpenFoodFacts?: boolean;
  ingredients: VerdictIngredient[];
  /** Allergen slugs from a "may contain" line. */
  mayContain: string[];
  /** The label's nutrition table, or null/absent when we have none. */
  nutrition?: NutritionFacts | null;
};

/** A nutrition_facts column the engine can check a limit against. */
export type NutrientColumn =
  | 'energy_kj'
  | 'protein_g'
  | 'carbs_g'
  | 'sugar_g'
  | 'fat_g'
  | 'sat_fat_g'
  | 'fibre_g'
  | 'sodium_mg';

/** One row of nutrition_facts, as numbers. A column the label left out is absent. */
export type NutritionFacts = {
  basis: '100g' | '100ml' | 'serving';
  values: Partial<Record<NutrientColumn, number>>;
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
  /** One per rule, in profile order, for the rules card on the Verdict screen. */
  checks: RuleCheck[];
};

/**
 * One rule and what the label showed. This only describes the decision above
 * it: the state is still decided from the reasons, never from these.
 */
export type RuleCheck = {
  /** The rule in a few words: "Wheat · severe", "Sodium up to 400 mg". */
  label: string;
  /** met: kept. broken: the label breaks it. unchecked: we could not tell. */
  outcome: 'met' | 'broken' | 'unchecked';
  /** What the label showed: "Contains whole wheat", "Not listed". */
  detail: string;
  /**
   * The ingredients, as printed, that broke the rule (or, for an unchecked
   * rule, may break it), so the screen can highlight them.
   */
  matched: string[];
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

/**
 * How one rule came out. broken and unchecked are the reason lines, as before;
 * detail and matched only describe it for the rules card.
 */
type RuleOutcome = {
  broken: VerdictReason | null;
  unchecked: VerdictReason | null;
  detail: string;
  matched: string[];
};

const PASSED: RuleOutcome = { broken: null, unchecked: null, detail: 'Not listed', matched: [] };

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** The rule in a few words, as the rules card titles it: "Milk · severe". */
function ruleLabel(rule: ProfileRule): string {
  if (rule.type === 'allergen') {
    const word = capitalise(allergenWord(rule.target));
    return rule.severity ? `${word} · ${rule.severity}` : word;
  }
  if (rule.type === 'e_number') return rule.target.toUpperCase();
  if (rule.type === 'nutrient' && rule.threshold !== null) {
    const limit = rule.unit ? `${rule.threshold} ${rule.unit}` : `${rule.threshold}`;
    if (rule.operator === 'lte') return `${capitalise(rule.target)} up to ${limit}`;
    if (rule.operator === 'gte') return `${capitalise(rule.target)} at least ${limit}`;
  }
  return capitalise(rule.target);
}

/** The ingredients an alias group finds, split by how strongly. */
function aliasHits(product: VerdictProduct, group: AliasGroup | null) {
  if (!group) return { contains: [], traces: [] };
  return {
    contains: product.ingredients.filter((item) => matchIngredient(item, group) === 'contains'),
    traces: product.ingredients.filter((item) => matchIngredient(item, group) === 'traces'),
  };
}

/** The names, as printed, each once. */
function names(items: VerdictIngredient[]): string[] {
  return [...new Set(items.map((item) => item.name))];
}

function checkAllergen(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const word = allergenWord(rule.target);
  // Tagged with the allergen in the catalogue or by the label read, or named
  // by one of its aliases ("arachis oil" is peanut), whichever finds it.
  const aliases = aliasHits(product, aliasGroupFor(rule.target));
  const hits = product.ingredients.filter((item) => item.allergen === rule.target || aliases.contains.includes(item));
  if (hits.length > 0) {
    return {
      broken: { icon: 'no_food', text: `Contains ${hits[0].name}. ${yourRule(word, rule.severity)}` },
      unchecked: null,
      detail: `Contains ${hits[0].name}`,
      matched: names(hits),
    };
  }
  if (product.mayContain.includes(rule.target)) {
    // For a severe allergy even a trace is dangerous (the onboarding promise),
    // so a "may contain" line breaks the rule. Avoid and moderate stay Caution.
    if (rule.severity === 'severe') {
      return {
        broken: {
          icon: 'no_food',
          text: `The label says it may contain ${word}. You marked ${word} as severe, so even a trace is too much.`,
        },
        unchecked: null,
        detail: `The label says it may contain ${word}`,
        matched: [],
      };
    }
    return {
      broken: null,
      unchecked: { icon: 'no_food', text: `The label says it may contain ${word}. ${yourRule(word, rule.severity)}` },
      detail: `The label says it may contain ${word}`,
      matched: [],
    };
  }
  if (aliases.traces.length > 0) {
    const name = aliases.traces[0].name;
    return {
      broken: null,
      unchecked: { icon: 'no_food', text: `Contains ${name}, which can have ${word} in it. ${yourRule(word, rule.severity)}` },
      detail: `Contains ${name}, which can have ${word} in it`,
      matched: names(aliases.traces),
    };
  }
  return PASSED;
}

function checkIngredient(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const group = aliasGroupFor(rule.target);
  const word = group?.word ?? rule.target;
  const aliases = aliasHits(product, group);
  // The name itself, the alias chain, and then either the group of other
  // names it goes by ("black tea" has caffeine) or, with no group, the word
  // anywhere in the name ("brown sugar" names sugar). A group has its own
  // exceptions ("coconut milk" is not milk), so the plain word is not used then.
  const named = (text: string | null) => text !== null && mentions(text, rule.target);
  const hits = product.ingredients.filter(
    (item) =>
      same(item.name, rule.target) ||
      same(item.canonicalName, rule.target) ||
      (group ? aliases.contains.includes(item) : named(item.name) || named(item.canonicalName)),
  );
  if (hits.length > 0) {
    const name = hits[0].name;
    // "Contains brown sugar" says it all; "Contains black tea" needs the reason.
    const saysIt = mentions(name, word);
    return {
      broken: {
        icon: 'no_food',
        text: saysIt ? `Contains ${name}, which you avoid.` : `Contains ${name}, which has ${word}. You avoid ${word}.`,
      },
      unchecked: null,
      detail: saysIt ? `Contains ${name}` : `Contains ${name}, which has ${word}`,
      matched: names(hits),
    };
  }
  if (aliases.traces.length > 0) {
    const name = aliases.traces[0].name;
    return {
      broken: null,
      unchecked: { icon: 'no_food', text: `Contains ${name}, which can have ${word} in it. You avoid ${word}.` },
      detail: `Contains ${name}, which can have ${word} in it`,
      matched: names(aliases.traces),
    };
  }
  return PASSED;
}

function checkENumber(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const hits = product.ingredients.filter((item) => same(item.eNumber, rule.target));
  if (hits.length === 0) return PASSED;
  return {
    broken: { icon: 'science', text: `Contains ${rule.target.toUpperCase()} (${hits[0].name}), which you avoid.` },
    unchecked: null,
    detail: `Contains ${hits[0].name}`,
    matched: hits.map((item) => item.name),
  };
}

/**
 * Which nutrition_facts column a nutrient rule's target reads, and its unit.
 * A nutrient rule's target must be one of these words.
 */
const NUTRIENT_COLUMNS: Record<string, { column: NutrientColumn; unit: 'kJ' | 'g' | 'mg' }> = {
  energy: { column: 'energy_kj', unit: 'kJ' },
  protein: { column: 'protein_g', unit: 'g' },
  carbs: { column: 'carbs_g', unit: 'g' },
  sugar: { column: 'sugar_g', unit: 'g' },
  fat: { column: 'fat_g', unit: 'g' },
  'saturated fat': { column: 'sat_fat_g', unit: 'g' },
  fibre: { column: 'fibre_g', unit: 'g' },
  sodium: { column: 'sodium_mg', unit: 'mg' },
};

const BASIS_WORDS: Record<NutritionFacts['basis'], string> = {
  '100g': 'per 100 g',
  '100ml': 'per 100 ml',
  serving: 'per serving',
};

/**
 * An amount moved from the label's unit into the rule's unit, so a sodium
 * limit of 0.4 g can be checked against a label that says 400 mg. Null when
 * the two units cannot be compared (kJ against g).
 */
function inUnit(amount: number, from: string, to: string): number | null {
  if (from === to) return amount;
  if (from === 'mg' && to === 'g') return amount / 1000;
  if (from === 'g' && to === 'mg') return amount * 1000;
  return null;
}

/** Rounds away floating point noise (0.1 + 0.2), so 400 mg is exactly 0.4 g. */
function tidy(amount: number): number {
  return Math.round(amount * 1000) / 1000;
}

function nutrientUnchecked(text: string, detail: string): RuleOutcome {
  return { broken: null, unchecked: { icon: 'nutrition', text }, detail, matched: [] };
}

function checkNutrient(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  const target = rule.target.trim().toLowerCase();
  const nutrient = NUTRIENT_COLUMNS[target];
  const limited = rule.threshold !== null && (rule.operator === 'lte' || rule.operator === 'gte');
  if (!nutrient || !limited) {
    return nutrientUnchecked(`We cannot check your ${rule.target} limit yet.`, 'We cannot check this kind of limit yet');
  }

  if (!product.nutrition) {
    return nutrientUnchecked(
      `We have no nutrition facts for this product, so we could not check your ${target} limit.`,
      'We have no nutrition facts to check it against',
    );
  }

  const listed = product.nutrition.values[nutrient.column];
  if (listed === undefined) {
    return nutrientUnchecked(
      `The nutrition table does not list ${target}, so we could not check your limit.`,
      `The label does not list ${target}`,
    );
  }

  // Compare in the rule's own unit (a rule with no unit uses the label's).
  const unit = rule.unit ?? nutrient.unit;
  const converted = inUnit(listed, nutrient.unit, unit);
  if (converted === null) {
    return nutrientUnchecked(
      `Your ${target} limit is in ${unit}, which we cannot compare with the label's ${nutrient.unit}.`,
      `The label gives ${target} in ${nutrient.unit}`,
    );
  }

  const amount = tidy(converted);
  const limit = rule.threshold as number;
  const basis = BASIS_WORDS[product.nutrition.basis];
  const shown = `${amount} ${unit} ${target} ${basis}`;
  const over = rule.operator === 'lte' && amount > limit;
  const under = rule.operator === 'gte' && amount < limit;
  if (over || under) {
    const comparison = over ? `over your ${limit} ${unit} limit` : `under your ${limit} ${unit} minimum`;
    return {
      broken: { icon: 'nutrition', text: `${capitalise(shown)}, ${comparison}.` },
      unchecked: null,
      detail: capitalise(shown),
      matched: [],
    };
  }
  return { broken: null, unchecked: null, detail: capitalise(shown), matched: [] };
}

/** Checks one rule against the product. */
function checkRule(rule: ProfileRule, product: VerdictProduct): RuleOutcome {
  // Only exclusions can be checked against an ingredient list today.
  if (rule.operator === 'excludes') {
    if (rule.type === 'allergen') return checkAllergen(rule, product);
    if (rule.type === 'ingredient') return checkIngredient(rule, product);
    if (rule.type === 'e_number') return checkENumber(rule, product);
  }

  if (rule.type === 'nutrient') return checkNutrient(rule, product);

  return {
    broken: null,
    unchecked: { icon: 'restaurant', text: `We cannot check your ${rule.target} rule yet.` },
    detail: 'We cannot check this kind of rule yet',
    matched: [],
  };
}

/** Fewer real ingredients than this, and an Open Food Facts list looks cut short. */
export const MIN_COMPLETE_INGREDIENTS = 3;

/**
 * Does this ingredient list look like a whole label? Counts each ingredient
 * once, and leaves out the "milk (declared allergen)" lines added from the
 * allergen tags, because those are not on the label's list. "Nuttikrust"
 * with one ingredient is not a whole label; a rusk has at least flour, fat
 * and sugar.
 */
export function isCompleteList(ingredients: { name: string }[]): boolean {
  const names = new Set(
    ingredients.map((item) => item.name).filter((name) => !name.endsWith('(declared allergen)')),
  );
  return names.size >= MIN_COMPLETE_INGREDIENTS;
}

export function decideVerdict(product: VerdictProduct, rules: ProfileRule[]): Verdict {
  const broken: VerdictReason[] = [];
  const unchecked: VerdictReason[] = [];
  const checks: RuleCheck[] = [];

  if (product.ingredients.length === 0) {
    // Nothing to check against. Every rule is unknown, not passed.
    unchecked.push({
      icon: 'info',
      text: 'We have no ingredient list for this product, so we could not check your rules.',
    });
    for (const rule of rules) {
      checks.push({ label: ruleLabel(rule), outcome: 'unchecked', detail: 'We have no ingredient list', matched: [] });
    }
  } else {
    for (const rule of rules) {
      const outcome = checkRule(rule, product);
      if (outcome.broken) broken.push(outcome.broken);
      if (outcome.unchecked) unchecked.push(outcome.unchecked);
      checks.push({
        label: ruleLabel(rule),
        outcome: outcome.broken ? 'broken' : outcome.unchecked ? 'unchecked' : 'met',
        detail: outcome.detail,
        matched: outcome.matched,
      });
    }
  }

  // An Open Food Facts list (never a photo read) is trusted when complete.
  // A thin one cannot be Safe for anyone.
  const fromOpenFoodFacts = product.fromOpenFoodFacts === true && !product.readFromLabel;
  const trusted = product.verified || (fromOpenFoodFacts && isCompleteList(product.ingredients));
  if (fromOpenFoodFacts && !trusted) {
    unchecked.push({ icon: 'info', text: 'The ingredient list from Open Food Facts looks incomplete.' });
  }

  // A label the reader was not sure of may have a word wrong or missing, so
  // it cannot be Safe. A rule it plainly breaks still makes it Not safe.
  if (product.readFromLabel && (product.readConfidence === 'low' || product.readConfidence === 'medium')) {
    unchecked.push({
      icon: 'info',
      text: 'The label photo was hard to read, so we may have missed or misread an ingredient.',
    });
  }

  // A severe allergy is where a misread label does the most harm, so for
  // that profile a list our team has not checked still cannot be Safe.
  const hasSevereRule = rules.some((rule) => rule.severity === 'severe');
  const capped = !trusted && hasSevereRule;

  // With no rules, nothing can be broken, and a missing or misread list
  // cannot hide a broken rule either, so it is Safe. capped is already false.
  const noRules = rules.length === 0;

  let state: VerdictState;
  if (broken.length > 0) state = 'unsafe';
  else if (noRules) state = 'safe';
  else if (unchecked.length > 0 || capped) state = 'caution';
  else state = 'safe';

  const safeText = noRules
    ? 'You have no rules set yet, so nothing on this product goes against them.'
    : 'None of your rules matched the ingredient list.';
  let reasons =
    state === 'safe' ? [{ icon: 'task_alt', text: safeText }] : [...broken, ...unchecked].slice(0, MAX_REASONS);

  // Every verdict on an unverified list says so, last, and the reason limit
  // never cuts it off. It is saved with the scan, so a reopened scan says it too.
  if (!trusted) {
    const notChecked = product.readFromLabel
      ? 'We read this list from your photo, and our team has not checked it yet.'
      : 'Our team has not checked this ingredient list yet.';
    const text = capped && state === 'caution' ? `${notChecked} You marked an allergy as severe, so we cannot call it Safe.` : notChecked;
    reasons = [...reasons.slice(0, MAX_REASONS - 1), { icon: 'info', text }];
  }

  return { state, reasons, rulesChecked: rules.length, checks };
}
