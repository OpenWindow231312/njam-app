/**
 * Reads products out of the shared catalogue, shaped for the verdict engine.
 *
 * One query fetches a product with its ingredient list, and for each
 * ingredient its allergen and the canonical ingredient it is an alias of.
 * That is the alias chain the engine relies on: "milk solids" arrives
 * already knowing it is milk.
 */
import { supabase } from '@/lib/supabase';
import type { VerdictIngredient } from '@/services/verdict';

export type CatalogueProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  verified: boolean;
  source: 'user' | 'ai_label_read' | 'seed' | 'admin';
  /** In label order. */
  ingredients: VerdictIngredient[];
  /** Allergen slugs from the label's "may contain" line. */
  mayContain: string[];
  /** The front of the pack, when someone photographed it. */
  imageUrl: string | null;
  /** The ingredient list photo it was read from, for the review queue. */
  labelImageUrl: string | null;
  /** The aisle it sits in, for the category chips on Home. */
  categoryId: string | null;
  /** The stores that sell it, for the Store filter on Home. */
  storeIds: string[];
};

// "allergen:allergen_id(slug)" means: follow the allergen_id foreign key and
// call the result "allergen". canonical_id points back at ingredients itself.
const PRODUCT_COLUMNS = `
  id, barcode, name, brand, serving_size, serving_unit, verified, source,
  may_contain, image_url, label_image_url, category_id,
  product_stores ( store_id ),
  product_ingredients (
    position,
    ingredients (
      name, e_number,
      allergen:allergen_id ( slug ),
      canonical:canonical_id ( name, allergen:allergen_id ( slug ) )
    )
  )
`;

type Slug = { slug: string } | null;
type IngredientRow = {
  name: string;
  e_number: string | null;
  allergen: Slug;
  canonical: { name: string; allergen: Slug } | null;
};
type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  serving_size: number | null;
  serving_unit: string | null;
  verified: boolean;
  source: CatalogueProduct['source'];
  may_contain: string[];
  image_url: string | null;
  label_image_url: string | null;
  category_id: string | null;
  product_stores: { store_id: string }[];
  product_ingredients: { position: number; ingredients: IngredientRow | null }[];
};

function toProduct(row: ProductRow): CatalogueProduct {
  const ingredients = [...row.product_ingredients]
    .sort((a, b) => a.position - b.position)
    .flatMap((link) => (link.ingredients ? [link.ingredients] : []))
    .map((item) => ({
      name: item.name,
      canonicalName: item.canonical?.name ?? null,
      // The alias carries its own allergen, but fall back to the canonical
      // one so a missing link on the alias can never hide an allergen.
      allergen: item.allergen?.slug ?? item.canonical?.allergen?.slug ?? null,
      eNumber: item.e_number,
    }));

  return {
    id: row.id,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    verified: row.verified,
    source: row.source,
    ingredients,
    mayContain: row.may_contain,
    imageUrl: row.image_url,
    labelImageUrl: row.label_image_url,
    categoryId: row.category_id,
    storeIds: row.product_stores.map((link) => link.store_id),
  };
}

export async function fetchProductById(id: string): Promise<CatalogueProduct | null> {
  const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as unknown as ProductRow) : null;
}

export async function fetchProductByBarcode(barcode: string): Promise<CatalogueProduct | null> {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_COLUMNS)
    .eq('barcode', barcode)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data as unknown as ProductRow) : null;
}

/**
 * The whole catalogue, A to Z, for the grid on Home. It holds a few dozen
 * products for now, so Home loads them all once and filters on the phone.
 * When the catalogue grows past a few hundred, this needs paging.
 */
export async function fetchCatalogue(): Promise<CatalogueProduct[]> {
  const { data, error } = await supabase.from('products').select(PRODUCT_COLUMNS).order('name');
  if (error) throw error;
  return (data as unknown as ProductRow[]).map(toProduct);
}

/** "Clover · 1000 ml": the brand and pack size, for ProductCard. */
export function productDetail(product: {
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
}): string {
  const size = product.servingSize && product.servingUnit ? `${product.servingSize} ${product.servingUnit}` : null;
  return [product.brand, size].filter(Boolean).join(' · ');
}
