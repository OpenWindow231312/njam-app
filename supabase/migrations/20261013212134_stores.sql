-- Njam: where a product is sold
--
-- Two new tables, Row Level Security on both from the start.
--   stores          the shops and websites Njam knows: Checkers, Woolworths,
--                   Takealot. Each has a website.
--   product_stores  which product is sold where, with an optional link to
--                   that product on the store's own website.
--
-- Like categories, these are shared catalogue data: everyone signed in reads
-- them, only an admin changes them.

create table public.stores (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  website_url  text not null
);

create table public.product_stores (
  product_id   uuid not null references public.products (id) on delete cascade,
  store_id     uuid not null references public.stores (id) on delete cascade,
  -- The product's own page on the store's website, when we know it.
  -- Without one, the app opens the store's website.
  product_url  text,
  primary key (product_id, store_id)
);

-- The primary key covers lookups by product. This one is for the Store
-- filter on Home, which looks up by store.
create index product_stores_store_id_idx on public.product_stores (store_id);

alter table public.stores         enable row level security;
alter table public.product_stores enable row level security;

create policy stores_select on public.stores
  for select to authenticated using (true);
create policy stores_write on public.stores
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy product_stores_select on public.product_stores
  for select to authenticated using (true);
create policy product_stores_write on public.product_stores
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Seed: South African grocers, pharmacies and online shops
-- ---------------------------------------------------------------------------

insert into public.stores (name, slug, website_url) values
  ('Checkers',    'checkers',   'https://www.checkers.co.za'),
  ('Woolworths',  'woolworths', 'https://www.woolworths.co.za'),
  ('Pick n Pay',  'pick-n-pay', 'https://www.pnp.co.za'),
  ('Shoprite',    'shoprite',   'https://www.shoprite.co.za'),
  ('Spar',        'spar',       'https://www.spar.co.za'),
  ('Dis-Chem',    'dis-chem',   'https://www.dischem.co.za'),
  ('Clicks',      'clicks',     'https://clicks.co.za'),
  ('Takealot',    'takealot',   'https://www.takealot.com')
on conflict (slug) do nothing;

-- The 25 seeded products are national brands that the four big grocers all
-- stock, so each is linked to those four. This is demo data, not checked
-- against any store's shelves. The seed's barcodes all start 2000000000.
insert into public.product_stores (product_id, store_id)
select p.id, s.id
from public.products p
cross join public.stores s
where p.barcode like '2000000000%'
  and s.slug in ('checkers', 'pick-n-pay', 'shoprite', 'spar')
on conflict do nothing;
