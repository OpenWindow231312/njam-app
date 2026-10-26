/**
 * import-open-food-facts: copies products from Open Food Facts into the
 * shared catalogue. Two ways in:
 *
 * POST { "page": 1 }, admins only (verify_jwt is on, and the role is checked).
 *   One page of South African products, for the bulk import.
 *   200 { "ok": true, "data": { page, pageCount, found, imported, alreadyThere, skipped, failed } }
 *   502 { "ok": false, "error": { "code": "open_food_facts_busy", ... } }
 *
 * POST { "barcode": "6001087340366" }, anyone signed in.
 *   One product the scanner did not find in our catalogue. It is saved the
 *   same way as the bulk import, so the next scan finds it straight away.
 *   200 { "ok": true, "data": { productId } }    productId is null when Open
 *       Food Facts does not know it, or has no ingredient list for it.
 *
 * One page is 50 products, found in two steps:
 *   1. Open Food Facts' search service (search.openfoodfacts.org) lists the
 *      barcodes. It only knows ingredients as a short tag list, without the
 *      label's wording or order, which is not enough to check an allergy.
 *   2. So each product's full record is then fetched from the product API,
 *      one at a time with a short pause, as Open Food Facts asks (about 100
 *      product reads a minute).
 * scripts/import-open-food-facts.mjs calls this once per page.
 *
 * Why a function and not the app: import_product needs the service role key,
 * which never goes in the app (CLAUDE.md). Every product goes in unverified.
 * The verdict engine decides a complete one like a verified one, and keeps a
 * thin one (fewer than three ingredients) at Caution.
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'npm:@supabase/supabase-js@2';

import { FIELDS, mapProduct } from './map.ts';

const SEARCH = 'https://search.openfoodfacts.org/search';
const PRODUCT = 'https://world.openfoodfacts.org/api/v2/product';
const PAGE_SIZE = 50;
const TIMEOUT_MS = 20_000;
/** Between product reads, to stay under Open Food Facts' 100 a minute. */
const PAUSE_MS = 650;
// Open Food Facts asks every app to name itself.
const HEADERS = { 'User-Agent': 'Njam/1.0 (DV300 student project)' };

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

/** JSON from Open Food Facts, or null if it is busy, slow or not JSON. */
// deno-lint-ignore no-explicit-any
async function getJson(url: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: HEADERS, signal: controller.signal });
    // When it is busy it answers with an HTML page, not JSON.
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * One page of barcodes: South African products whose ingredient list Open
 * Food Facts marks as complete. Sorted by when they were added, so the pages
 * stay in the same order from one call to the next.
 */
async function fetchBarcodes(page: number): Promise<{ codes: string[]; pageCount: number } | null> {
  const params = new URLSearchParams({
    q: 'countries_tags:"en:south-africa" AND states_tags:"en:ingredients-completed"',
    fields: 'code',
    sort_by: 'created_t',
    page_size: String(PAGE_SIZE),
    page: String(page),
  });
  const body = await getJson(`${SEARCH}?${params}`);
  if (!body || !Array.isArray(body.hits)) return null;
  return {
    codes: body.hits.map((hit: { code?: unknown }) => String(hit.code ?? '')),
    pageCount: Number(body.page_count) || 0,
  };
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// deno-lint-ignore no-explicit-any
type Admin = any;

/** The id of the product with this barcode in our catalogue, or null. */
async function existingId(admin: Admin, code: string): Promise<string | null> {
  const { data } = await admin.from('products').select('id').eq('barcode', code).maybeSingle();
  return data?.id ?? null;
}

/** What happened to one barcode. */
type Outcome =
  | { kind: 'imported'; id: string }
  | { kind: 'already'; id: string }
  | { kind: 'skipped'; reason: string }
  | { kind: 'failed' };

/**
 * The full product record, or null if Open Food Facts did not give it. A
 * busy answer is tried once more after a short wait; a product still
 * missing is picked up the next time the import runs.
 */
async function fetchProduct(code: string) {
  const url = `${PRODUCT}/${encodeURIComponent(code)}.json?fields=${FIELDS}`;
  const body = (await getJson(url)) ?? (await pause(2_000), await getJson(url));
  return body?.status === 1 && body.product ? body.product : null;
}

/**
 * Fetches one product from Open Food Facts and saves it, unless it is
 * already in the catalogue or too incomplete to save.
 */
async function importOne(admin: Admin, code: string): Promise<Outcome> {
  const product = await fetchProduct(code);
  if (!product) return { kind: 'skipped', reason: 'not_found' };

  const mapped = mapProduct(product);
  if (!mapped.ok) return { kind: 'skipped', reason: mapped.reason };

  const { data, error } = await admin.rpc('import_product', mapped.args);
  if (error) {
    console.error('import_product failed', mapped.args.p_barcode, error.message);
    return { kind: 'failed' };
  }
  // null: someone saved this barcode while we were fetching it.
  if (data === null) {
    const id = await existingId(admin, code);
    return id ? { kind: 'already', id } : { kind: 'failed' };
  }
  return { kind: 'imported', id: data };
}

/** The scanner's way in: one barcode, for anyone signed in. */
async function importBarcode(admin: Admin, barcode: unknown): Promise<Response> {
  const code = typeof barcode === 'string' ? barcode.trim() : '';
  if (!/^\d{8,14}$/.test(code)) return fail(400, 'bad_request', 'Send { "barcode": "6001087340366" }.');

  const id = await existingId(admin, code);
  if (id) return reply(200, { ok: true, data: { productId: id } });

  const outcome = await importOne(admin, code);
  const productId = outcome.kind === 'imported' || outcome.kind === 'already' ? outcome.id : null;
  return reply(200, { ok: true, data: { productId } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return fail(405, 'method_not_allowed', 'Use POST.');

  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!jwt) return fail(401, 'not_signed_in', 'Sign in first.');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  const { data: auth, error: authError } = await admin.auth.getUser(jwt);
  if (authError || !auth.user) return fail(401, 'not_signed_in', 'Sign in first.');

  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'bad_request', 'Send { "page": 1 } or { "barcode": "..." }.');
  }

  // One barcode from the scanner: anyone signed in. What is saved comes from
  // Open Food Facts, never from the person scanning.
  if (body?.barcode !== undefined) return importBarcode(admin, body.barcode);

  // A whole page: only an admin may fill the shared catalogue in bulk. The
  // role comes from the database, looked up by the id in their own verified JWT.
  const { data: person } = await admin.from('users').select('role').eq('id', auth.user.id).maybeSingle();
  if (person?.role !== 'admin') return fail(403, 'admins_only', 'Only an admin can import products.');

  const page = Number(body?.page);
  if (!Number.isInteger(page) || page < 1) return fail(400, 'bad_request', 'Send { "page": 1 }.');

  const found = await fetchBarcodes(page);
  if (!found) return fail(502, 'open_food_facts_busy', 'Open Food Facts did not answer. Wait a minute and try again.');

  const counts = { imported: 0, alreadyThere: 0, skipped: {} as Record<string, number>, failed: 0 };
  for (const code of found.codes) {
    // Already in the catalogue: no need to ask Open Food Facts for it.
    const { count } = await admin.from('products').select('id', { count: 'exact', head: true }).eq('barcode', code);
    if (count) {
      counts.alreadyThere += 1;
      continue;
    }

    // One at a time, each in its own transaction, so one bad product does
    // not undo the rest of the page.
    await pause(PAUSE_MS);
    const outcome = await importOne(admin, code);
    if (outcome.kind === 'imported') counts.imported += 1;
    else if (outcome.kind === 'already') counts.alreadyThere += 1;
    else if (outcome.kind === 'failed') counts.failed += 1;
    else counts.skipped[outcome.reason] = (counts.skipped[outcome.reason] ?? 0) + 1;
  }

  return reply(200, {
    ok: true,
    data: { page, pageCount: found.pageCount, found: found.codes.length, ...counts },
  });
});
