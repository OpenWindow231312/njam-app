-- Njam: link Makro, Game, OK Foods and Food Lover's Market to seeded products
--
-- Data only. Demo data, like the first seed of product_stores: each store is
-- linked to the aisles it is known for, not checked against its shelves.
--   OK Foods            a full grocer: every seeded product.
--   Makro, Game         bulk and general retailers: shelf-stable aisles only,
--                       no fresh dairy or bread.
--   Food Lover's Market fresh food first: dairy, bread, cereals, spreads,
--                       biscuits and drinks.
-- The seed's barcodes all start 2000000000.

insert into public.product_stores (product_id, store_id)
select p.id, s.id
from public.products p
join public.categories c on c.id = p.category_id
cross join public.stores s
where p.barcode like '2000000000%'
  and (
    s.slug = 'ok-foods'
    or (s.slug in ('makro', 'game')
        and c.slug in ('cereals', 'pantry', 'tins-jars', 'sauces-spreads', 'biscuits-rusks', 'snacks', 'drinks'))
    or (s.slug = 'food-lovers-market'
        and c.slug in ('dairy-eggs', 'bakery', 'cereals', 'sauces-spreads', 'biscuits-rusks', 'drinks'))
  )
on conflict do nothing;
