/**
 * Reads categories: the shop aisles a product sits in ("Dairy and eggs",
 * "Snacks"), for the aisle bubbles on Home and the aisle list on Search.
 */
import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  name: string;
  /** The Material Symbol drawn in its bubble. */
  icon: string;
};

/**
 * Each seeded aisle's icon, by slug. Kept in code rather than the database
 * because icons are part of the app: an icon name the app has not built
 * (scripts/build-icons.py) cannot be drawn. A new aisle gets "category"
 * until it is added here.
 */
const AISLE_ICONS: Record<string, string> = {
  'dairy-eggs': 'egg',
  bakery: 'bakery_dining',
  cereals: 'breakfast_dining',
  pantry: 'grain',
  'tins-jars': 'soup_kitchen',
  'sauces-spreads': 'dinner_dining',
  'biscuits-rusks': 'cookie',
  snacks: 'tapas',
  drinks: 'local_drink',
  frozen: 'ac_unit',
  baby: 'child_care',
};

/** Every top-level aisle, A to Z. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .is('parent_id', null)
    .order('name');
  if (error) throw error;
  return data.map((row) => ({ id: row.id, name: row.name, icon: AISLE_ICONS[row.slug] ?? 'category' }));
}
