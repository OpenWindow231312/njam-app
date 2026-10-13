-- Njam: Makro and Food Lover's Market, and the first store logos
--
-- Data only, no schema change.
--
-- The logos are square PNGs (256 x 256) in the public store-logos bucket,
-- named by slug and uploaded from the Supabase dashboard. logo_url holds each
-- file's public address. Until a file is uploaded the app cannot load it and
-- shows the storefront icon instead, so setting the address first is safe.
--
-- Makro and Food Lover's Market are not linked to any product yet, so the
-- Store filter finds nothing for them until product_stores says otherwise.

insert into public.stores (name, slug, website_url) values
  ('Makro',                'makro',              'https://www.makro.co.za'),
  ('Food Lover''s Market', 'food-lovers-market', 'https://www.foodloversmarket.co.za')
on conflict (slug) do nothing;

update public.stores
set logo_url = 'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/store-logos/' || slug || '.png'
where slug in ('checkers', 'clicks', 'pick-n-pay', 'spar', 'takealot');
