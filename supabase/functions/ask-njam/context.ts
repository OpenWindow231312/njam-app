/**
 * Everything Ask Njam needs to know about the person, read by the function
 * itself.
 *
 * The app never sends rules, scans or past messages. If it did, a changed
 * app (or anyone with a token) could tell Njam "I have no allergies". So the
 * function makes its own Supabase client with the person's JWT, and Row
 * Level Security limits every read and write to their own household and
 * their own conversations, exactly as it does for the app.
 */
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

import type { AskBlock } from './validate.ts';

/** How many recent scans and earlier messages Gemini sees. Enough for context, cheap to send. */
const RECENT_SCANS = 8;
const HISTORY_MESSAGES = 12;
/** The catalogue is 25 products today. This cap keeps the prompt small if it grows. */
const CATALOGUE_LIMIT = 150;

export type Rule = {
  type: string;
  target: string;
  operator: string;
  threshold: number | null;
  unit: string | null;
  severity: string | null;
};

export type CatalogueLine = { id: string; line: string };

export type HistoryMessage = { role: 'user' | 'assistant'; blocks: AskBlock[] };

/** A Supabase client that acts as the person who called the function. */
export function clientFor(authHeader: string): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

export async function readPerson(db: SupabaseClient, jwt: string) {
  const { data: auth, error: authError } = await db.auth.getUser(jwt);
  if (authError || !auth.user) throw new Error('No signed-in user');

  const { data: user, error } = await db
    .from('users')
    .select('id, display_name, household_id')
    .eq('id', auth.user.id)
    .single();
  if (error) throw error;
  return { id: user.id as string, name: user.display_name as string, householdId: user.household_id as string | null };
}

/** The household's default profile and its rules, chosen the same way the app chooses it. */
export async function readRules(db: SupabaseClient, householdId: string | null): Promise<{ profileName: string; rules: Rule[] }> {
  if (!householdId) return { profileName: 'you', rules: [] };
  const { data, error } = await db
    .from('diet_profiles')
    .select('name, profile_rules ( type, target, operator, threshold, unit, severity )')
    .eq('household_id', householdId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { profileName: 'you', rules: [] };
  return { profileName: data.name, rules: data.profile_rules as Rule[] };
}

/** "allergen milk, marked severe" or "nutrient sugar, at most 10 g". */
export function describeRule(rule: Rule): string {
  if (rule.threshold !== null) {
    const comparison = rule.operator === 'gte' ? 'at least' : 'at most';
    return `${rule.type} ${rule.target}, ${comparison} ${rule.threshold} ${rule.unit ?? ''}`.trim();
  }
  return rule.severity ? `${rule.type} ${rule.target}, marked ${rule.severity}` : `${rule.type} ${rule.target}, avoided`;
}

/** The latest scans, with the verdict and reasons the rules engine gave each. */
export async function readRecentScans(db: SupabaseClient): Promise<string[]> {
  const { data, error } = await db
    .from('scans')
    .select('verdict, reasons, scanned_at, product_id, products ( name, brand )')
    .order('scanned_at', { ascending: false })
    .limit(RECENT_SCANS);
  if (error) throw error;

  return (data ?? []).map((scan) => {
    const product = scan.products as unknown as { name: string; brand: string | null } | null;
    const name = product ? [product.brand, product.name].filter(Boolean).join(' ') : 'a product read from a label photo';
    const reasons = (scan.reasons as { text: string }[]).map((reason) => reason.text).join(' ');
    const id = scan.product_id ? ` (id ${scan.product_id})` : '';
    return `${name}${id}: ${scan.verdict}. ${reasons}`;
  });
}

type IngredientRow = {
  name: string;
  e_number: string | null;
  allergen: { slug: string } | null;
  canonical: { allergen: { slug: string } | null } | null;
};

/** One line per catalogue product, so Gemini can pick real ids and read their ingredients. */
export async function readCatalogue(db: SupabaseClient): Promise<CatalogueLine[]> {
  const { data, error } = await db
    .from('products')
    .select(
      `id, name, brand, verified,
       product_ingredients ( position, ingredients ( name, e_number,
         allergen:allergen_id ( slug ), canonical:canonical_id ( allergen:allergen_id ( slug ) ) ) )`,
    )
    .order('name')
    .limit(CATALOGUE_LIMIT);
  if (error) throw error;

  return (data ?? []).map((product) => {
    const links = product.product_ingredients as unknown as { position: number; ingredients: IngredientRow | null }[];
    const ingredients = [...links]
      .sort((a, b) => a.position - b.position)
      .flatMap((link) => (link.ingredients ? [link.ingredients] : []))
      .map((item) => {
        // The same fallback as the app: an alias with no allergen of its own
        // still carries its canonical ingredient's allergen.
        const allergen = item.allergen?.slug ?? item.canonical?.allergen?.slug;
        const tags = [allergen, item.e_number].filter(Boolean).join(', ');
        return tags ? `${item.name} (${tags})` : item.name;
      });
    const name = [product.brand, product.name].filter(Boolean).join(' ');
    const checked = product.verified ? '' : ' [not verified]';
    return { id: product.id, line: `${product.id} | ${name}${checked} | ${ingredients.join(', ') || 'no ingredient list'}` };
  });
}

/**
 * The conversation's latest messages, oldest first. Returns null when the
 * conversation does not exist or is not the caller's (RLS hides it).
 */
export async function readHistory(db: SupabaseClient, conversationId: string): Promise<HistoryMessage[] | null> {
  const { data: conversation, error: conversationError } = await db
    .from('chat_conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle();
  if (conversationError) throw conversationError;
  if (!conversation) return null;

  const { data, error } = await db
    .from('chat_messages')
    .select('role, blocks')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_MESSAGES);
  if (error) throw error;
  return (data as HistoryMessage[]).reverse();
}

/**
 * Saves one exchange. Starts the conversation first if this is its first
 * message. Both inserts run as the person, so RLS checks them too.
 */
export async function saveExchange(
  db: SupabaseClient,
  conversationId: string | null,
  message: string,
  askedAt: Date,
  blocks: AskBlock[],
): Promise<string> {
  let id = conversationId;

  if (!id) {
    // The first question, shortened, is the conversation's name in the menu.
    const title = message.length > 60 ? `${message.slice(0, 57).trimEnd()}...` : message;
    const { data, error } = await db.from('chat_conversations').insert({ title }).select('id').single();
    if (error) throw error;
    id = data.id as string;
  }

  // Explicit times, so the question always sorts before its answer.
  const { error: messageError } = await db.from('chat_messages').insert([
    { conversation_id: id, role: 'user', blocks: [{ type: 'text', text: message }], created_at: askedAt.toISOString() },
    { conversation_id: id, role: 'assistant', blocks, created_at: new Date().toISOString() },
  ]);
  if (messageError) throw messageError;

  const { error: touchError } = await db
    .from('chat_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
  if (touchError) throw touchError;

  return id;
}
