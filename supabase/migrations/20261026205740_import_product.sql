-- Import from Open Food Facts: fills the shared catalogue with South African
-- products from Open Food Facts (openfoodfacts.org), so Home and Search have
-- more than the hand-seeded few.
--
-- Only the import-open-food-facts Edge Function calls this, with the service
-- role. The app cannot: execute is revoked from everyone else below.
--
-- Licence: the data is ODbL and the photos CC BY-SA, from Open Food Facts and
-- its contributors. Photos load from Open Food Facts' own image server.

-- ---------------------------------------------------------------------------
-- add_product may be called by the service role too
-- ---------------------------------------------------------------------------

-- import_product reuses add_product, so an imported product's ingredients are
-- linked exactly the way a scanned one's are: same alias reuse, same label
-- tags kept on the link, never laxer than the source.
grant execute on function public.add_product(text, text, text, text, text, text[], jsonb, text) to service_role;

-- ---------------------------------------------------------------------------
-- import_product: one Open Food Facts product, with its extras
-- ---------------------------------------------------------------------------

-- Everything add_product saves, plus what Open Food Facts gives and a scan
-- does not: the pack size, the aisle and the nutrition table.
--
-- Returns null, and changes nothing, when the barcode is already in the
-- catalogue. An import never overwrites a seeded, scanned or verified product.
--
-- The product is saved unverified with source 'open_food_facts' (add_product
-- does that), so the verdict engine caps it at Caution. Anyone can edit Open
-- Food Facts, so nothing from it can be Safe until an admin checks it.
--
-- p_category_slug is one of categories.slug, or null for no aisle.
-- p_nutrition is null, or per 100 g (or 100 ml):
--   { "perBasis": "100g", "energyKj": 1584, "proteinG": 13.1, "carbsG": 57,
--     "sugarG": 1.5, "fatG": 7.9, "satFatG": 1.6, "fibreG": 11.6, "sodiumMg": 5 }
-- Any of its numbers may be null.
create or replace function public.import_product(
  p_barcode text,
  p_name text,
  p_brand text,
  p_image_url text,
  p_serving_size numeric,
  p_serving_unit text,
  p_category_slug text,
  p_may_contain text[],
  p_ingredients jsonb,
  p_nutrition jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id uuid;
begin
  if exists (select 1 from public.products where barcode = trim(p_barcode)) then
    return null;
  end if;

  v_product_id := public.add_product(
    p_barcode, p_name, p_brand, p_image_url, null, p_may_contain, p_ingredients, 'open_food_facts'
  );

  update public.products
     set serving_size = p_serving_size,
         serving_unit = nullif(trim(p_serving_unit), ''),
         category_id = (select id from public.categories where slug = p_category_slug)
   where id = v_product_id;

  if p_nutrition is not null then
    insert into public.nutrition_facts
      (product_id, per_basis, energy_kj, protein_g, carbs_g, sugar_g, fat_g, sat_fat_g, fibre_g, sodium_mg)
    values (
      v_product_id,
      coalesce(p_nutrition ->> 'perBasis', '100g'),
      (p_nutrition ->> 'energyKj')::numeric,
      (p_nutrition ->> 'proteinG')::numeric,
      (p_nutrition ->> 'carbsG')::numeric,
      (p_nutrition ->> 'sugarG')::numeric,
      (p_nutrition ->> 'fatG')::numeric,
      (p_nutrition ->> 'satFatG')::numeric,
      (p_nutrition ->> 'fibreG')::numeric,
      (p_nutrition ->> 'sodiumMg')::numeric
    );
  end if;

  return v_product_id;
end;
$$;

-- The Edge Function only. New functions are executable by everyone by
-- default, so take that away first.
revoke execute on function public.import_product(text, text, text, text, numeric, text, text, text[], jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.import_product(text, text, text, text, numeric, text, text, text[], jsonb, jsonb)
  to service_role;
