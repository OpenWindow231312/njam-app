/**
 * The admin review queue's data: products nobody has verified yet, and the
 * one action an admin takes on them.
 *
 * The database is what enforces the role. products_update only lets a row
 * change when public.is_admin() is true, so a standard user calling
 * verifyProduct changes nothing, whatever the app shows.
 */
import { supabase } from '@/lib/supabase';
import { fetchProductById, type CatalogueProduct } from '@/features/verdict/catalogue';

/** Unverified products, oldest first, each with its ingredient list. */
export async function fetchUnverifiedProducts(): Promise<CatalogueProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('verified', false)
    .order('created_at', { ascending: true });
  if (error) throw error;

  // Reuse the catalogue read, so the queue shows each product exactly as
  // the verdict engine sees it. The queue is short, so one read each is fine.
  const products = await Promise.all(data.map((row) => fetchProductById(row.id)));
  return products.filter((product): product is CatalogueProduct => product !== null);
}

/**
 * Marks a product verified. Throws if nothing changed: RLS does not raise an
 * error for a row you may not update, it just updates no rows, so the
 * returned rows are the only proof it worked.
 */
export async function verifyProduct(productId: string): Promise<void> {
  const { data, error } = await supabase
    .from('products')
    .update({ verified: true })
    .eq('id', productId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Only an admin can verify a product.');
}
