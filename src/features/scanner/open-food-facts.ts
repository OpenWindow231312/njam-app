/**
 * Open Food Facts: a free, public food database anyone can add to.
 * https://world.openfoodfacts.org
 *
 * When a barcode is not in Njam's own catalogue, the scanner asks the
 * import-open-food-facts Edge Function to fetch it. The function reads the
 * product's structured ingredient list (no AI), saves it to the catalogue
 * with its photo, nutrition and aisle, exactly as the bulk import does, and
 * returns its id. The scanner then opens it like any other product, and the
 * next person who scans it finds it straight away.
 *
 * The verdict engine decides a complete Open Food Facts record like a
 * verified one, and keeps a thin one (fewer than three ingredients) at
 * Caution. See isCompleteList in src/services/verdict.
 */
import { supabase } from '@/lib/supabase';

/** Give up quickly: the person is standing at the shelf. */
const TIMEOUT_MS = 8_000;

type ImportReply = { ok: true; data: { productId: string | null } } | { ok: false; error: { message: string } };

/**
 * The catalogue id of the product with this barcode, saved from Open Food
 * Facts, or null when Open Food Facts does not know it or has no ingredient
 * list for it. Throws when the lookup fails or takes too long.
 */
export async function importFromOpenFoodFacts(barcode: string): Promise<string | null> {
  const lookup = supabase.functions.invoke<ImportReply>('import-open-food-facts', { body: { barcode } });
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Open Food Facts took too long')), TIMEOUT_MS),
  );

  const { data, error } = await Promise.race([lookup, timeout]);
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error.message ?? 'Open Food Facts lookup failed');
  return data.data.productId;
}
