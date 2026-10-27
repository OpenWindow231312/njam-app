/**
 * Reads nutrition_facts: the nutrition table from a product's label, for the
 * Nutrition section of the Verdict screen.
 *
 * Only the nutrients the label gave are returned, in the order a South
 * African label prints them. A product with no row has no nutrition facts yet.
 * The same row also comes back as numbers (facts), for the verdict engine to
 * check nutrient limits against.
 */
import { supabase } from '@/lib/supabase';
import type { NutrientColumn, NutritionFacts } from '@/services/verdict';

export type NutrientLine = {
  /** "Carbohydrate", "of which total sugar". */
  name: string;
  /** "12.4 g". */
  amount: string;
};

export type Nutrition = {
  /** "Per 100 g", "Per 100 ml" or "Per serving". */
  basis: string;
  lines: NutrientLine[];
  /** The same row as numbers, for the verdict engine. */
  facts: NutritionFacts;
};

const BASIS_WORDS: Record<string, string> = {
  '100g': 'Per 100 g',
  '100ml': 'Per 100 ml',
  serving: 'Per serving',
};

// Column, how it reads, and its unit. The order is the label's order.
const NUTRIENTS: { column: NutrientColumn; name: string; unit: string }[] = [
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
  const lines: NutrientLine[] = [];
  const values: NutritionFacts['values'] = {};
  for (const nutrient of NUTRIENTS) {
    const value = row[nutrient.column];
    if (value === null || value === undefined) continue;
    lines.push({ name: nutrient.name, amount: `${value} ${nutrient.unit}` });
    // Numeric columns come back from PostgREST as numbers, but read them as
    // numbers either way, and leave out anything that is not one.
    const amount = Number(value);
    if (Number.isFinite(amount)) values[nutrient.column] = amount;
  }
  const basis = row.per_basis === '100ml' || row.per_basis === 'serving' ? row.per_basis : '100g';
  return { basis: BASIS_WORDS[basis], lines, facts: { basis, values } };
}
