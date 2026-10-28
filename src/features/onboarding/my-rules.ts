/**
 * Reading and saving the rules a person sets in onboarding.
 *
 * Onboarding edits five kinds of rule: allergies (with severity),
 * ingredients and E-numbers you avoid, diets, and nutrient limits.
 *
 * A diet (halaal, vegan) is saved as one "diet" row per thing it rules out,
 * targeted "halaal/gelatine", plus the ingredient, E-number and allergen rows
 * for that thing. The engine skips the diet rows and checks the others. On
 * loading, the rows a diet added are folded back into the diet, so they do
 * not also show as rules you picked one by one.
 *
 * Any other rule on the profile (a nutrient minimum, a rule type added later)
 * is left exactly as it is.
 */
import { supabase } from '@/lib/supabase';
import { DIET_PRESETS, NUTRIENT_OPTIONS, type DietItem } from '@/features/onboarding/rule-options';
import type { ProfileRule } from '@/services/verdict';

/** The rule types onboarding owns. Every other type is never touched here. */
const ONBOARDING_TYPES = ['allergen', 'ingredient', 'e_number', 'diet', 'nutrient'];

/** How strict an allergy is. Null means "I avoid it" with no severity. */
export type AllergySeverity = 'moderate' | 'severe' | null;

export type MyRules = {
  profileId: string;
  /** Allergen slug ("milk") to its severity. */
  allergies: Record<string, AllergySeverity>;
  /** Lower case, as the engine compares them: "palm oil". */
  ingredients: string[];
  /** Upper case: "E621". */
  eNumbers: string[];
  /** A diet's key ("halaal") to the keys of the things it rules out that are ticked. */
  diets: Record<string, string[]>;
  /** A nutrient ("sugar") to its most per 100 g, in that nutrient's unit. */
  limits: Record<string, number>;
  /** Ids of the rows above as they were loaded, so saving can replace them. */
  existingIds: string[];
};

/**
 * Your own profile: the one linked to your account, the default first.
 * Sign-up always makes one, but an older account may not have it, so it is
 * created here if missing.
 */
async function myProfileId(userId: string, householdId: string, name: string): Promise<string> {
  const { data, error } = await supabase
    .from('diet_profiles')
    .select('id')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.id;

  const created = await supabase
    .from('diet_profiles')
    .insert({ household_id: householdId, user_id: userId, name, is_default: true })
    .select('id')
    .single();
  if (created.error) throw created.error;
  return created.data.id;
}

export async function loadMyRules(userId: string, householdId: string, name: string): Promise<MyRules> {
  return loadRules(await myProfileId(userId, householdId, name));
}

/**
 * The rules on any profile in your household. Used directly for someone
 * without a phone, whose rules are set from the Household tab.
 */
export async function loadRules(profileId: string): Promise<MyRules> {
  const { data, error } = await supabase
    .from('profile_rules')
    .select('id, type, target, operator, threshold, severity')
    .eq('diet_profile_id', profileId)
    .in('type', ONBOARDING_TYPES);
  if (error) throw error;

  const rules: MyRules = {
    profileId,
    allergies: {},
    ingredients: [],
    eNumbers: [],
    diets: {},
    limits: {},
    existingIds: [],
  };
  for (const row of data) {
    if (row.type === 'nutrient') {
      // Only a limit ("at most") on a nutrient onboarding offers is ours.
      const offered = NUTRIENT_OPTIONS.some((option) => option.target === row.target);
      if (row.operator !== 'lte' || !offered || row.threshold === null) continue;
      rules.limits[row.target] = Number(row.threshold);
    } else if (row.type === 'diet') {
      const [diet, item] = row.target.split('/');
      rules.diets[diet] = [...(rules.diets[diet] ?? []), item];
    } else if (row.operator !== 'excludes') {
      continue;
    } else if (row.type === 'allergen') {
      // "mild" is allowed by the database but not offered here; it reads as "avoid".
      rules.allergies[row.target] = row.severity === 'mild' ? null : row.severity;
    } else if (row.type === 'ingredient') {
      rules.ingredients.push(row.target.toLowerCase());
    } else {
      rules.eNumbers.push(row.target.toUpperCase());
    }
    rules.existingIds.push(row.id);
  }
  return withoutDietRows(rules);
}

/** The things a diet rules out that are ticked. */
export function dietItems(rules: MyRules, dietKey: string): DietItem[] {
  const preset = DIET_PRESETS.find((diet) => diet.key === dietKey);
  const ticked = rules.diets[dietKey] ?? [];
  return preset ? preset.items.filter((item) => ticked.includes(item.key)) : [];
}

/** Every ticked thing across all your diets. */
function allDietItems(rules: MyRules): DietItem[] {
  return Object.keys(rules.diets).flatMap((key) => dietItems(rules, key));
}

/**
 * Takes the rows a diet added back out of the lists you pick one by one. An
 * allergen is only taken out when it is plain "Avoid": one you gave a level
 * yourself stays an allergy of yours.
 */
function withoutDietRows(rules: MyRules): MyRules {
  const items = allDietItems(rules);
  const ingredients = new Set(items.flatMap((item) => item.ingredients));
  const eNumbers = new Set(items.flatMap((item) => item.eNumbers));
  const allergens = new Set(items.flatMap((item) => item.allergens));
  const allergies = { ...rules.allergies };
  for (const slug of allergens) if (allergies[slug] === null) delete allergies[slug];
  return {
    ...rules,
    allergies,
    ingredients: rules.ingredients.filter((name) => !ingredients.has(name)),
    eNumbers: rules.eNumbers.filter((code) => !eNumbers.has(code)),
  };
}

/** The rows to write, in the shape of profile_rules. Also what the ready screen lists. */
export function toRows(rules: MyRules): (ProfileRule & { diet_profile_id: string })[] {
  const base = { diet_profile_id: rules.profileId, operator: 'excludes' as const, threshold: null, unit: null };

  // What your diets rule out joins what you picked yourself, each once.
  const items = allDietItems(rules);
  const ingredients = new Set([...rules.ingredients, ...items.flatMap((item) => item.ingredients)]);
  const eNumbers = new Set([...rules.eNumbers, ...items.flatMap((item) => item.eNumbers)]);
  const allergies = { ...rules.allergies };
  for (const slug of items.flatMap((item) => item.allergens)) if (!(slug in allergies)) allergies[slug] = null;

  return [
    ...Object.entries(allergies).map(([slug, severity]) => ({
      ...base,
      type: 'allergen',
      target: slug,
      severity,
    })),
    ...[...ingredients].map((target) => ({ ...base, type: 'ingredient', target, severity: null })),
    ...[...eNumbers].map((target) => ({ ...base, type: 'e_number', target, severity: null })),
    ...Object.entries(rules.diets).flatMap(([diet, ticked]) =>
      ticked.map((item) => ({ ...base, operator: 'requires' as const, type: 'diet', target: `${diet}/${item}`, severity: null })),
    ),
    ...Object.entries(rules.limits).map(([target, threshold]) => ({
      ...base,
      operator: 'lte' as const,
      type: 'nutrient',
      target,
      threshold,
      unit: NUTRIENT_OPTIONS.find((option) => option.target === target)?.unit ?? null,
      severity: null,
    })),
  ];
}

/**
 * Replaces the onboarding rules on your profile with these.
 *
 * The new rows are written BEFORE the old ones are removed. If the insert
 * fails, your old rules are still there. If the delete fails, you briefly
 * have both, which is stricter, not looser. The other order could leave you
 * with no allergies on file, and a scan would then come back Safe for
 * something you cannot eat.
 */
export async function saveMyRules(rules: MyRules): Promise<MyRules> {
  const rows = toRows(rules);
  let newIds: string[] = [];
  if (rows.length > 0) {
    const inserted = await supabase.from('profile_rules').insert(rows).select('id');
    if (inserted.error) throw inserted.error;
    newIds = inserted.data.map((row) => row.id);
  }
  if (rules.existingIds.length > 0) {
    const removed = await supabase.from('profile_rules').delete().in('id', rules.existingIds);
    if (removed.error) throw removed.error;
  }
  // The saved rows are now the existing ones, so saving again (a retry)
  // replaces them rather than adding a second copy.
  return { ...rules, existingIds: newIds };
}
