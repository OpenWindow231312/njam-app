-- Njam: a "retailer" source, and a bucket for product photos
--
-- Products can now come from a retailer's website (source 'retailer'), and
-- their pack shots live in a public Storage bucket, product-photos, one per
-- product, named after its barcode (6009522310622.jpg). The products
-- themselves arrive in the next migration, after the photos are uploaded,
-- so no image address ever points at a missing file.

-- ---------------------------------------------------------------------------
-- A source for products read from a retailer's website
-- ---------------------------------------------------------------------------

alter table public.products drop constraint products_source_check;
alter table public.products
  add constraint products_source_check
  check (source in ('user', 'ai_label_read', 'open_food_facts', 'retailer', 'seed', 'admin'));

-- ---------------------------------------------------------------------------
-- Storage for the photos
-- ---------------------------------------------------------------------------

-- Public, like store-logos: a pack shot is public already. JPEG, PNG or
-- WebP, at most 1 MB each (the Pick n Pay ones are about 40 to 260 KB).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
