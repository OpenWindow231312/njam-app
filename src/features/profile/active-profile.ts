/**
 * The diet profile a scan is checked against, with its rules.
 *
 * For now this is the household's default profile. When the Household screen
 * lands, the profile chosen there replaces it, and the scanner's scope pill
 * already shows whichever profile this returns.
 */
import { supabase } from '@/lib/supabase';
import type { ProfileRule } from '@/services/verdict';

export type ActiveProfile = {
  id: string;
  name: string;
  rules: ProfileRule[];
};

export async function fetchActiveProfile(householdId: string): Promise<ActiveProfile | null> {
  const { data, error } = await supabase
    .from('diet_profiles')
    .select('id, name, profile_rules ( type, target, operator, threshold, unit, severity )')
    .eq('household_id', householdId)
    // The default profile first; if there is none, the oldest one.
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { id: data.id, name: data.name, rules: data.profile_rules as ProfileRule[] };
}

/**
 * Every profile in the household, the default first, for "Viewing for" on
 * the Verdict screen. RLS limits it to your own household.
 */
export async function fetchHouseholdProfiles(householdId: string): Promise<ActiveProfile[]> {
  const { data, error } = await supabase
    .from('diet_profiles')
    .select('id, name, profile_rules ( type, target, operator, threshold, unit, severity )')
    .eq('household_id', householdId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map((row) => ({ id: row.id, name: row.name, rules: row.profile_rules as ProfileRule[] }));
}
