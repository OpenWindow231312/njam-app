/**
 * Reads and writes saved_products: the products your household bookmarked.
 *
 * A save belongs to the household, not to one person. The database fills in
 * the household and who saved it from the signed-in person, so the app only
 * ever sends the product id.
 */
import { supabase } from '@/lib/supabase';

/** The ids of every product your household has saved. */
export async function fetchSavedProductIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('saved_products').select('product_id');
  if (error) throw error;
  return new Set(data.map((row) => row.product_id as string));
}

export async function saveProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('saved_products').insert({ product_id: productId });
  // 23505 is a duplicate: someone in the household saved it a moment ago.
  // The product is saved either way, so that is not a failure.
  if (error && error.code !== '23505') throw error;
}

export async function unsaveProduct(productId: string): Promise<void> {
  const { error } = await supabase.from('saved_products').delete().eq('product_id', productId);
  if (error) throw error;
}
