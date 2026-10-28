/**
 * Add a product: saves a product someone scanned and photographed into the
 * shared catalogue, so the next person who scans that barcode finds it.
 *
 * Anyone signed in can add one, whatever their role. It goes in unverified
 * (the database refuses anything else) and stays out of the feed until an
 * admin adds it from the review queue. For now its verdict is decided like a
 * verified one (see TRUST_SHOPPER_LISTS in the verdict engine).
 *
 * The ingredient list comes from a label photo. (A product Open Food Facts
 * has is saved by the import-open-food-facts Edge Function instead.)
 *
 * Two steps:
 *   1. The photos go to Storage, in a folder named after you. The Storage
 *      policy refuses any other folder.
 *   2. add_product (a database function) saves the product, its ingredients
 *      and their order in one transaction, so a product can never be saved
 *      with half its ingredient list.
 */
import { supabase } from '@/lib/supabase';
import type { FrontRead, LabelRead } from '@/services/ai';

const BUCKET = 'product-photos';

/** Someone else saved this barcode first, maybe a moment ago. */
export class ProductExistsError extends Error {}

/** The camera's base64 as bytes, for Storage. atob is built into React Native. */
function toBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

/** Uploads one JPEG and returns its public URL. */
async function uploadPhoto(path: string, base64: string): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, toBytes(base64), { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function addProduct(input: {
  userId: string;
  barcode: string;
  front: FrontRead & { name: string };
  label: LabelRead;
  frontPhotoBase64: string;
  labelPhotoBase64: string;
}): Promise<string> {
  // The time keeps each upload's name new, so a photo is never overwritten.
  const prefix = `${input.userId}/${input.barcode}-${Date.now()}`;
  const [imageUrl, labelImageUrl] = await Promise.all([
    uploadPhoto(`${prefix}-front.jpg`, input.frontPhotoBase64),
    uploadPhoto(`${prefix}-label.jpg`, input.labelPhotoBase64),
  ]);

  const { data, error } = await supabase.rpc('add_product', {
    p_barcode: input.barcode,
    p_name: input.front.name,
    p_brand: input.front.brand,
    p_image_url: imageUrl,
    p_label_image_url: labelImageUrl,
    p_may_contain: input.label.mayContain,
    p_ingredients: input.label.ingredients,
    p_source: 'ai_label_read',
  });

  if (error) {
    // 23505 is Postgres for "already exists": the barcode is unique.
    if (error.code === '23505' && error.message.includes('products_barcode_key')) {
      throw new ProductExistsError('Someone added this product already.');
    }
    throw error;
  }
  return data as string;
}

/**
 * Adds the front-of-pack photo to a product that has none. The photo goes to
 * your folder in Storage, then add_product_photo (a database function) puts
 * it on the product, but only while it still has no photo: if someone else
 * got there first, theirs stays and this one is simply not used.
 */
export async function addProductPhoto(input: {
  userId: string;
  productId: string;
  barcode: string;
  photoBase64: string;
}): Promise<void> {
  const imageUrl = await uploadPhoto(`${input.userId}/${input.barcode}-${Date.now()}-front.jpg`, input.photoBase64);
  const { error } = await supabase.rpc('add_product_photo', {
    p_product_id: input.productId,
    p_image_url: imageUrl,
  });
  if (error) throw error;
}
