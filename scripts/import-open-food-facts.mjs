/**
 * Fills the catalogue with South African products from Open Food Facts.
 *
 *   node --env-file=.env scripts/import-open-food-facts.mjs        all pages
 *   node --env-file=.env scripts/import-open-food-facts.mjs 12     from page 12 on
 *
 * It asks for an admin's email and password, signs in, then calls the
 * import-open-food-facts Edge Function once per page of 50 products and
 * prints what each page did. The import itself happens in the function; this
 * script only drives it, so no secret key is needed here.
 *
 * Safe to run again: a barcode already in the catalogue is skipped, so a
 * second run only adds what the first one missed.
 */
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
/** Between pages, to give Open Food Facts a rest. */
const PAUSE_MS = 5_000;
/** When Open Food Facts is busy, wait this long and try the page again. */
const BUSY_WAIT_MS = 60_000;
const BUSY_TRIES = 3;

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads a line without showing what is typed, for the password. Raw mode
 * turns the terminal's own echo off, so each key arrives here unseen.
 */
function askHidden(question) {
  stdout.write(question);
  stdin.setRawMode(true);
  stdin.setEncoding('utf8');
  stdin.resume();
  return new Promise((resolve) => {
    let typed = '';
    const onKey = (keys) => {
      for (const key of keys) {
        if (key === '\r' || key === '\n') {
          stdin.off('data', onKey);
          stdin.setRawMode(false);
          stdin.pause();
          stdout.write('\n');
          resolve(typed);
          return;
        }
        if (key === '\u0003') process.exit(130); // Ctrl-C
        if (key === '\u007f') typed = typed.slice(0, -1); // Backspace
        else typed += key;
      }
    };
    stdin.on('data', onKey);
  });
}

async function signIn() {
  const rl = createInterface({ input: stdin, output: stdout });
  const email = await rl.question('Admin email: ');
  rl.close();
  const password = await askHidden('Password: ');

  const response = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(`Could not sign in: ${body.error_description ?? body.msg ?? response.status}`);
  return body.access_token;
}

async function importPage(token, page) {
  for (let attempt = 1; attempt <= BUSY_TRIES; attempt += 1) {
    const response = await fetch(`${URL}/functions/v1/import-open-food-facts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, apikey: KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ page }),
    });
    const body = await response.json().catch(() => null);
    if (body?.ok) return body.data;
    if (body?.error?.code !== 'open_food_facts_busy' || attempt === BUSY_TRIES) {
      throw new Error(`Page ${page} failed: ${body?.error?.message ?? response.status}`);
    }
    console.log(`  Open Food Facts is busy. Waiting a minute (try ${attempt} of ${BUSY_TRIES}).`);
    await pause(BUSY_WAIT_MS);
  }
}

async function main() {
  if (!URL || !KEY) throw new Error('Run with --env-file=.env so the Supabase URL and key are set.');
  const firstPage = Number(process.argv[2] ?? 1);
  const token = await signIn();

  const totals = { imported: 0, alreadyThere: 0, skipped: 0, failed: 0 };
  let pageCount = firstPage;
  for (let page = firstPage; page <= pageCount; page += 1) {
    const data = await importPage(token, page);
    pageCount = data.pageCount;
    const skipped = Object.values(data.skipped).reduce((sum, n) => sum + n, 0);
    totals.imported += data.imported;
    totals.alreadyThere += data.alreadyThere;
    totals.skipped += skipped;
    totals.failed += data.failed;
    console.log(
      `Page ${page} of ${pageCount}: ${data.imported} added, ${data.alreadyThere} already there, ` +
        `${skipped} skipped ${JSON.stringify(data.skipped)}, ${data.failed} failed`,
    );
    if (page < pageCount) await pause(PAUSE_MS);
  }

  console.log(
    `\nDone. ${totals.imported} added, ${totals.alreadyThere} already there, ` +
      `${totals.skipped} skipped, ${totals.failed} failed.`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
