/**
 * Reads stores and product_stores: the shops and websites Njam knows, and
 * which products each one sells.
 */
import { supabase } from '@/lib/supabase';

export type Store = {
  id: string;
  name: string;
  /** null for "Other", which is not one shop. */
  websiteUrl: string | null;
  /** The store's logo in the store-logos bucket, or null until one is uploaded. */
  logoUrl: string | null;
};

/** A store that sells one product, and the link to open for it. */
export type StoreForProduct = Store & {
  /** The product's own page on the store's website, the store's home page, or null for "Other". */
  link: string | null;
};

type StoreRow = { id: string; name: string; website_url: string | null; logo_url: string | null };

const STORE_COLUMNS = 'id, name, website_url, logo_url';

function toStore(row: StoreRow): Store {
  return { id: row.id, name: row.name, websiteUrl: row.website_url, logoUrl: row.logo_url };
}

/** "Other" goes last, after the named stores in A to Z order. */
function byName(a: Store, b: Store): number {
  if (a.name === 'Other') return 1;
  if (b.name === 'Other') return -1;
  return a.name.localeCompare(b.name);
}

/** Every store, for the Store filter. */
export async function fetchStores(): Promise<Store[]> {
  const { data, error } = await supabase.from('stores').select(STORE_COLUMNS);
  if (error) throw error;
  return (data as StoreRow[]).map(toStore).sort(byName);
}

type ProductStoreRow = {
  product_url: string | null;
  stores: StoreRow | null;
};

/** The stores that sell one product. */
export async function fetchStoresForProduct(productId: string): Promise<StoreForProduct[]> {
  const { data, error } = await supabase
    .from('product_stores')
    .select(`product_url, stores ( ${STORE_COLUMNS} )`)
    .eq('product_id', productId);
  if (error) throw error;

  return (data as unknown as ProductStoreRow[])
    .flatMap((row) => (row.stores ? [{ ...toStore(row.stores), link: row.product_url ?? row.stores.website_url }] : []))
    .sort(byName);
}
