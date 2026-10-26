/**
 * Reads and writes nutrition_facts: the nutrition table from a product's
 * label, for the Nutrition section of the Verdict screen.
 *
 * Only the nutrients the label gave are returned, in the order a South
 * African label prints them. A product with no row has no nutrition facts yet.
 */
import { supabase } from '@/lib/supabase';

export type NutrientLine = {
  /** "Carbohydrate", "of which total sugar". */
  name: string;
  /** "12.4 g". */
  amount: string;
};

/** One nutrition_facts row, as the app writes it. null for a nutrient the label does not give. */
export type NutritionFacts = {
  perBasis: '100g' | '100ml' | 'serving';
  energyKj: number | null;
  proteinG: number | null;
  carbsG: number | null;
  sugarG: number | null;
  fatG: number | null;
  satFatG: number | null;
  fibreG: number | null;
  sodiumMg: number | null;
};

export type Nutrition = {
  /** "Per 100 g", "Per 100 ml" or "Per serving". */
  basis: string;
  lines: NutrientLine[];
};

const BASIS_WORDS: Record<string, string> = {
  '100g': 'Per 100 g',
  '100ml': 'Per 100 ml',
  serving: 'Per serving',
};

// Column, how it reads, and its unit. The order is the label's order.
const NUTRIENTS: { column: string; name: string; unit: string }[] = [
  { column: 'energy_kj', name: 'Energy', unit: 'kJ' },
  { column: 'protein_g', name: 'Protein', unit: 'g' },
  { column: 'carbs_g', name: 'Carbohydrate', unit: 'g' },
  { column: 'sugar_g', name: 'of which total sugar', unit: 'g' },
  { column: 'fat_g', name: 'Total fat', unit: 'g' },
  { column: 'sat_fat_g', name: 'of which saturated fat', unit: 'g' },
  { column: 'fibre_g', name: 'Dietary fibre', unit: 'g' },
  { column: 'sodium_mg', name: 'Sodium', unit: 'mg' },
];

export async function fetchNutrition(productId: string): Promise<Nutrition | null> {
  const { data, error } = await supabase
    .from('nutrition_facts')
    .select('per_basis, energy_kj, protein_g, carbs_g, sugar_g, fat_g, sat_fat_g, fibre_g, sodium_mg')
    .eq('product_id', productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as Record<string, number | string | null>;
  const lines = NUTRIENTS.flatMap((nutrient) => {
    const value = row[nutrient.column];
    return value === null || value === undefined ? [] : [{ name: nutrient.name, amount: `${value} ${nutrient.unit}` }];
  });
  return { basis: BASIS_WORDS[String(row.per_basis)] ?? 'Per 100 g', lines };
}

/**
 * Saves the nutrition table for a product you just added. The database only
 * lets the person who added a product (or an admin) do this.
 */
export async function saveNutrition(productId: string, facts: NutritionFacts): Promise<void> {
  const { error } = await supabase.from('nutrition_facts').insert({
    product_id: productId,
    per_basis: facts.perBasis,
    energy_kj: facts.energyKj,
    protein_g: facts.proteinG,
    carbs_g: facts.carbsG,
    sugar_g: facts.sugarG,
    fat_g: facts.fatG,
    sat_fat_g: facts.satFatG,
    fibre_g: facts.fibreG,
    sodium_mg: facts.sodiumMg,
  });
  if (error) throw error;
}
