-- Njam: an admin edits a product's name, brand, barcode and ingredient list
--
-- The policies already let only an admin update a product and its ingredient
-- links (products_update, product_ingredients_write and _delete, in the first
-- migration). This function does the edit in one transaction, so a product is
-- never left with half its ingredient list if the phone loses signal.
--
-- Security invoker: it runs as the person calling it, so RLS still applies.
-- The is_admin() check at the top only gives a clear error instead of an
-- edit that silently changes nothing.
--
-- The ingredient list is replaced in the order given, matched to the shared
-- ingredients table by name, the same way add_product does it:
--   * a name already in the catalogue links to that row, so it keeps its
--     allergen, E-number and alias;
--   * a new name is added with no tags. The verdict engine still checks it by
--     name against its alias lists (src/services/verdict/aliases.ts), so
--     "whey" is still read as milk;
--   * an ingredient that stays on the list keeps the label tags it was saved
--     with (label_allergen_id, label_e_number), so editing never drops an
--     allergen the label photo showed.

create or replace function public.update_product(
  p_product_id uuid,
  p_name text,
  p_brand text,
  p_barcode text,
  p_ingredients text[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_name text;
  v_ingredient_id uuid;
  v_position integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can edit a product.' using errcode = '42501';
  end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_barcode), '') is null then
    raise exception 'A product needs a name and a barcode.' using errcode = '22023';
  end if;

  update public.products
     set name = trim(p_name),
         brand = nullif(trim(p_brand), ''),
         barcode = trim(p_barcode)
   where id = p_product_id;
  if not found then
    raise exception 'No product with id %.', p_product_id using errcode = 'P0002';
  end if;

  -- Keep the old links' label tags to put back on the ingredients that stay.
  create temporary table old_links on commit drop as
    select ingredient_id, label_allergen_id, label_e_number
      from public.product_ingredients
     where product_id = p_product_id;

  delete from public.product_ingredients where product_id = p_product_id;

  foreach v_name in array coalesce(p_ingredients, '{}') loop
    v_name := lower(trim(v_name));
    continue when v_name is null or v_name = '';

    select id into v_ingredient_id from public.ingredients where name = v_name;
    if not found then
      insert into public.ingredients (name) values (v_name) returning id into v_ingredient_id;
    end if;

    v_position := v_position + 1;
    -- A list that names the same ingredient twice keeps its first place.
    insert into public.product_ingredients
      (product_id, ingredient_id, position, label_allergen_id, label_e_number)
    select p_product_id, v_ingredient_id, v_position, old.label_allergen_id, old.label_e_number
      from (select 1) as one
      left join old_links old on old.ingredient_id = v_ingredient_id
    on conflict do nothing;
  end loop;
end;
$$;

-- Signed-in people only. Anyone but an admin is refused inside.
revoke execute on function public.update_product(uuid, text, text, text, text[]) from public, anon;
grant execute on function public.update_product(uuid, text, text, text, text[]) to authenticated;
