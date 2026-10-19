/**
 * delete-account: deletes the signed-in person's account for good.
 *
 * POST, no body, signed-in users only (verify_jwt is on).
 *   200 { "ok": true }
 *   409 { "ok": false, "error": { "code": "hand_over_first", ... } }
 *
 * Why a function and not the app: removing a login from auth.users needs the
 * service role key, and that key never goes in the app (CLAUDE.md). The
 * function first works out who is asking from their own JWT, so nobody can
 * delete somebody else's account by changing the request.
 *
 * What goes:
 *   - the person's own diet profiles and rules, so they do not stay behind in
 *     the household as a profile without a phone;
 *   - their household, if nobody else is in it;
 *   - their login, which cascades to public.users and from there to their
 *     scans, settings, saves and invite codes (all "on delete cascade").
 *
 * An owner who still shares their household is stopped: they hand it over
 * first, so nobody is left in a household without an owner.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

// Lets the Expo web preview call the function from the browser.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, code: string, message: string): Response {
  return reply(status, { ok: false, error: { code, message } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return fail(401, 'not_signed_in', 'Sign in first.');

  // The service role client skips RLS, so every query below names the person
  // explicitly, and that person comes only from their verified JWT.
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth.user) return fail(401, 'not_signed_in', 'Sign in first.');
  const userId = auth.user.id;

  try {
    const { data: person, error: personError } = await admin
      .from('users')
      .select('household_id, role')
      .eq('id', userId)
      .maybeSingle();
    if (personError) throw personError;

    if (person?.household_id) {
      const { count, error: countError } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('household_id', person.household_id)
        .neq('id', userId);
      if (countError) throw countError;
      const othersInHousehold = (count ?? 0) > 0;

      if (othersInHousehold && (person.role === 'owner' || person.role === 'admin')) {
        return fail(409, 'hand_over_first', 'Hand over your household before you delete your account.');
      }

      const profiles = await admin.from('diet_profiles').delete().eq('user_id', userId);
      if (profiles.error) throw profiles.error;

      if (!othersInHousehold) {
        const household = await admin.from('households').delete().eq('id', person.household_id);
        if (household.error) throw household.error;
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return reply(200, { ok: true });
  } catch (error) {
    console.error('delete-account failed', error);
    return fail(500, 'failed', 'We could not delete your account. Try again.');
  }
});
