/**
 * What an admin can change about any product in the catalogue: edit its
 * name, brand, barcode and ingredient list, or delete it.
 *
 * As with verifying, the database is what enforces the role. update_product
 * refuses anyone who is not an admin, and products_delete only lets an admin
 * remove a row, so the buttons being hidden from everyone else is a
 * courtesy, not the protection.
 */
import { supabase } from '@/lib/supabase';

/** Another product already has this barcode. */
export class BarcodeTakenError extends Error {}

export type ProductEdit = {
  name: string;
  brand: string;
  barcode: string;
  /** In label order. Empty names are skipped by the database. */
  ingredients: string[];
};

/**
 * Saves an edit in one go (see the update_product migration): the product's
 * own fields and its whole ingredient list, so it is never half saved.
 */
export async function updateProduct(productId: string, edit: ProductEdit): Promise<void> {
  const { error } = await supabase.rpc('update_product', {
    p_product_id: productId,
    p_name: edit.name,
    p_brand: edit.brand,
    p_barcode: edit.barcode,
    p_ingredients: edit.ingredients,
  });
  if (error) {
    // 23505 is Postgres for "already exists": the barcode is unique.
    if (error.code === '23505' && error.message.includes('products_barcode_key')) {
      throw new BarcodeTakenError('Another product already has this barcode.');
    }
    throw error;
  }
}

/**
 * Deletes a product for everyone. Its ingredient links, nutrition table,
 * saved-product rows and store links go with it (on delete cascade). Past
 * scans of it stay in each household's history, without the link.
 *
 * Throws if nothing was deleted: RLS does not raise an error for a row you
 * may not delete, it just deletes no rows.
 */
export async function deleteProduct(productId: string): Promise<void> {
  const { data, error } = await supabase.from('products').delete().eq('id', productId).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('Only an admin can delete a product.');
}
