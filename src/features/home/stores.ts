/**
 * Reads stores and product_stores: the shops and websites Njam knows, and
 * which products each one sells.
 */
import { supabase } from '@/lib/supabase';

export type Store = {
  id: string;
  name: string;
  websiteUrl: string;
};

/** A store that sells one product, and the link to open for it. */
export type StoreForProduct = Store & {
  /** The product's own page on the store's website, or the store's home page. */
  link: string;
};

/** Every store, A to Z, for the Store filter on Home. */
export async function fetchStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select('id, name, website_url').order('name');
  if (error) throw error;
  return data.map((row) => ({ id: row.id, name: row.name, websiteUrl: row.website_url }));
}

type ProductStoreRow = {
  product_url: string | null;
  stores: { id: string; name: string; website_url: string } | null;
};

/** The stores that sell one product, A to Z. */
export async function fetchStoresForProduct(productId: string): Promise<StoreForProduct[]> {
  const { data, error } = await supabase
    .from('product_stores')
    .select('product_url, stores ( id, name, website_url )')
    .eq('product_id', productId);
  if (error) throw error;

  return (data as unknown as ProductStoreRow[])
    .flatMap((row) => (row.stores ? [{ ...row.stores, productUrl: row.product_url }] : []))
    .map((store) => ({
      id: store.id,
      name: store.name,
      websiteUrl: store.website_url,
      link: store.productUrl ?? store.website_url,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
