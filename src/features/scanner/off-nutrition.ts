/**
 * Turns Open Food Facts' nutrition table into a nutrition_facts row, so a
 * product someone adds from Open Food Facts keeps its nutrition.
 *
 * Anyone can edit Open Food Facts, so the table is checked first, with the
 * same checks used on the seeded products: sugar no more than carbs,
 * saturated fat no more than fat, no more than 100 g of a nutrient per 100 g,
 * a believable sodium, and energy within 20% of what the protein, carbs, fat
 * and fibre add up to. A table that fails is left out, not guessed: the
 * Nutrition card then says we have no nutrition facts yet.
 *
 * Pure on purpose (no network, no app imports), so it can be tested with
 * npm test.
 */
import type { NutritionFacts } from '@/features/verdict/nutrition';

/** Sodium above this per 100 g (40 g) would be more than pure salt holds. */
const MAX_SODIUM_MG = 40_000;
/** How far the stated energy may be from the energy its macros add up to. */
const ENERGY_TOLERANCE = 0.2;

/** A number from the reply, or null for anything missing or not a number. */
function numberFrom(value: unknown): number | null {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : null;
}

function rounded(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

/**
 * The nutrition table per 100 g (or 100 ml for a drink), or null when Open
 * Food Facts has none or it fails a check. `quantity` is the pack size as
 * Open Food Facts gives it ("500 ml"), which says whether it is a drink.
 */
export function readNutriments(nutriments: unknown, quantity: string | null): NutritionFacts | null {
  if (!nutriments || typeof nutriments !== 'object') return null;
  const table = nutriments as Record<string, unknown>;

  // Open Food Facts' "_100g" values are per 100 g, or per 100 ml for a drink.
  const kcal = numberFrom(table['energy-kcal_100g']);
  const sodiumGrams = numberFrom(table['sodium_100g']);
  const facts: NutritionFacts = {
    perBasis: quantity && /\d\s*(ml|l)\b/i.test(quantity) ? '100ml' : '100g',
    energyKj: rounded(numberFrom(table['energy-kj_100g']) ?? (kcal === null ? null : kcal * 4.184)),
    proteinG: rounded(numberFrom(table['proteins_100g'])),
    carbsG: rounded(numberFrom(table['carbohydrates_100g'])),
    sugarG: rounded(numberFrom(table['sugars_100g'])),
    fatG: rounded(numberFrom(table['fat_100g'])),
    satFatG: rounded(numberFrom(table['saturated-fat_100g'])),
    fibreG: rounded(numberFrom(table['fiber_100g'])),
    sodiumMg: sodiumGrams === null ? null : Math.round(sodiumGrams * 1000),
  };

  const { energyKj, proteinG, carbsG, sugarG, fatG, satFatG, fibreG, sodiumMg } = facts;
  const grams = [proteinG, carbsG, sugarG, fatG, satFatG, fibreG];
  if ([energyKj, sodiumMg, ...grams].every((value) => value === null)) return null;

  if (grams.some((value) => value !== null && value > 100)) return null;
  if (sugarG !== null && carbsG !== null && sugarG > carbsG) return null;
  if (satFatG !== null && fatG !== null && satFatG > fatG) return null;
  if (sodiumMg !== null && sodiumMg > MAX_SODIUM_MG) return null;

  // Protein and carbs give 17 kJ a gram, fat 37 and fibre 8.
  if (energyKj !== null && proteinG !== null && carbsG !== null && fatG !== null) {
    const fromMacros = 17 * proteinG + 17 * carbsG + 37 * fatG + 8 * (fibreG ?? 0);
    if (fromMacros > 0 && Math.abs(energyKj - fromMacros) / fromMacros > ENERGY_TOLERANCE) return null;
  }

  return facts;
}
