-- Add a product photo: a shopper who scans a product that has no photo of the
-- front of the pack is asked for one before its verdict opens. This saves it.
--
-- Only an admin may update a product (products_update, in the first
-- migration), and that stays so. This function lets anyone signed in do one
-- thing only: fill image_url while it is still empty. It never replaces a
-- photo, and it touches nothing else, so it cannot change a verdict.

-- security definer: it runs as the owner, so it can update past
-- products_update. That is why it checks everything itself:
--   * you are signed in;
--   * the photo is in your own folder of the product-photos bucket, where
--     product_photos_insert only lets you upload, so nobody can point a
--     product at a file somewhere else;
--   * the product has no photo yet (a second shopper's photo is ignored).
-- Returns true if the photo was saved, false if the product already had one.
create or replace function public.add_product_photo(
  p_product_id uuid,
  p_image_url text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_folder text := '/storage/v1/object/public/product-photos/' || (select auth.uid())::text || '/';
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in to add a photo.' using errcode = '42501';
  end if;

  if position(v_folder in p_image_url) = 0 then
    raise exception 'The photo must be one you uploaded.' using errcode = '22023';
  end if;

  update public.products
     set image_url = p_image_url
   where id = p_product_id
     and image_url is null;

  return found;
end;
$$;

revoke execute on function public.add_product_photo(uuid, text) from public, anon;
grant execute on function public.add_product_photo(uuid, text) to authenticated;
