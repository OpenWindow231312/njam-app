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

/**
 * Unverified products, oldest first, each with its ingredient list. Open
 * Food Facts products are left out: there are about a thousand, and the
 * engine already decides them by how complete their list is.
 */
export async function fetchUnverifiedProducts(): Promise<CatalogueProduct[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id')
    .eq('verified', false)
    .neq('source', 'open_food_facts')
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

/** Another product in the catalogue that looks like the same one. */
export type PossibleDuplicate = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string;
};

// Pack sizes, so "2 l" and "1 L" packs of the same milk still match.
const PACK_SIZE = /\b\d+([.,]\d+)?\s*(g|kg|ml|l|lt|litre|litres)\b/g;

/**
 * Brand and name reduced to what identifies the product: lower case, pack
 * size and punctuation removed. "Clover Fresh Full Cream Milk 2 L" and
 * "clover fresh full cream milk 1l" both become "clover fresh full cream milk".
 */
export function sameProductKey(brand: string | null, name: string): string {
  return `${brand ?? ''} ${name}`
    .toLowerCase()
    .replace(PACK_SIZE, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * For each product in the queue, the other products with the same brand and
 * name. The barcode is unique, so the same barcode can never be saved twice;
 * this catches the same product saved under another barcode (a different
 * pack size, or a misread barcode) for an admin to look at.
 */
export async function fetchPossibleDuplicates(
  queue: CatalogueProduct[],
): Promise<Map<string, PossibleDuplicate[]>> {
  // The whole catalogue is small (25 products today), so read it once and
  // compare here, rather than asking the database once per product.
  const { data, error } = await supabase.from('products').select('id, name, brand, barcode');
  if (error) throw error;

  const duplicates = new Map<string, PossibleDuplicate[]>();
  for (const product of queue) {
    const key = sameProductKey(product.brand, product.name);
    const matches = (data as PossibleDuplicate[]).filter(
      (other) => other.id !== product.id && sameProductKey(other.brand, other.name) === key,
    );
    if (matches.length > 0) duplicates.set(product.id, matches);
  }
  return duplicates;
}
