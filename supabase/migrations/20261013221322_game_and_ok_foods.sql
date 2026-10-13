-- Njam: Game and OK Foods, with their logos
--
-- Data only. Like Makro and Food Lover's Market, neither is linked to a
-- product yet, so the Store filter finds nothing for them until
-- product_stores says otherwise. Each logo is a 256 x 256 PNG in the public
-- store-logos bucket, named by slug.

insert into public.stores (name, slug, website_url, logo_url) values
  ('Game',     'game',     'https://www.game.co.za',
   'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/store-logos/game.png'),
  ('OK Foods', 'ok-foods', 'https://www.okfoods.co.za',
   'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/store-logos/ok-foods.png')
on conflict (slug) do nothing;
