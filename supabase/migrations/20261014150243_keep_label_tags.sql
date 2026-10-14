-- A scanned product always saves, with its photo, even when the label tags an
-- ingredient differently from the catalogue. Before this, add_product stopped
-- with "ingredient_conflict" and the person saw the verdict without a photo.
--
-- Products found in Open Food Facts are saved too now, with the front photo
-- the person takes, so they need their own source.

-- ---------------------------------------------------------------------------
-- What the label said, kept on the product's own ingredient link
-- ---------------------------------------------------------------------------

-- Filled only when the label tags an ingredient differently from the shared
-- catalogue row it was linked to. The app checks both the catalogue's tags
-- and these, so the stricter one always counts and saving can never drop an
-- allergen or E-number. The catalogue row itself is left alone: only an
-- admin changes it.
alter table public.product_ingredients
  add column label_allergen_id uuid references public.allergens (id),
  add column label_e_number text;

-- ---------------------------------------------------------------------------
-- A source for products whose ingredients came from Open Food Facts
-- ---------------------------------------------------------------------------

alter table public.products drop constraint products_source_check;
alter table public.products
  add constraint products_source_check
  check (source in ('user', 'ai_label_read', 'open_food_facts', 'seed', 'admin'));

-- ---------------------------------------------------------------------------
-- add_product, again: keeps a conflicting tag instead of refusing to save
-- ---------------------------------------------------------------------------

-- The new p_source parameter changes the signature, so the old one goes first.
drop function public.add_product(text, text, text, text, text, text[], jsonb);

-- Same as before (security invoker, one transaction, unverified), except:
--   * p_source says where the ingredient list came from. p_label_image_url
--     is null for Open Food Facts, which has no label photo.
--   * An ingredient the catalogue tags differently is still linked, and the
--     label's tags are kept on the link (see above), instead of raising.
create or replace function public.add_product(
  p_barcode text,
  p_name text,
  p_brand text,
  p_image_url text,
  p_label_image_url text,
  p_may_contain text[],
  p_ingredients jsonb,
  p_source text default 'ai_label_read'
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
  v_label_allergen_id uuid;
  v_label_e_number text;
  v_position integer := 0;
begin
  if jsonb_typeof(p_ingredients) is distinct from 'array' or jsonb_array_length(p_ingredients) = 0 then
    raise exception 'A product needs its ingredient list.' using errcode = '22023';
  end if;
  if p_source not in ('ai_label_read', 'open_food_facts') then
    raise exception 'Unknown source %.', p_source using errcode = '22023';
  end if;

  insert into public.products
    (barcode, name, brand, image_url, label_image_url, may_contain, verified, source, created_by)
  values
    (trim(p_barcode), trim(p_name), nullif(trim(p_brand), ''), p_image_url, p_label_image_url,
     coalesce(p_may_contain, '{}'), false, p_source, auth.uid())
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

    v_label_allergen_id := null;
    v_label_e_number := null;
    if not found then
      insert into public.ingredients (name, allergen_id, e_number)
      values (v_name, v_allergen_id, v_e_number)
      returning id into v_ingredient_id;
    else
      v_ingredient_id := v_existing.id;
      -- The label tags it differently: keep the label's tag on this link.
      if v_allergen is not null and v_existing.allergen is distinct from v_allergen then
        v_label_allergen_id := v_allergen_id;
      end if;
      if v_e_number is not null and v_existing.e_number is distinct from v_e_number then
        v_label_e_number := v_e_number;
      end if;
    end if;

    v_position := v_position + 1;
    -- A label that lists the same ingredient twice keeps its first place.
    insert into public.product_ingredients
      (product_id, ingredient_id, position, label_allergen_id, label_e_number)
    values (v_product_id, v_ingredient_id, v_position, v_label_allergen_id, v_label_e_number)
    on conflict do nothing;
  end loop;

  return v_product_id;
end;
$$;

-- Signed-in people only.
revoke execute on function public.add_product(text, text, text, text, text, text[], jsonb, text) from public, anon;
grant execute on function public.add_product(text, text, text, text, text, text[], jsonb, text) to authenticated;
