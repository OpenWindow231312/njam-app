/**
 * Checks what Gemini sent back to Ask Njam before the app sees it.
 *
 * Gemini is asked for JSON blocks that match a schema, but a model can still
 * invent a product id, tag an allergen we do not track, or call a product
 * "safe". This file turns whatever came back into known block shapes, or
 * throws. Nothing here calls the network, so it is easy to read and to test.
 *
 * The rules, in order of importance:
 *   1. "Safe" is reserved for the verdict engine. Any sentence in which the
 *      AI calls something safe is removed. A Safe chip in the chat can only
 *      come from decideVerdict in the app.
 *   2. A product id must be one the function itself read from the catalogue.
 *      An unknown id is dropped (product block) or set to null (recipe
 *      ingredient), never passed on.
 *   3. When a value is doubtful, drop it. Never invent one.
 */

/** The eight allergens seeded in the first migration. Same list as scan-label. */
export const ALLERGEN_SLUGS = [
  'milk',
  'egg',
  'fish',
  'crustacean-mollusc',
  'peanut',
  'soy',
  'tree-nut',
  'gluten',
] as const;

export type AllergenSlug = (typeof ALLERGEN_SLUGS)[number];

export type RecipeIngredient = {
  name: string;
  /** A catalogue product id the function checked exists, or null. */
  productId: string | null;
  allergen: AllergenSlug | null;
  eNumber: string | null;
};

export type AskBlock =
  | { type: 'text'; text: string }
  | { type: 'product'; productId: string }
  | { type: 'recipe'; title: string; ingredients: RecipeIngredient[]; steps: string[] }
  | { type: 'suggestions'; prompts: string[] };

const MAX_BLOCKS = 8;
const MAX_PRODUCT_BLOCKS = 3;
const MAX_TEXT_LENGTH = 1_200;
const MAX_LINE_LENGTH = 300;
const MAX_INGREDIENTS = 20;
const MAX_STEPS = 12;
const MAX_PROMPT_LENGTH = 60;
/** Ghost text finishes a sentence; it does not write one. */
export const MAX_COMPLETION_LENGTH = 48;

const E_NUMBER = /^E\d{3,4}[a-z]?$/;
// Emoji and pictographs. The voice rules say never use emoji.
const EMOJI = /\s*\p{Extended_Pictographic}\uFE0F?/gu;
// "safe", "safely", "safer", "safest" as whole words. "Unsafe" and "safety"
// do not match, because the letters around "safe" are not word breaks.
const SAFE_WORD = /\bsafe(ly|r|st)?\b/i;
// "not safe" and "isn't safe" deny safety rather than promise it, so they may stay.
const DENIED_SAFE = /(\bnot|n't)\s+safe\b/gi;

function isAllergen(value: unknown): value is AllergenSlug {
  return typeof value === 'string' && (ALLERGEN_SLUGS as readonly string[]).includes(value);
}

/** "e 621", "E-621" and "e621" all become "E621". Anything else becomes null. */
function cleanENumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[\s-]/g, '');
  const normal = compact.charAt(0).toUpperCase() + compact.slice(1).toLowerCase();
  return E_NUMBER.test(normal) ? normal : null;
}

/** Trims, removes emoji, and swaps em and en dashes for a comma (voice rule). */
function tidy(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value
    .replace(EMOJI, '')
    .replace(/\s*[\u2014\u2013]\s*/g, ', ')
    .replace(/[ \t]+/g, ' ')
    .trim();
  if (text.length === 0) return null;
  return text.slice(0, maxLength);
}

export function claimsSafe(sentence: string): boolean {
  return SAFE_WORD.test(sentence.replace(DENIED_SAFE, ''));
}

/**
 * Removes every sentence that calls something safe. Returns null if nothing
 * is left. Sentences end at . ! or ? followed by a space or a line break.
 */
export function withoutSafeClaims(text: string): string | null {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const kept = sentences.filter((sentence) => !claimsSafe(sentence));
  if (kept.length < sentences.length) {
    console.warn('ask-njam removed a sentence that called something safe');
  }
  const joined = kept.join(' ').trim();
  return joined.length > 0 ? joined : null;
}

/** Prose the AI wrote, cleaned and with any "safe" claim removed. */
function prose(value: unknown, maxLength: number): string | null {
  const text = tidy(value, maxLength);
  return text ? withoutSafeClaims(text) : null;
}

function cleanIngredient(raw: unknown, knownProductIds: Set<string>): RecipeIngredient | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const name = prose(item.name, MAX_LINE_LENGTH);
  if (!name) return null;
  const productId = typeof item.productId === 'string' && knownProductIds.has(item.productId) ? item.productId : null;
  return {
    name,
    productId,
    allergen: isAllergen(item.allergen) ? item.allergen : null,
    eNumber: cleanENumber(item.eNumber),
  };
}

function cleanBlock(raw: unknown, knownProductIds: Set<string>): AskBlock | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const block = raw as Record<string, unknown>;

  if (block.type === 'text') {
    const text = prose(block.text, MAX_TEXT_LENGTH);
    return text ? { type: 'text', text } : null;
  }

  if (block.type === 'product') {
    const id = block.productId;
    return typeof id === 'string' && knownProductIds.has(id) ? { type: 'product', productId: id } : null;
  }

  if (block.type === 'recipe') {
    const title = prose(block.title, MAX_LINE_LENGTH);
    const ingredients = Array.isArray(block.ingredients)
      ? block.ingredients
          .map((item) => cleanIngredient(item, knownProductIds))
          .filter((item): item is RecipeIngredient => item !== null)
          .slice(0, MAX_INGREDIENTS)
      : [];
    const steps = Array.isArray(block.steps)
      ? block.steps
          .map((step) => prose(step, MAX_LINE_LENGTH))
          .filter((step): step is string => step !== null)
          .slice(0, MAX_STEPS)
      : [];
    // A recipe without a title, ingredients or steps is not a recipe.
    if (!title || ingredients.length === 0 || steps.length === 0) {
      // Logged so a missing recipe can be traced in the function logs: what
      // survived the checks, and what Gemini actually sent before them.
      console.warn('ask-njam dropped a recipe', {
        title: Boolean(title),
        ingredients: ingredients.length,
        steps: steps.length,
        sent: {
          keys: Object.keys(block),
          ingredients: Array.isArray(block.ingredients) ? block.ingredients.length : String(block.ingredients),
          steps: Array.isArray(block.steps) ? block.steps.length : String(block.steps),
          firstIngredient: Array.isArray(block.ingredients) ? JSON.stringify(block.ingredients[0] ?? null).slice(0, 200) : null,
        },
      });
      return null;
    }
    return { type: 'recipe', title, ingredients, steps };
  }

  if (block.type === 'suggestions') {
    // Suggestions are questions the person might ask next, in their own
    // words ("Is this one safe for me?"), not claims by Njam, so they skip
    // the safe-claim filter.
    const prompts = Array.isArray(block.prompts)
      ? [
          ...new Set(
            block.prompts
              .map((prompt) => tidy(prompt, MAX_PROMPT_LENGTH))
              .filter((prompt): prompt is string => prompt !== null),
          ),
        ].slice(0, 3)
      : [];
    return prompts.length >= 2 ? { type: 'suggestions', prompts } : null;
  }

  return null;
}

/**
 * Turns Gemini's parsed JSON into a list of blocks.
 * Throws when nothing usable is left, so the caller can answer 502.
 */
export function validateBlocks(raw: unknown, knownProductIds: Set<string>): AskBlock[] {
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as Record<string, unknown>).blocks)) {
    throw new Error('The AI response had no blocks.');
  }

  // The recipe arrives in its own field, where the schema can require its
  // ingredients and steps (bug 11). From here on it is one more block, after
  // the text that introduces it, and goes through the same checks.
  const { blocks: rawBlocks, recipe } = raw as { blocks: unknown[]; recipe?: unknown };
  const withRecipe =
    typeof recipe === 'object' && recipe !== null ? [...rawBlocks, { ...recipe, type: 'recipe' }] : rawBlocks;

  const cleaned = withRecipe
    .map((block) => cleanBlock(block, knownProductIds))
    .filter((block): block is AskBlock => block !== null);

  const content: AskBlock[] = [];
  const shownProducts = new Set<string>();
  for (const block of cleaned) {
    if (block.type === 'suggestions') continue;
    if (block.type === 'product') {
      // The same product twice, or a wall of products, helps nobody.
      if (shownProducts.has(block.productId) || shownProducts.size >= MAX_PRODUCT_BLOCKS) continue;
      shownProducts.add(block.productId);
    }
    content.push(block);
  }

  if (content.length === 0) throw new Error('The AI response had nothing to show.');

  // At most one set of suggestions, always last, so the app can find it.
  const suggestions = cleaned.filter((block) => block.type === 'suggestions').at(-1);
  const blocks = content.slice(0, suggestions ? MAX_BLOCKS - 1 : MAX_BLOCKS);
  return suggestions ? [...blocks, suggestions] : blocks;
}

/**
 * Turns Gemini's ghost-text answer into the characters to show after what
 * the person typed, or null when there is nothing worth showing.
 */
export function validateCompletion(raw: unknown, typed: string): string | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const answer = (raw as Record<string, unknown>).completion;
  if (typeof answer !== 'string') return null;

  let completion = answer.replace(EMOJI, '').replace(/\s+/g, ' ');
  // The model sometimes repeats the whole message instead of only the rest.
  if (completion.toLowerCase().startsWith(typed.toLowerCase())) completion = completion.slice(typed.length);
  // One space between words, never two.
  if (typed.endsWith(' ')) completion = completion.trimStart();

  if (completion.length > MAX_COMPLETION_LENGTH) {
    // Cut at the last whole word that fits, so the ghost never ends mid-word.
    const cut = completion.slice(0, MAX_COMPLETION_LENGTH);
    const lastSpace = cut.lastIndexOf(' ');
    completion = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  }
  completion = completion.trimEnd();
  return completion.trim().length > 0 ? completion : null;
}
