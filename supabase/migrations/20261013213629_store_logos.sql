-- Njam: store logos, and an "Other" store
--
-- Each store gets a logo, shown in a round white badge in the filter sheet
-- and under "Where to buy it". The logos are image files in a public
-- Storage bucket, store-logos, one per store, named after its slug
-- (checkers.png). logo_url holds the file's public address; while it is
-- empty the app shows the storefront icon instead.
--
-- "Other" is for a product sold somewhere not on the list: a spaza shop,
-- a market, a farm stall. It has no website, so website_url may now be empty.

alter table public.stores
  add column logo_url text;

alter table public.stores
  alter column website_url drop not null;

insert into public.stores (name, slug, website_url) values
  ('Other', 'other', null)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Storage for the logos
-- ---------------------------------------------------------------------------

-- Public, because a shop's logo is public already. PNG, JPEG or WebP (what
-- the app's Image can draw), at most 1 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-logos', 'store-logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Only an admin adds, replaces or removes a logo. Uploading from the
-- Supabase dashboard works as well, because the dashboard skips RLS.
create policy store_logos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-logos' and (select public.is_admin()));

create policy store_logos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'store-logos' and (select public.is_admin()))
  with check (bucket_id = 'store-logos' and (select public.is_admin()));

create policy store_logos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-logos' and (select public.is_admin()));
