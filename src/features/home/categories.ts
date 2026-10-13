/**
 * Reads categories: the shop aisles a product sits in ("Dairy and eggs",
 * "Snacks"), for the chips under the search bar on Home.
 */
import { supabase } from '@/lib/supabase';

export type Category = {
  id: string;
  name: string;
};

/** Every top-level aisle, A to Z. */
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .is('parent_id', null)
    .order('name');
  if (error) throw error;
  return data;
}
