-- Njam: logos for five more stores
--
-- Data only. Same as the first five: a 256 x 256 PNG per store in the public
-- store-logos bucket, named by slug. Until a file is uploaded the app shows
-- the storefront icon instead.

update public.stores
set logo_url = 'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/store-logos/' || slug || '.png'
where slug in ('shoprite', 'makro', 'food-lovers-market', 'woolworths', 'dis-chem');
