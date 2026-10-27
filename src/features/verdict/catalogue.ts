/**
 * Reads products out of the shared catalogue, shaped for the verdict engine.
 *
 * One query fetches a product with its ingredient list, and for each
 * ingredient its allergen and the canonical ingredient it is an alias of.
 * That is the alias chain the engine relies on: "milk solids" arrives
 * already knowing it is milk.
 */
import { supabase } from '@/lib/supabase';
import { isCompleteList, type VerdictIngredient } from '@/services/verdict';

export type CatalogueProduct = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
  verified: boolean;
  source: 'user' | 'ai_label_read' | 'open_food_facts' | 'seed' | 'admin';
  /**
   * In label order. An ingredient the label tagged differently from the
   * catalogue appears twice, once with each set of tags, so the engine
   * checks both and the stricter one counts.
   */
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
    position, label_e_number,
    label_allergen:label_allergen_id ( slug ),
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
  product_ingredients: {
    position: number;
    label_e_number: string | null;
    label_allergen: Slug;
    ingredients: IngredientRow | null;
  }[];
};

function toProduct(row: ProductRow): CatalogueProduct {
  const ingredients = [...row.product_ingredients]
    .sort((a, b) => a.position - b.position)
    .flatMap((link) => {
      const item = link.ingredients;
      if (!item) return [];
      const catalogue: VerdictIngredient = {
        name: item.name,
        canonicalName: item.canonical?.name ?? null,
        // The alias carries its own allergen, but fall back to the canonical
        // one so a missing link on the alias can never hide an allergen.
        allergen: item.allergen?.slug ?? item.canonical?.allergen?.slug ?? null,
        eNumber: item.e_number,
      };
      // The label tagged it differently when it was added: check the label's
      // tags as well, so saving the product never made its verdict laxer.
      if (!link.label_allergen && !link.label_e_number) return [catalogue];
      const label: VerdictIngredient = {
        ...catalogue,
        allergen: link.label_allergen?.slug ?? catalogue.allergen,
        eNumber: link.label_e_number ?? catalogue.eNumber,
      };
      return [catalogue, label];
    });

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

/** Supabase returns at most this many rows per request. */
const ROWS_PER_REQUEST = 1000;

/** A name shorter than this ("f") is a placeholder, not a product name. */
const MIN_NAME_LENGTH = 4;

/**
 * Should this product show on Home? Verified ones always do. So does an Open
 * Food Facts product with a real name and a whole ingredient list. A thin one
 * stays hidden, though the scanner still finds it by barcode (as Caution).
 */
function isShownOnHome(product: CatalogueProduct): boolean {
  if (product.verified) return true;
  return product.name.trim().length >= MIN_NAME_LENGTH && isCompleteList(product.ingredients);
}

/**
 * The catalogue for the grid on Home, A to Z: verified products and complete
 * Open Food Facts ones, about a thousand. Home loads them all once and
 * filters on the phone, so this reads them in pages of a thousand rows.
 */
export async function fetchCatalogue(): Promise<CatalogueProduct[]> {
  // A product a shopper just added is not in the feed until an admin verifies
  // it from the review queue. Its scanner still finds it by barcode.
  const rows: ProductRow[] = [];
  for (let from = 0; ; from += ROWS_PER_REQUEST) {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .or('verified.eq.true,source.eq.open_food_facts')
      .order('name')
      .order('id')
      .range(from, from + ROWS_PER_REQUEST - 1);
    if (error) throw error;
    rows.push(...(data as unknown as ProductRow[]));
    if (data.length < ROWS_PER_REQUEST) break;
  }
  return rows.map(toProduct).filter(isShownOnHome);
}

/**
 * The ingredient names to show, in label order, each once. An ingredient
 * with label tags appears twice in `ingredients` (see above), never on screen.
 */
export function ingredientNames(product: { ingredients: VerdictIngredient[] }): string[] {
  return [...new Set(product.ingredients.map((item) => item.name))];
}

/** "1000 ml": the pack size, or null when it is not known. */
export function packSize(product: { servingSize: number | null; servingUnit: string | null }): string | null {
  return product.servingSize && product.servingUnit ? `${product.servingSize} ${product.servingUnit}` : null;
}

/** "Clover · 1000 ml": the brand and pack size, for ProductCard. */
export function productDetail(product: {
  brand: string | null;
  servingSize: number | null;
  servingUnit: string | null;
}): string {
  return [product.brand, packSize(product)].filter(Boolean).join(' · ');
}
