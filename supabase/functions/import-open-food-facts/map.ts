/**
 * Turns one Open Food Facts product into the arguments for import_product,
 * or explains why it was skipped. No network, no database: plain functions,
 * so each rule here can be read and checked on its own.
 *
 * The rules lean strict. A product with no name or no ingredient list is
 * skipped rather than saved half-empty. A nutrition table that contradicts
 * itself is left out rather than guessed (the same checks as the seed, see
 * 20261013223249_seed_photos_nutrition.sql).
 */

/** The Open Food Facts fields we ask for. Everything else is left behind. */
export const FIELDS = [
  'code',
  'product_name',
  'product_name_en',
  'brands',
  'ingredients',
  'allergens_tags',
  'traces_tags',
  'image_front_url',
  'quantity',
  'lang',
  'categories_tags',
  'nutriments',
].join(',');

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

/**
 * How a declared allergen is named as an ingredient. The same words as the
 * verdict engine's allergenWord, so an imported "milk (declared allergen)"
 * is the same catalogue row the scanner saves.
 */
const ALLERGEN_WORDS: Record<string, string> = {
  milk: 'milk',
  egg: 'egg',
  fish: 'fish',
  'crustacean-mollusc': 'shellfish',
  peanut: 'peanuts',
  soy: 'soy',
  'tree-nut': 'tree nuts',
  gluten: 'gluten',
};

/**
 * Open Food Facts categories mapped to our nine aisles, checked in this
 * order and first match wins. The order matters: a biscuit is also a sweet
 * snack, and breakfast cereal is also a cereal product, so the narrower aisle
 * comes first. A product that matches none sits in no aisle, and still shows
 * under "All".
 */
const AISLES: { slug: string; tags: string[] }[] = [
  { slug: 'cereals', tags: ['en:breakfast-cereals'] },
  { slug: 'biscuits-rusks', tags: ['en:biscuits', 'en:rusks', 'en:biscuits-and-crackers'] },
  { slug: 'dairy-eggs', tags: ['en:dairies', 'en:eggs', 'en:milks', 'en:cheeses', 'en:yogurts'] },
  { slug: 'bakery', tags: ['en:breads', 'en:pastries', 'en:cakes'] },
  { slug: 'drinks', tags: ['en:beverages'] },
  { slug: 'sauces-spreads', tags: ['en:sauces', 'en:spreads', 'en:condiments'] },
  { slug: 'tins-jars', tags: ['en:canned-foods'] },
  {
    slug: 'snacks',
    tags: ['en:snacks', 'en:chips-and-fries', 'en:crisps', 'en:confectioneries', 'en:chocolates'],
  },
  {
    slug: 'pantry',
    tags: ['en:pastas', 'en:rices', 'en:flours', 'en:sugars', 'en:vegetable-oils', 'en:spices', 'en:legumes'],
  },
];

/** A barcode as shops print them: EAN-8, UPC-A, EAN-13 or GTIN-14. */
const BARCODE = /^\d{8,14}$/;
/** Longer than this is a whole sentence the parser failed to split. */
const MAX_INGREDIENT_NAME = 80;

type Ingredient = { name: string; allergen: string | null; eNumber: string | null };

export type Nutrition = {
  perBasis: '100g' | '100ml';
  energyKj: number | null;
  proteinG: number | null;
  carbsG: number | null;
  sugarG: number | null;
  fatG: number | null;
  satFatG: number | null;
  fibreG: number | null;
  sodiumMg: number | null;
};

/** The arguments import_product takes, named as in the SQL function. */
export type ImportArgs = {
  p_barcode: string;
  p_name: string;
  p_brand: string | null;
  p_image_url: string | null;
  p_serving_size: number | null;
  p_serving_unit: string | null;
  p_category_slug: string | null;
  p_may_contain: string[];
  p_ingredients: Ingredient[];
  p_nutrition: Nutrition | null;
};

export type Mapped = { ok: true; args: ImportArgs } | { ok: false; reason: 'no_barcode' | 'no_name' | 'no_ingredients' };

// deno-lint-ignore no-explicit-any
type OffProduct = Record<string, any>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
}

function allergenSlugs(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const slugs = tags.map((tag) => ALLERGEN_FOR_TAG[String(tag)]).filter(Boolean);
  return [...new Set(slugs)];
}

/** "en:e330" is E330. Anything else is not an E-number. */
function eNumberFrom(id: unknown): string | null {
  const match = typeof id === 'string' ? id.match(/^en:e(\d{3,4}[a-z]?)$/) : null;
  return match ? `E${match[1].toUpperCase()}` : null;
}

/**
 * The name to save for one ingredient. On an English label, the label's own
 * words. On any other label ("lait écrémé en poudre"), Open Food Facts'
 * English name for it ("en:skimmed-milk-powder"), when it has one, because
 * the verdict engine's alias lists are in English.
 */
// deno-lint-ignore no-explicit-any
function ingredientName(item: any, english: boolean): string | null {
  const id = typeof item?.id === 'string' ? item.id : '';
  const raw = !english && item?.is_in_taxonomy === 1 && id.startsWith('en:') ? id.slice(3).replace(/-/g, ' ') : text(item?.text);
  // Underscores and asterisks are how Open Food Facts marks allergens in the text.
  const name = raw?.replace(/[_*]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
  return name && name.length <= MAX_INGREDIENT_NAME ? name : null;
}

/**
 * Every ingredient, sub-ingredients included, in label order. Open Food Facts
 * nests "chocolate (sugar, milk solids)" as chocolate with two children; the
 * children are kept, because "milk solids" is exactly what an allergy rule
 * needs to see.
 */
function flattenIngredients(items: unknown, english: boolean): Ingredient[] {
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    const name = ingredientName(item, english);
    const own: Ingredient[] = name ? [{ name, allergen: null, eNumber: eNumberFrom(item?.id) }] : [];
    return [...own, ...flattenIngredients(item?.ingredients, english)];
  });
}

/** "1 kg" is 1 kg, "500 ml" is 500 ml. Anything less plain ("6 x 330 ml") is left out. */
function packSize(quantity: unknown): { size: number; unit: string } | null {
  const match = text(quantity)?.toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)$/);
  if (!match) return null;
  const size = Number(match[1].replace(',', '.'));
  return size > 0 ? { size, unit: match[2] } : null;
}

function aisleFor(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  return AISLES.find((aisle) => aisle.tags.some((tag) => tags.includes(tag)))?.slug ?? null;
}

/**
 * The nutrition table per 100 g (or 100 ml), or null when it is missing or
 * contradicts itself. Checks, as for the seed: sugar no more than carbs,
 * saturated fat no more than fat, no more than 100 g of nutrients per 100 g,
 * sodium under 40 g per 100 g, and energy within 20% of what protein, carbs,
 * fat and fibre add up to.
 */
export function nutritionFrom(nutriments: unknown, packUnit: string | null): Nutrition | null {
  if (!nutriments || typeof nutriments !== 'object') return null;
  const n = nutriments as Record<string, unknown>;

  const kcal = number(n['energy-kcal_100g']);
  const energyKj = number(n['energy-kj_100g']) ?? (kcal !== null ? Math.round(kcal * 4.184) : null);
  const sodiumG = number(n['sodium_100g']);
  const table: Nutrition = {
    perBasis: packUnit === 'ml' || packUnit === 'l' ? '100ml' : '100g',
    energyKj,
    proteinG: number(n['proteins_100g']),
    carbsG: number(n['carbohydrates_100g']),
    sugarG: number(n['sugars_100g']),
    fatG: number(n['fat_100g']),
    satFatG: number(n['saturated-fat_100g']),
    fibreG: number(n['fiber_100g']),
    sodiumMg: sodiumG !== null ? Math.round(sodiumG * 1000 * 10) / 10 : null,
  };

  // No energy figure means there is no real table to check against.
  if (table.energyKj === null || table.energyKj < 0) return null;

  const grams = [table.proteinG, table.carbsG, table.fatG, table.fibreG].map((value) => value ?? 0);
  if (grams.some((value) => value < 0)) return null;
  if (grams.reduce((sum, value) => sum + value, 0) > 100) return null;
  if (table.sugarG !== null && table.carbsG !== null && table.sugarG > table.carbsG) return null;
  if (table.satFatG !== null && table.fatG !== null && table.satFatG > table.fatG) return null;
  if (table.sodiumMg !== null && (table.sodiumMg < 0 || table.sodiumMg > 40_000)) return null;

  // kJ per gram: protein 17, carbs 17, fat 37, fibre 8. Only checked when
  // the main three are all there; tiny amounts (water, tea) are let through.
  const [protein, carbs, fat, fibre] = grams;
  if (table.proteinG !== null && table.carbsG !== null && table.fatG !== null) {
    const expected = protein * 17 + carbs * 17 + fat * 37 + fibre * 8;
    if (expected > 100 && Math.abs(table.energyKj - expected) > expected * 0.2) return null;
  }

  return table;
}

export function mapProduct(product: OffProduct): Mapped {
  const barcode = text(product.code);
  if (!barcode || !BARCODE.test(barcode)) return { ok: false, reason: 'no_barcode' };

  const name = text(product.product_name) ?? text(product.product_name_en);
  if (!name) return { ok: false, reason: 'no_name' };

  const listed = flattenIngredients(product.ingredients, product.lang === 'en');
  if (listed.length === 0) return { ok: false, reason: 'no_ingredients' };

  // Every allergen the product declares is added as its own ingredient. This
  // can only make a verdict stricter.
  const declared = allergenSlugs(product.allergens_tags).map((slug) => ({
    name: `${ALLERGEN_WORDS[slug]} (declared allergen)`,
    allergen: slug,
    eNumber: null,
  }));

  // "Jungle, Tiger Brands": the first is the brand on the pack.
  const brand = text(product.brands)?.split(',')[0].trim() || null;
  const pack = packSize(product.quantity);

  return {
    ok: true,
    args: {
      p_barcode: barcode,
      p_name: name,
      p_brand: brand,
      p_image_url: text(product.image_front_url),
      p_serving_size: pack?.size ?? null,
      p_serving_unit: pack?.unit ?? null,
      p_category_slug: aisleFor(product.categories_tags),
      p_may_contain: allergenSlugs(product.traces_tags),
      p_ingredients: [...listed, ...declared],
      p_nutrition: nutritionFrom(product.nutriments, pack?.unit ?? null),
    },
  };
}
