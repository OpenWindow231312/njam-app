/**
 * The two "your data" actions on the Settings tab.
 *
 *   collectMyData()  - everything Njam keeps about you, as readable JSON, for
 *                      "Download my data". Read with your own session, so
 *                      RLS gives back exactly your rows and nobody else's.
 *   deleteMyAccount() - asks the delete-account Edge Function to delete you.
 *                      The app cannot do it itself: removing a login needs the
 *                      service role key, which never ships in the app.
 */
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

export async function collectMyData(userId: string, email: string | undefined): Promise<string> {
  const [person, profiles, scans, saved, settings] = await Promise.all([
    supabase.from('users').select('display_name, role, created_at').eq('id', userId).single(),
    supabase
      .from('diet_profiles')
      .select('name, created_at, profile_rules ( type, target, operator, threshold, unit, severity )')
      .eq('user_id', userId),
    supabase
      .from('scans')
      .select('barcode, verdict, reasons, scanned_at')
      .eq('user_id', userId)
      .order('scanned_at', { ascending: false }),
    supabase.from('saved_products').select('created_at, products ( name, brand, barcode )').eq('saved_by', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  for (const result of [person, profiles, scans, saved, settings]) {
    if (result.error) throw result.error;
  }

  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: { ...person.data, email },
      rules: profiles.data,
      scans: scans.data,
      savedProducts: saved.data,
      settings: settings.data,
    },
    null,
    2,
  );
}

type DeleteReply = { ok: true } | { ok: false; error: { code: string; message: string } };

/** "hand-over-first": you own a household other people are still in. */
export async function deleteMyAccount(): Promise<'deleted' | 'hand-over-first'> {
  const { data, error } = await supabase.functions.invoke<DeleteReply>('delete-account', { body: {} });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const body = (await error.context.json().catch(() => null)) as DeleteReply | null;
      if (body && !body.ok && body.error.code === 'hand_over_first') return 'hand-over-first';
    }
    throw error;
  }
  if (!data?.ok) throw new Error('delete-account did not confirm the delete');
  return 'deleted';
}
