-- Njam: a "retailer" source, and a bucket for product photos
--
-- Products can now come from a retailer's website (source 'retailer').
-- Their pack shots go in the product-photos bucket, at its top level, named
-- after the barcode (6009522310622.jpg). The products themselves arrive in
-- the next migration, after the photos are uploaded, so no image address
-- ever points at a missing file.

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

-- product-photos already existed: add_product (20261013204726) made it for
-- the photos shoppers take, kept in one folder per person. So this insert
-- changed nothing, and the bucket keeps its own settings (public, JPEG, up
-- to 5 MB), which the Pick n Pay JPEGs (40 to 260 KB) fit. It stays here
-- because this is what ran.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
