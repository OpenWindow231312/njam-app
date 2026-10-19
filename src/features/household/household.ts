/**
 * Reading and changing your household, for the Household tab on Profile.
 *
 * Reads go straight to the tables; RLS limits them to your own household.
 * Anything that moves a person between households, or changes a role, is a
 * database function (see 20261018120000_household_and_settings.sql), because
 * the app itself may not change users.household_id or users.role. Each of
 * those functions checks for itself that you are allowed.
 */
import { supabase } from '@/lib/supabase';
import type { Role } from '@/features/auth/AuthProvider';
import type { ProfileRule } from '@/services/verdict';

/** The switches only the owner may change. Column names, as in the households table. */
export type HouseholdSwitch =
  | 'members_edit_own_rules'
  | 'members_edit_others'
  | 'only_owner_invites'
  | 'members_save_products'
  | 'share_scan_history';

/**
 * Someone the household checks food for. A person with an account has a
 * userId; someone without a phone (a child, a parent you shop for) is only
 * a diet profile.
 */
export type HouseholdPerson = {
  userId: string | null;
  profileId: string | null;
  name: string;
  /** null for someone without a phone. */
  role: Role | null;
  rules: ProfileRule[];
};

export type Invite = {
  /** As stored: eight capitals, no space. */
  code: string;
  expiresAt: string;
};

export type Household = {
  id: string;
  name: string;
  switches: Record<HouseholdSwitch, boolean>;
  people: HouseholdPerson[];
  invite: Invite | null;
  savedCount: number;
};

const SWITCH_COLUMNS =
  'members_edit_own_rules, members_edit_others, only_owner_invites, members_save_products, share_scan_history';

export async function fetchHousehold(householdId: string): Promise<Household> {
  const [household, users, profiles, invite, saved] = await Promise.all([
    supabase.from('households').select(`id, name, ${SWITCH_COLUMNS}`).eq('id', householdId).single(),
    supabase.from('users').select('id, display_name, role').eq('household_id', householdId).order('created_at'),
    supabase
      .from('diet_profiles')
      .select('id, name, user_id, profile_rules ( type, target, operator, threshold, unit, severity )')
      .eq('household_id', householdId)
      .order('created_at'),
    supabase.from('household_invites').select('code, expires_at').eq('household_id', householdId).maybeSingle(),
    supabase.from('saved_products').select('product_id', { count: 'exact', head: true }).eq('household_id', householdId),
  ]);
  // One at a time, so TypeScript knows each one's data is there afterwards.
  if (household.error) throw household.error;
  if (users.error) throw users.error;
  if (profiles.error) throw profiles.error;
  if (invite.error) throw invite.error;
  if (saved.error) throw saved.error;

  // Everyone with an account, each with their own profile's rules...
  const people: HouseholdPerson[] = users.data.map((user) => {
    const own = profiles.data.find((profile) => profile.user_id === user.id);
    return {
      userId: user.id,
      profileId: own?.id ?? null,
      name: user.display_name,
      role: user.role,
      rules: (own?.profile_rules ?? []) as ProfileRule[],
    };
  });
  // ...then everyone without a phone: profiles that belong to no account.
  for (const profile of profiles.data.filter((row) => row.user_id === null)) {
    people.push({
      userId: null,
      profileId: profile.id,
      name: profile.name,
      role: null,
      rules: profile.profile_rules as ProfileRule[],
    });
  }

  const { id, name, ...switches } = household.data;
  return {
    id,
    name,
    switches: switches as Record<HouseholdSwitch, boolean>,
    people,
    invite: invite.data ? { code: invite.data.code, expiresAt: invite.data.expires_at } : null,
    savedCount: saved.count ?? 0,
  };
}

export async function setHouseholdSwitch(householdId: string, column: HouseholdSwitch, value: boolean) {
  const { error } = await supabase.from('households').update({ [column]: value }).eq('id', householdId);
  if (error) throw error;
}

/** Makes a new invite code, replacing the old one. Returns the code. */
export async function createInvite(): Promise<string> {
  const { data, error } = await supabase.rpc('create_household_invite');
  if (error) throw error;
  return data as string;
}

/** "4F8A21C9" shown as "4F8A 21C9", so it is easier to read out. */
export function formatInviteCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

/**
 * The database explains why a household change was refused in plain words
 * ("Hand over your household before you leave it."). This passes them on.
 */
export class HouseholdError extends Error {}

async function call(fn: string, args?: Record<string, unknown>) {
  const { error } = await supabase.rpc(fn, args);
  // P0001 is a "raise exception" from the function itself, written for
  // people to read. Anything else (no connection) is passed on as it is.
  if (error) throw error.code === 'P0001' ? new HouseholdError(error.message) : error;
}

export const joinHousehold = (code: string) => call('join_household', { invite_code: code });
export const leaveHousehold = () => call('leave_household');
export const removeMember = (userId: string) => call('remove_member', { person: userId });
export const handOverOwnership = (userId: string) => call('hand_over_ownership', { new_owner: userId });
export const deleteHousehold = () => call('delete_household');

/** Someone without a phone: a diet profile with no account behind it. */
export async function addPersonWithoutPhone(householdId: string, name: string) {
  const { error } = await supabase.from('diet_profiles').insert({ household_id: householdId, name: name.trim() });
  if (error) throw error;
}

export async function deleteProfile(profileId: string) {
  const { error } = await supabase.from('diet_profiles').delete().eq('id', profileId);
  if (error) throw error;
}
