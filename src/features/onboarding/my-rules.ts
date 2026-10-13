/**
 * Reading and saving the rules a person sets in onboarding.
 *
 * Onboarding edits three kinds of rule, all of which the verdict engine can
 * check against an ingredient list today: allergies (with severity),
 * ingredients you avoid and E-numbers you avoid. Any other rule on the
 * profile (a nutrient limit, a diet) is left exactly as it is.
 */
import { supabase } from '@/lib/supabase';
import type { ProfileRule } from '@/services/verdict';

/** The rule types onboarding owns. Every other type is never touched here. */
const ONBOARDING_TYPES = ['allergen', 'ingredient', 'e_number'];

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
  const profileId = await myProfileId(userId, householdId, name);
  const { data, error } = await supabase
    .from('profile_rules')
    .select('id, type, target, severity')
    .eq('diet_profile_id', profileId)
    .eq('operator', 'excludes')
    .in('type', ONBOARDING_TYPES);
  if (error) throw error;

  const rules: MyRules = { profileId, allergies: {}, ingredients: [], eNumbers: [], existingIds: [] };
  for (const row of data) {
    rules.existingIds.push(row.id);
    if (row.type === 'allergen') {
      // "mild" is allowed by the database but not offered here; it reads as "avoid".
      rules.allergies[row.target] = row.severity === 'mild' ? null : row.severity;
    } else if (row.type === 'ingredient') {
      rules.ingredients.push(row.target.toLowerCase());
    } else {
      rules.eNumbers.push(row.target.toUpperCase());
    }
  }
  return rules;
}

/** The rows to write, in the shape of profile_rules. */
function toRows(rules: MyRules): (ProfileRule & { diet_profile_id: string })[] {
  const base = { diet_profile_id: rules.profileId, operator: 'excludes' as const, threshold: null, unit: null };
  return [
    ...Object.entries(rules.allergies).map(([slug, severity]) => ({
      ...base,
      type: 'allergen',
      target: slug,
      severity,
    })),
    ...rules.ingredients.map((target) => ({ ...base, type: 'ingredient', target, severity: null })),
    ...rules.eNumbers.map((target) => ({ ...base, type: 'e_number', target, severity: null })),
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
export async function saveMyRules(rules: MyRules): Promise<void> {
  const rows = toRows(rules);
  if (rows.length > 0) {
    const inserted = await supabase.from('profile_rules').insert(rows);
    if (inserted.error) throw inserted.error;
  }
  if (rules.existingIds.length > 0) {
    const removed = await supabase.from('profile_rules').delete().in('id', rules.existingIds);
    if (removed.error) throw removed.error;
  }
}
