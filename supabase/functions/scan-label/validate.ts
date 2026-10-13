/**
 * Checks what Gemini sent back before anything in the app sees it.
 *
 * Gemini is asked for JSON that matches a schema, but a model can still
 * return a field of the wrong type, an allergen we do not track, or an
 * E-number written as "e 621". This file turns whatever came back into one
 * known shape, or throws. Nothing here calls the network, so it is easy to
 * read and to test.
 *
 * The rule throughout: when a value is doubtful, drop it or mark the read as
 * less certain. Never invent a value, and never upgrade the confidence.
 */

/** The eight allergens seeded in the first migration (allergens.slug). */
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
export type Confidence = 'high' | 'medium' | 'low';

export type LabelIngredient = {
  /** As printed on the label, lower case: "milk solids". */
  name: string;
  /** Which tracked allergen this ingredient is, or null if none. */
  allergen: AllergenSlug | null;
  /** "E621" style, or null if the ingredient is not an additive. */
  eNumber: string | null;
};

export type LabelRead = {
  /** False when the photo or text held no ingredient list we could read. */
  readable: boolean;
  productName: string | null;
  ingredients: LabelIngredient[];
  /** Allergens named in a "may contain" or "made in a factory that" line. */
  mayContain: AllergenSlug[];
  confidence: Confidence;
  /** When readable is false: what was wrong, in one short sentence. */
  problem: string | null;
};

const MAX_INGREDIENTS = 80;
const MAX_NAME_LENGTH = 120;
const E_NUMBER = /^E\d{3,4}[a-z]?$/;

function isAllergen(value: unknown): value is AllergenSlug {
  return typeof value === 'string' && (ALLERGEN_SLUGS as readonly string[]).includes(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return null;
  return trimmed.slice(0, MAX_NAME_LENGTH);
}

/** "e 621", "E-621" and "e621" all become "E621". Anything else becomes null. */
export function cleanENumber(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const compact = value.replace(/[\s-]/g, '');
  const normal = compact.charAt(0).toUpperCase() + compact.slice(1).toLowerCase();
  return E_NUMBER.test(normal) ? normal : null;
}

function cleanIngredient(raw: unknown): LabelIngredient | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const name = cleanText(item.name);
  if (!name) return null;
  return {
    name: name.toLowerCase(),
    allergen: isAllergen(item.allergen) ? item.allergen : null,
    eNumber: cleanENumber(item.eNumber),
  };
}

/**
 * Turns Gemini's parsed JSON into a LabelRead.
 * Throws when the top-level shape is unusable, so the caller can answer 502.
 */
export function validateLabelRead(raw: unknown): LabelRead {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('The AI response was not an object.');
  }
  const data = raw as Record<string, unknown>;

  if (!Array.isArray(data.ingredients)) {
    throw new Error('The AI response had no ingredients list.');
  }

  const ingredients = data.ingredients
    .map(cleanIngredient)
    .filter((item): item is LabelIngredient => item !== null)
    .slice(0, MAX_INGREDIENTS);

  const mayContain = Array.isArray(data.mayContain)
    ? [...new Set(data.mayContain.filter(isAllergen))]
    : [];

  let confidence: Confidence =
    data.confidence === 'high' || data.confidence === 'medium' ? data.confidence : 'low';

  // Gemini said it could read the label, but some items failed the checks
  // above. The read is less trustworthy than it claims, so lower it.
  if (ingredients.length < data.ingredients.length && confidence === 'high') {
    confidence = 'medium';
  }

  // No ingredients means nothing was read, whatever the model claimed.
  const readable = data.readable === true && ingredients.length > 0;

  return {
    readable,
    productName: cleanText(data.productName),
    ingredients,
    mayContain,
    confidence: readable ? confidence : 'low',
    problem: readable ? null : (cleanText(data.problem) ?? 'We could not read an ingredient list.'),
  };
}

/* ------------------------------------------------------------------ */
/* Front of the pack                                                  */
/* ------------------------------------------------------------------ */

export type FrontRead = {
  /** False when no product name could be read off the photo. */
  readable: boolean;
  /** As printed, without the brand: "Fresh full cream milk 2 l". */
  name: string | null;
  /** "Clover", or null when no brand is printed. */
  brand: string | null;
  /** When readable is false: what was wrong, in one short sentence. */
  problem: string | null;
};

/**
 * Turns Gemini's reading of the front of a pack into a FrontRead.
 * No name means nothing was read, whatever the model claimed.
 */
export function validateFrontRead(raw: unknown): FrontRead {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('The AI response was not an object.');
  }
  const data = raw as Record<string, unknown>;
  const name = cleanText(data.name);
  const readable = data.readable === true && name !== null;

  return {
    readable,
    name: readable ? name : null,
    brand: readable ? cleanText(data.brand) : null,
    problem: readable ? null : (cleanText(data.problem) ?? 'We could not read the product name.'),
  };
}
