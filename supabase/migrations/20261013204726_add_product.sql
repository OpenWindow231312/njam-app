-- Add a product: a shopper who scans a barcode Njam does not know can add it
-- to the shared catalogue with two photos, the ingredient list and the front
-- of the pack. The product goes in unverified, so the verdict engine caps it
-- at Caution until an admin checks it in the review queue.

-- ---------------------------------------------------------------------------
-- Two new product columns
-- ---------------------------------------------------------------------------

-- Allergens from the label's "may contain" line. Without this a saved
-- product would lose the warning the label read gave, and come out less
-- strict than the scan that created it.
alter table public.products
  add column may_contain text[] not null default '{}';

-- The ingredient list photo, so an admin can check the list against it.
-- image_url (already there) holds the front of the pack.
alter table public.products
  add column label_image_url text;

-- ---------------------------------------------------------------------------
-- Storage for the photos
-- ---------------------------------------------------------------------------

-- Public, because these are photos of shop packaging, not of people: the app
-- shows them by URL. Only JPEGs (what the camera saves), at most 5 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg']);

-- You may upload only into a folder named after your own user id, so nobody
-- can overwrite someone else's photo. No update policy: a photo is never
-- replaced, a new one is added.
create policy product_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy product_photos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and public.is_admin());

-- ---------------------------------------------------------------------------
-- add_product: the product, its ingredients and their order, in one go
-- ---------------------------------------------------------------------------

-- One function rather than many inserts from the app, so it all happens or
-- none of it does. A product saved with half its ingredient list could hide
-- an allergen.
--
-- security invoker: it runs as the person calling it, so the RLS policies
-- above still apply (created_by must be you, verified must be false).
--
-- An ingredient already in the catalogue is reused, but only when the
-- catalogue tags it at least as strictly as this label read did. If the label
-- read found an allergen or E-number the catalogue row lacks, saving stops:
-- reusing the row would quietly drop that allergen. The person still sees
-- the verdict from the label itself.
--
-- The barcode is unique, so two people adding the same product at the same
-- moment cannot make two rows. The second gets a unique_violation (23505)
-- and the app opens the product the first one saved.
create or replace function public.add_product(
  p_barcode text,
  p_name text,
  p_brand text,
  p_image_url text,
  p_label_image_url text,
  p_may_contain text[],
  p_ingredients jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_product_id uuid;
  v_item jsonb;
  v_name text;
  v_allergen text;
  v_allergen_id uuid;
  v_e_number text;
  v_existing record;
  v_ingredient_id uuid;
  v_position integer := 0;
begin
  if jsonb_typeof(p_ingredients) is distinct from 'array' or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'A product needs its ingredient list.' using errcode = '22023';
  end if;

  insert into public.products
    (barcode, name, brand, image_url, label_image_url, may_contain, verified, source, created_by)
  values
    (trim(p_barcode), trim(p_name), nullif(trim(p_brand), ''), p_image_url, p_label_image_url,
     coalesce(p_may_contain, '{}'), false, 'ai_label_read', auth.uid())
  returning id into v_product_id;

  for v_item in select value from jsonb_array_elements(p_ingredients) loop
    v_name := lower(trim(v_item ->> 'name'));
    v_allergen := nullif(v_item ->> 'allergen', '');
    v_e_number := nullif(v_item ->> 'eNumber', '');
    continue when v_name is null or v_name = '';

    v_allergen_id := null;
    if v_allergen is not null then
      select id into v_allergen_id from public.allergens where slug = v_allergen;
      -- An allergen we do not track would be saved as no allergen at all.
      if v_allergen_id is null then
        raise exception 'Unknown allergen %.', v_allergen using errcode = '22023';
      end if;
    end if;

    -- The allergen the verdict engine would see for this row: its own, or
    -- its canonical ingredient's (the same fallback as the app).
    select i.id, coalesce(a.slug, ca.slug) as allergen, i.e_number
      into v_existing
      from public.ingredients i
      left join public.allergens a on a.id = i.allergen_id
      left join public.ingredients c on c.id = i.canonical_id
      left join public.allergens ca on ca.id = c.allergen_id
     where i.name = v_name;

    if not found then
      insert into public.ingredients (name, allergen_id, e_number)
      values (v_name, v_allergen_id, v_e_number)
      returning id into v_ingredient_id;
    else
      if (v_allergen is not null and v_existing.allergen is distinct from v_allergen)
         or (v_e_number is not null and v_existing.e_number is distinct from v_e_number) then
        raise exception 'The catalogue tags % differently from this label.', v_name
          using errcode = 'P0001', hint = 'ingredient_conflict';
      end if;
      v_ingredient_id := v_existing.id;
    end if;

    v_position := v_position + 1;
    -- A label that lists the same ingredient twice keeps its first place.
    insert into public.product_ingredients (product_id, ingredient_id, position)
    values (v_product_id, v_ingredient_id, v_position)
    on conflict do nothing;
  end loop;

  return v_product_id;
end;
$$;

-- Signed-in people only.
revoke execute on function public.add_product(text, text, text, text, text, text[], jsonb) from public, anon;
grant execute on function public.add_product(text, text, text, text, text, text[], jsonb) to authenticated;
