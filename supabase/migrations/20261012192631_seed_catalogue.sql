-- Njam: seed catalogue
--
-- 25 South African grocery products with ordered ingredient lists, so search,
-- the scanner and the verdict screen have something real to work on before
-- the "Add a product" flow exists.
--
-- READ BEFORE THE DEMO
--   * Ingredient lists are typed from the public labels as best remembered.
--     They are short on purpose and must be checked against the actual pack
--     before anyone relies on a verdict for them.
--   * Barcodes use the GS1 "200" prefix, which is reserved for in-store use
--     and never printed on a branded product. That way a seeded record can
--     never be mistaken for a different real product. To scan a real pack,
--     replace the barcode with the one the scanner reads:
--       update public.products set barcode = '6001234567890' where name = '...';
--   * 22 products are verified seed records. 3 are marked as AI label reads
--     that nobody has checked (verified = false), so the Caution cap can be
--     shown in a demo.
--   * Nutrition facts are left out for now rather than guessed.
--
-- Everything here is data, not schema, and is safe to run twice: every
-- insert skips rows that already exist.

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug) values
  ('Dairy and eggs',        'dairy-eggs'),
  ('Bread and bakery',      'bakery'),
  ('Breakfast cereals',     'cereals'),
  ('Pantry staples',        'pantry'),
  ('Tins and jars',         'tins-jars'),
  ('Sauces and spreads',    'sauces-spreads'),
  ('Biscuits and rusks',    'biscuits-rusks'),
  ('Snacks',                'snacks'),
  ('Drinks',                'drinks')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Canonical ingredients
-- ---------------------------------------------------------------------------

-- The real thing an alias points at. Allergens hang off these rows.
insert into public.ingredients (name, allergen_id, e_number)
select v.name, a.id, v.e_number
from (values
  ('milk',     'milk',    null),
  ('egg',      'egg',     null),
  ('fish',     'fish',    null),
  ('peanut',   'peanut',  null),
  ('soy',      'soy',     null),
  ('wheat',    'gluten',  null),
  ('barley',   'gluten',  null),
  ('oats',     'gluten',  null),
  ('maize',    null,      null),
  ('rice',     null,      null),
  ('sugar',    null,      null),
  ('salt',     null,      null),
  ('water',    null,      null),
  ('vegetable oil', null, null),
  ('palm oil', null,      null),
  ('tomato',   null,      null),
  ('potato',   null,      null),
  ('yeast',    null,      null),
  ('vinegar',  null,      null),
  ('spices',   null,      null),
  ('onion',    null,      null),
  ('garlic',   null,      null),
  ('cocoa',    null,      null),
  ('coconut',  null,      null),
  ('black tea', null,     null),
  ('apple',    null,      null),
  ('peach',    null,      null),
  ('apricot',  null,      null),
  ('beans',    null,      null),
  ('flavouring', null,    null),
  ('vitamins and minerals', null, null),
  ('raising agent', null, null),
  ('caffeine', null,      null),
  ('carbonated water', null, null),
  -- Additives, keyed by E-number so an E-number rule can find them.
  ('mono- and diglycerides of fatty acids', null, 'E471'),
  ('sodium stearoyl lactylate',             null, 'E481'),
  ('calcium propionate',                    null, 'E282'),
  ('sodium benzoate',                       null, 'E211'),
  ('potassium sorbate',                     null, 'E202'),
  ('sulphite ammonia caramel',              null, 'E150d'),
  ('phosphoric acid',                       null, 'E338'),
  ('monosodium glutamate',                  null, 'E621'),
  ('beta-carotene',                         null, 'E160a'),
  ('annatto',                               null, 'E160b'),
  ('citric acid',                           null, 'E330')
) as v(name, allergen_slug, e_number)
left join public.allergens a on a.slug = v.allergen_slug
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Aliases: the words a label actually uses
-- ---------------------------------------------------------------------------

-- Each alias points at its canonical ingredient AND carries the same allergen
-- itself. The engine follows canonical_id, but if that link were ever lost
-- the allergen would still be found on the alias. Redundant on purpose:
-- degrade toward Caution, never toward Safe.
insert into public.ingredients (name, canonical_id, allergen_id, e_number)
select v.alias, c.id, c.allergen_id, v.e_number
from (values
  ('milk solids',          'milk',   null),
  ('full cream milk',      'milk',   null),
  ('buttermilk powder',    'milk',   null),
  ('cream',                'milk',   null),
  ('whey powder',          'milk',   null),
  ('cheese',               'milk',   null),
  ('pasteurised milk',     'milk',   null),
  ('whole eggs',           'egg',    null),
  ('pilchards',            'fish',   null),
  ('peanuts',              'peanut', null),
  ('soya flour',           'soy',    null),
  ('soya lecithin',        'soy',    'E322'),
  ('wheat flour',          'wheat',  null),
  ('whole wheat',          'wheat',  null),
  ('barley malt extract',  'barley', null),
  ('wholegrain oats',      'oats',   null),
  ('maize meal',           'maize',  null),
  ('modified maize starch','maize',  null),
  ('maize starch',         'maize',  null),
  ('parboiled rice',       'rice',   null),
  ('tomato paste',         'tomato', null),
  ('golden syrup',         'sugar',  null),
  ('invert syrup',         'sugar',  null),
  ('vegetable fat',        'palm oil', null),
  ('apple juice from concentrate', 'apple', null),
  ('haricot beans',        'beans',  null)
) as v(alias, canonical, e_number)
join public.ingredients c on c.name = v.canonical
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

insert into public.products
  (barcode, name, brand, category_id, serving_size, serving_unit, verified, source)
select v.barcode, v.name, v.brand, c.id, v.size, v.unit, v.verified, v.source
from (values
  ('2000000000015', 'Fresh Full Cream Milk',          'Clover',        'dairy-eggs',     1000, 'ml', true,  'seed'),
  ('2000000000022', 'Ultra Mel Custard',              'Ultra Mel',     'dairy-eggs',     1000, 'ml', true,  'seed'),
  ('2000000000039', 'Mature Cheddar',                 'Lancewood',     'dairy-eggs',      450, 'g',  true,  'seed'),
  ('2000000000046', 'Large Eggs, 6 pack',             'Nulaid',        'dairy-eggs',        6, 'eggs', true, 'seed'),
  ('2000000000053', 'Superior White Bread',           'Albany',        'bakery',          700, 'g',  true,  'seed'),
  ('2000000000060', 'Jungle Oats',                    'Jungle',        'cereals',        1000, 'g',  true,  'seed'),
  ('2000000000077', 'Weet-Bix',                       'Bokomo',        'cereals',         450, 'g',  true,  'seed'),
  ('2000000000084', 'Milo',                           'Nestlé',        'drinks',          500, 'g',  true,  'seed'),
  ('2000000000091', 'Super Maize Meal',               'Iwisa',         'pantry',         2500, 'g',  true,  'seed'),
  ('2000000000107', 'Long Grain Parboiled Rice',      'Tastic',        'pantry',         2000, 'g',  true,  'seed'),
  ('2000000000114', 'White Sugar',                    'Huletts',       'pantry',         2500, 'g',  true,  'seed'),
  ('2000000000121', 'Smooth Peanut Butter',           'Black Cat',     'sauces-spreads',  400, 'g',  true,  'seed'),
  ('2000000000138', 'Tomato Sauce',                   'All Gold',      'sauces-spreads',  700, 'ml', true,  'seed'),
  ('2000000000145', 'Original Recipe Chutney',        'Mrs Ball''s',   'sauces-spreads',  470, 'g',  true,  'seed'),
  ('2000000000152', 'Original Spread',                'Rama',          'sauces-spreads',  500, 'g',  true,  'seed'),
  ('2000000000169', 'Baked Beans in Tomato Sauce',    'KOO',           'tins-jars',       410, 'g',  true,  'seed'),
  ('2000000000176', 'Pilchards in Tomato Sauce',      'Lucky Star',    'tins-jars',       400, 'g',  true,  'seed'),
  ('2000000000183', 'Buttermilk Rusks',               'Ouma',          'biscuits-rusks',  500, 'g',  true,  'seed'),
  ('2000000000190', 'Tennis Biscuits',                'Bakers',        'biscuits-rusks',  200, 'g',  true,  'seed'),
  ('2000000000206', 'Marie Biscuits',                 'Bakers',        'biscuits-rusks',  200, 'g',  true,  'seed'),
  ('2000000000213', 'Coca-Cola Original',             'Coca-Cola',     'drinks',         2000, 'ml', true,  'seed'),
  ('2000000000220', '100% Apple Juice',               'Liqui-Fruit',   'drinks',         1000, 'ml', true,  'seed'),
  -- Three unverified AI label reads. The engine caps these at Caution.
  ('2000000000237', 'Salt & Vinegar Chips',           'Simba',         'snacks',          120, 'g',  false, 'ai_label_read'),
  ('2000000000244', 'Cheese Nik Naks',                'Nik Naks',      'snacks',          135, 'g',  false, 'ai_label_read'),
  ('2000000000251', 'Beef Stock Cubes',               'Knorrox',       'pantry',          120, 'g',  false, 'ai_label_read')
) as v(barcode, name, brand, category_slug, size, unit, verified, source)
join public.categories c on c.slug = v.category_slug
on conflict (barcode) do nothing;

-- ---------------------------------------------------------------------------
-- Ingredient lists, in label order
-- ---------------------------------------------------------------------------

-- One row per ingredient: (barcode, position, ingredient name). Position 1 is
-- the largest by weight, as on the label.
insert into public.product_ingredients (product_id, ingredient_id, position)
select p.id, i.id, v.position
from (values
  -- Clover Fresh Full Cream Milk
  ('2000000000015', 1, 'pasteurised milk'),
  -- Ultra Mel Custard
  ('2000000000022', 1, 'full cream milk'),
  ('2000000000022', 2, 'sugar'),
  ('2000000000022', 3, 'modified maize starch'),
  ('2000000000022', 4, 'cream'),
  ('2000000000022', 5, 'flavouring'),
  ('2000000000022', 6, 'beta-carotene'),
  -- Lancewood Mature Cheddar
  ('2000000000039', 1, 'pasteurised milk'),
  ('2000000000039', 2, 'salt'),
  ('2000000000039', 3, 'annatto'),
  -- Nulaid Large Eggs
  ('2000000000046', 1, 'whole eggs'),
  -- Albany Superior White Bread
  ('2000000000053', 1, 'wheat flour'),
  ('2000000000053', 2, 'water'),
  ('2000000000053', 3, 'yeast'),
  ('2000000000053', 4, 'salt'),
  ('2000000000053', 5, 'soya flour'),
  ('2000000000053', 6, 'vegetable oil'),
  ('2000000000053', 7, 'sugar'),
  ('2000000000053', 8, 'mono- and diglycerides of fatty acids'),
  ('2000000000053', 9, 'sodium stearoyl lactylate'),
  ('2000000000053', 10, 'calcium propionate'),
  ('2000000000053', 11, 'vitamins and minerals'),
  -- Jungle Oats
  ('2000000000060', 1, 'wholegrain oats'),
  -- Bokomo Weet-Bix
  ('2000000000077', 1, 'whole wheat'),
  ('2000000000077', 2, 'sugar'),
  ('2000000000077', 3, 'salt'),
  ('2000000000077', 4, 'barley malt extract'),
  ('2000000000077', 5, 'vitamins and minerals'),
  -- Nestlé Milo
  ('2000000000084', 1, 'barley malt extract'),
  ('2000000000084', 2, 'milk solids'),
  ('2000000000084', 3, 'sugar'),
  ('2000000000084', 4, 'cocoa'),
  ('2000000000084', 5, 'vitamins and minerals'),
  -- Iwisa Super Maize Meal
  ('2000000000091', 1, 'maize meal'),
  ('2000000000091', 2, 'vitamins and minerals'),
  -- Tastic Rice
  ('2000000000107', 1, 'parboiled rice'),
  -- Huletts White Sugar
  ('2000000000114', 1, 'sugar'),
  -- Black Cat Smooth Peanut Butter
  ('2000000000121', 1, 'peanuts'),
  ('2000000000121', 2, 'sugar'),
  ('2000000000121', 3, 'vegetable oil'),
  ('2000000000121', 4, 'salt'),
  -- All Gold Tomato Sauce
  ('2000000000138', 1, 'tomato paste'),
  ('2000000000138', 2, 'sugar'),
  ('2000000000138', 3, 'vinegar'),
  ('2000000000138', 4, 'salt'),
  ('2000000000138', 5, 'modified maize starch'),
  ('2000000000138', 6, 'onion'),
  ('2000000000138', 7, 'spices'),
  ('2000000000138', 8, 'sodium benzoate'),
  -- Mrs Ball's Chutney
  ('2000000000145', 1, 'sugar'),
  ('2000000000145', 2, 'peach'),
  ('2000000000145', 3, 'apricot'),
  ('2000000000145', 4, 'vinegar'),
  ('2000000000145', 5, 'maize starch'),
  ('2000000000145', 6, 'salt'),
  ('2000000000145', 7, 'onion'),
  ('2000000000145', 8, 'garlic'),
  -- Rama Original Spread
  ('2000000000152', 1, 'vegetable oil'),
  ('2000000000152', 2, 'water'),
  ('2000000000152', 3, 'salt'),
  ('2000000000152', 4, 'buttermilk powder'),
  ('2000000000152', 5, 'mono- and diglycerides of fatty acids'),
  ('2000000000152', 6, 'potassium sorbate'),
  ('2000000000152', 7, 'beta-carotene'),
  -- KOO Baked Beans
  ('2000000000169', 1, 'haricot beans'),
  ('2000000000169', 2, 'water'),
  ('2000000000169', 3, 'tomato paste'),
  ('2000000000169', 4, 'sugar'),
  ('2000000000169', 5, 'salt'),
  ('2000000000169', 6, 'modified maize starch'),
  ('2000000000169', 7, 'spices'),
  -- Lucky Star Pilchards
  ('2000000000176', 1, 'pilchards'),
  ('2000000000176', 2, 'tomato paste'),
  ('2000000000176', 3, 'water'),
  ('2000000000176', 4, 'salt'),
  ('2000000000176', 5, 'modified maize starch'),
  -- Ouma Buttermilk Rusks
  ('2000000000183', 1, 'wheat flour'),
  ('2000000000183', 2, 'sugar'),
  ('2000000000183', 3, 'vegetable fat'),
  ('2000000000183', 4, 'buttermilk powder'),
  ('2000000000183', 5, 'raising agent'),
  ('2000000000183', 6, 'salt'),
  -- Bakers Tennis Biscuits
  ('2000000000190', 1, 'wheat flour'),
  ('2000000000190', 2, 'sugar'),
  ('2000000000190', 3, 'vegetable fat'),
  ('2000000000190', 4, 'coconut'),
  ('2000000000190', 5, 'golden syrup'),
  ('2000000000190', 6, 'salt'),
  ('2000000000190', 7, 'raising agent'),
  ('2000000000190', 8, 'flavouring'),
  -- Bakers Marie Biscuits
  ('2000000000206', 1, 'wheat flour'),
  ('2000000000206', 2, 'sugar'),
  ('2000000000206', 3, 'vegetable fat'),
  ('2000000000206', 4, 'invert syrup'),
  ('2000000000206', 5, 'raising agent'),
  ('2000000000206', 6, 'salt'),
  ('2000000000206', 7, 'soya lecithin'),
  ('2000000000206', 8, 'flavouring'),
  -- Coca-Cola Original
  ('2000000000213', 1, 'carbonated water'),
  ('2000000000213', 2, 'sugar'),
  ('2000000000213', 3, 'sulphite ammonia caramel'),
  ('2000000000213', 4, 'phosphoric acid'),
  ('2000000000213', 5, 'flavouring'),
  ('2000000000213', 6, 'caffeine'),
  -- Liqui-Fruit Apple
  ('2000000000220', 1, 'apple juice from concentrate'),
  -- Simba Salt & Vinegar (AI read, unverified)
  ('2000000000237', 1, 'potato'),
  ('2000000000237', 2, 'vegetable oil'),
  ('2000000000237', 3, 'salt'),
  ('2000000000237', 4, 'vinegar'),
  ('2000000000237', 5, 'citric acid'),
  -- Cheese Nik Naks (AI read, unverified)
  ('2000000000244', 1, 'maize meal'),
  ('2000000000244', 2, 'vegetable oil'),
  ('2000000000244', 3, 'cheese'),
  ('2000000000244', 4, 'whey powder'),
  ('2000000000244', 5, 'salt'),
  ('2000000000244', 6, 'monosodium glutamate'),
  ('2000000000244', 7, 'annatto'),
  -- Knorrox Beef Stock Cubes (AI read, unverified)
  ('2000000000251', 1, 'salt'),
  ('2000000000251', 2, 'maize starch'),
  ('2000000000251', 3, 'monosodium glutamate'),
  ('2000000000251', 4, 'wheat flour'),
  ('2000000000251', 5, 'palm oil'),
  ('2000000000251', 6, 'spices'),
  ('2000000000251', 7, 'sulphite ammonia caramel')
) as v(barcode, position, ingredient)
join public.products p on p.barcode = v.barcode
join public.ingredients i on i.name = v.ingredient
on conflict (product_id, ingredient_id) do nothing;
