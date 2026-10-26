/**
 * Open Food Facts: a free, public food database anyone can add to.
 * https://world.openfoodfacts.org
 *
 * When a barcode is not in Njam's own catalogue, the scanner asks Open Food
 * Facts for it. If it knows the product and has its ingredient list, the AI
 * service reads that text into typed ingredients, exactly as it reads a label
 * photo.
 *
 * Anyone can edit Open Food Facts, so nothing found here is verified, and
 * the verdict says so, the same as an AI label read. Its nutrition table is
 * kept too, once it passes the checks in off-nutrition.ts.
 */
import { readNutriments } from '@/features/scanner/off-nutrition';
import type { NutritionFacts } from '@/features/verdict/nutrition';
import { readLabel, type LabelRead } from '@/services/ai';
import { allergenWord } from '@/services/verdict';

const API = 'https://world.openfoodfacts.org/api/v2/product';
/** Only the fields we use, so the reply stays small. */
const FIELDS = 'product_name,brands,quantity,ingredients_text,allergens_tags,traces_tags,nutriments';
/** Give up quickly: the person is standing at the shelf. */
const TIMEOUT_MS = 6_000;

/**
 * Open Food Facts allergen tags mapped to our allergens.slug. Tags we do not
 * track yet (sesame, mustard, celery, sulphites, lupin) are left out.
 */
const ALLERGEN_FOR_TAG: Record<string, string> = {
  'en:milk': 'milk',
  'en:eggs': 'egg',
  'en:fish': 'fish',
  'en:crustaceans': 'crustacean-mollusc',
  'en:molluscs': 'crustacean-mollusc',
  'en:peanuts': 'peanut',
  'en:soybeans': 'soy',
  'en:nuts': 'tree-nut',
  'en:gluten': 'gluten',
};

export type OpenFoodFactsProduct = {
  name: string | null;
  brand: string | null;
  ingredientsText: string | null;
  /** Allergens the product declares, as our slugs. */
  allergens: string[];
  /** Allergens from its "may contain" line, as our slugs. */
  traces: string[];
  /** Per 100 g or 100 ml, or null when it has none or it failed a check. */
  nutrition: NutritionFacts | null;
};

function toSlugs(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const slugs = tags.map((tag) => ALLERGEN_FOR_TAG[String(tag)]).filter(Boolean);
  return [...new Set(slugs)];
}

/** The product for this barcode, or null if Open Food Facts does not know it. */
export async function fetchFromOpenFoodFacts(barcode: string): Promise<OpenFoodFactsProduct | null> {
  // Stop waiting after TIMEOUT_MS. A slow lookup should not hold up the scan.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`, {
      // Open Food Facts asks every app to name itself.
      headers: { 'User-Agent': 'Njam/1.0 (DV300 student project)' },
      signal: controller.signal,
    });
    // An unknown barcode comes back as 404 with status 0.
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Open Food Facts answered ${response.status}`);

    const body = await response.json();
    if (body?.status !== 1 || !body.product) return null;

    const product = body.product;
    const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
    return {
      name: text(product.product_name),
      brand: text(product.brands),
      ingredientsText: text(product.ingredients_text),
      allergens: toSlugs(product.allergens_tags),
      traces: toSlugs(product.traces_tags),
      nutrition: readNutriments(product.nutriments, text(product.quantity)),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Turns an Open Food Facts product into the same shape as a label read.
 * Returns null when it has no ingredient list, because there is then nothing
 * to check.
 *
 * The AI reads the ingredient text. Then, deterministically, every allergen
 * Open Food Facts declares is added if the AI did not already find it. This
 * can only make a verdict stricter, never more lenient.
 */
export async function readOpenFoodFactsProduct(product: OpenFoodFactsProduct): Promise<LabelRead | null> {
  if (!product.ingredientsText) return null;

  const read = await readLabel({ text: product.ingredientsText });
  if (!read.readable) return null;

  const found = new Set(read.ingredients.map((item) => item.allergen));
  const declared = product.allergens
    .filter((slug) => !found.has(slug))
    .map((slug) => ({ name: `${allergenWord(slug)} (declared allergen)`, allergen: slug, eNumber: null }));

  return {
    ...read,
    productName: product.name ?? read.productName,
    ingredients: [...read.ingredients, ...declared],
    mayContain: [...new Set([...read.mayContain, ...product.traces])],
  };
}
