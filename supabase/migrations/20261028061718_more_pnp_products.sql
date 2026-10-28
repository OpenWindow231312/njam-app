-- Njam: more kinds of products from Pick n Pay, two new aisles, and more
-- clean pack shots
--
-- Read from Pick n Pay's website (pnp.co.za) by
-- scripts/import-pnp-products.mjs, which wrote everything below the
-- "Products" line:
--
--   1. Two new aisles, Frozen food and Baby food. Their icons are in
--      src/features/home/categories.ts.
--   2. 34 products of kinds the catalogue was missing: tinned vegetables,
--      beans and fruit, soup and stock, spices, sauces, gluten-free bread
--      and pasta, dairy-free cheese and yoghurt, almond milk, frozen food
--      and baby food. Each one has its barcode, the ingredient list and
--      allergen line from the pack, and the nutrition table where the page
--      has a sensible one. Each list was checked by hand against the label
--      text, so they are saved verified.
--   3. 25 products we already had get Pick n Pay's pack shot instead of
--      their Open Food Facts photo. Matched by barcode, so it is the same
--      product; three whose Pick n Pay photo shows a different product are
--      left out (WRONG_PHOTOS in the script).
--
-- Photos: at the top level of the product-photos bucket, named after the
-- barcode, uploaded before this migration ran. The pack shots belong to
-- Pick n Pay and the brand owners; they are used here for a non-commercial
-- student project.
--
-- Fresh Earth Gluten Free Brown Bread lists egg powder but leaves egg off
-- its allergen line. Egg is saved as a declared allergen anyway: the script
-- now also reads allergens from the ingredient list itself.

-- ---------------------------------------------------------------------------
-- Aisles
-- ---------------------------------------------------------------------------

insert into public.categories (name, slug) values
  ('Frozen food', 'frozen'),
  ('Baby food',   'baby')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

select public.import_product(
  '6009522300562', 'Koo Creamstyle Sweetcorn', 'Koo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009522300562.jpg',
  415, 'g', 'tins-jars',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"corn","allergen":null,"eNumber":null},{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"chemically modified mazie starch","allergen":null,"eNumber":"E1422"},{"name":"salt","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":227,"proteinG":1.9,"carbsG":9,"sugarG":5,"fatG":0.7,"satFatG":0.1,"fibreG":2.3,"sodiumMg":366}'::jsonb
);

select public.import_product(
  '6001024103184', 'Koo Mixed Vegetables', 'Koo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001024103184.jpg',
  410, 'g', 'tins-jars',
  array[]::text[],
  '[{"name":"vegetables","allergen":null,"eNumber":null},{"name":"carrots","allergen":null,"eNumber":null},{"name":"potatoes","allergen":null,"eNumber":null},{"name":"processed peas","allergen":null,"eNumber":null},{"name":"small white beans","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":188,"proteinG":3.1,"carbsG":7,"sugarG":1.2,"fatG":0.2,"satFatG":0,"fibreG":2.5,"sodiumMg":222}'::jsonb
);

select public.import_product(
  '6001059946404', 'Koo Easy Open Mild & Spicy Chakalaka', 'Koo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001059946404.jpg',
  410, 'g', 'tins-jars',
  array[]::text[],
  '[{"name":"vegetables","allergen":null,"eNumber":null},{"name":"carrots","allergen":null,"eNumber":null},{"name":"onions","allergen":null,"eNumber":null},{"name":"cabbage","allergen":null,"eNumber":null},{"name":"green peppers","allergen":null,"eNumber":null},{"name":"chillies","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"tomato puree","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"antioxidant tbhq","allergen":null,"eNumber":"E319"},{"name":"spices","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"chemically modified maize starch","allergen":null,"eNumber":"E1401"},{"name":"acidity regulator","allergen":null,"eNumber":"E330"},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":318,"proteinG":2,"carbsG":4,"sugarG":3.5,"fatG":5.2,"satFatG":0.8,"fibreG":2.2,"sodiumMg":491}'::jsonb
);

select public.import_product(
  '6001024136373', 'Koo Ch Grade Peach Halves', 'Koo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001024136373.jpg',
  410, 'g', 'tins-jars',
  array[]::text[],
  '[{"name":"peaches","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":"E330"}]'::jsonb,
  '{"perBasis":"100g","energyKj":296,"proteinG":0.5,"carbsG":17,"sugarG":14.4,"fatG":0.1,"satFatG":0.1,"fibreG":1.9,"sodiumMg":3}'::jsonb
);

select public.import_product(
  '6001115001368', 'Lucky Star Shredded Tuna Vegetable Oil', 'Lucky Star',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001115001368.jpg',
  170, 'g', 'tins-jars',
  array[]::text[],
  '[{"name":"tuna","allergen":null,"eNumber":null},{"name":"fish","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"soya bean oil","allergen":null,"eNumber":null},{"name":"brine","allergen":null,"eNumber":null},{"name":"fish (declared allergen)","allergen":"fish","eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":918,"proteinG":23,"carbsG":4,"sugarG":0.5,"fatG":14.3,"satFatG":2,"fibreG":0.7,"sodiumMg":274}'::jsonb
);

select public.import_product(
  '6001087404242', 'Knorr Cream Of Mushroom Soup', 'Knorr',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001087404242.jpg',
  45, 'g', 'pantry',
  array[]::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"iodised salt","allergen":null,"eNumber":null},{"name":"flavour enhancers","allergen":null,"eNumber":null},{"name":"e631","allergen":null,"eNumber":"E631"},{"name":"e627","allergen":null,"eNumber":"E627"},{"name":"msg","allergen":null,"eNumber":null},{"name":"potassium chloride","allergen":null,"eNumber":null},{"name":"creamer","allergen":null,"eNumber":null},{"name":"corn syrup solids","allergen":null,"eNumber":null},{"name":"casein","allergen":null,"eNumber":null},{"name":"whey powder","allergen":null,"eNumber":null},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"anticaking agent","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"hvp","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"mushroom","allergen":null,"eNumber":null},{"name":"white pepper","allergen":null,"eNumber":null},{"name":"food acid","allergen":null,"eNumber":null},{"name":"citric","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":"E150C"},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1370,"proteinG":12.2,"carbsG":63,"sugarG":2.9,"fatG":3.3,"satFatG":1.4,"fibreG":1.3,"sodiumMg":3500}'::jsonb
);

select public.import_product(
  '6009682952267', 'Royco Soup Brown Onion', 'Royco',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009682952267.jpg',
  45, 'g', 'pantry',
  array['milk']::text[],
  '[{"name":"starch","allergen":null,"eNumber":null},{"name":"corn","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"monosodium glutamate","allergen":null,"eNumber":null},{"name":"flavour enhancer","allergen":null,"eNumber":null},{"name":"potassium chloride","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"hydrolysed vegetable protein","allergen":null,"eNumber":null},{"name":"soya","allergen":null,"eNumber":null},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":null},{"name":"caramel","allergen":null,"eNumber":null},{"name":"irradiated onion","allergen":null,"eNumber":null},{"name":"sulphur dioxide","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"tbhq","allergen":null,"eNumber":null},{"name":"flavour enhancer","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"acids","allergen":null,"eNumber":null},{"name":"irradiated herbs and spices","allergen":null,"eNumber":null},{"name":"irradiated garlic","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6003105000665', 'Ina Paarman''s Chicken Stock Powder', 'Ina Paarman''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6003105000665.jpg',
  150, 'g', 'pantry',
  array[]::text[],
  '[{"name":"salt","allergen":null,"eNumber":null},{"name":"corn starch","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"maltodextrin","allergen":null,"eNumber":null},{"name":"yeast extract","allergen":null,"eNumber":null},{"name":"vegetables","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null},{"name":"dehydrated vegetables","allergen":null,"eNumber":null},{"name":"onions","allergen":null,"eNumber":null},{"name":"carrots","allergen":null,"eNumber":null},{"name":"leeks","allergen":null,"eNumber":null},{"name":"celery","allergen":null,"eNumber":null},{"name":"garlic","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"dextrose","allergen":null,"eNumber":null},{"name":"potassium chloride","allergen":null,"eNumber":null},{"name":"yeast extract","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"vitamin e","allergen":null,"eNumber":null},{"name":"herbs","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":807,"proteinG":3.9,"carbsG":39,"sugarG":6.7,"fatG":1,"satFatG":0.2,"fibreG":5.1,"sodiumMg":14082}'::jsonb
);

select public.import_product(
  '6003105003185', 'Ina Paarman''s Beef Stock Concentrate', 'Ina Paarman''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6003105003185.jpg',
  200, 'g', 'pantry',
  array[]::text[],
  '[{"name":"beef broth","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"free range beef bones","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"black peppercorns","allergen":null,"eNumber":null},{"name":"fresh thyme","allergen":null,"eNumber":null},{"name":"bay leaves","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"fresh onion","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"beef fat","allergen":null,"eNumber":null},{"name":"corn starch","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"fresh carrot","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"yeast extract","allergen":null,"eNumber":null},{"name":"pectin","allergen":null,"eNumber":null},{"name":"caramel","allergen":null,"eNumber":null},{"name":"xanthan gum","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null},{"name":"thyme","allergen":null,"eNumber":null},{"name":"canola oil","allergen":null,"eNumber":null},{"name":"vitamin e","allergen":null,"eNumber":null},{"name":"garlic","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":250,"proteinG":3,"carbsG":5,"sugarG":3,"fatG":2.7,"satFatG":1.4,"fibreG":1.8,"sodiumMg":2603}'::jsonb
);

select public.import_product(
  '9310155009577', 'San Remo Gluten Free Penne', 'San Remo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/9310155009577.jpg',
  350, 'g', 'pantry',
  array[]::text[],
  '[{"name":"maize starch","allergen":null,"eNumber":null},{"name":"soy flour","allergen":null,"eNumber":null},{"name":"potato starch","allergen":null,"eNumber":null},{"name":"rice starch","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1480,"proteinG":8,"carbsG":76.5,"sugarG":2,"fatG":1.9,"satFatG":0.5,"fibreG":1.1,"sodiumMg":20}'::jsonb
);

select public.import_product(
  '8076809545440', 'Barilla Gluten Free Spaghetti', 'Barilla',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/8076809545440.jpg',
  400, 'g', 'pantry',
  array[]::text[],
  '[{"name":"corn flour","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"mono and diglycerides","allergen":null,"eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6001038285005', 'Robertsons Chicken Spice Refill', 'Robertsons',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001038285005.jpg',
  84, 'g', 'sauces-spreads',
  array['milk', 'egg', 'soy', 'gluten']::text[],
  '[{"name":"salt","allergen":null,"eNumber":null},{"name":"iodised salt","allergen":null,"eNumber":null},{"name":"maize flour","allergen":null,"eNumber":null},{"name":"paprika","allergen":null,"eNumber":null},{"name":"black pepper","allergen":null,"eNumber":null},{"name":"cloves","allergen":null,"eNumber":null},{"name":"pimento","allergen":null,"eNumber":null},{"name":"nutmeg","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"sage","allergen":null,"eNumber":null},{"name":"marjoram","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":613,"proteinG":4.2,"carbsG":26,"sugarG":2.6,"fatG":2.7,"satFatG":0.7,"fibreG":7.6,"sodiumMg":20611}'::jsonb
);

select public.import_product(
  '6001038284954', 'Robertsons Barbecue Spice Refill', 'Robertsons',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001038284954.jpg',
  64, 'g', 'sauces-spreads',
  array['milk', 'egg', 'soy']::text[],
  '[{"name":"salt","allergen":null,"eNumber":null},{"name":"wheat bran","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"paprika","allergen":null,"eNumber":null},{"name":"coriander","allergen":null,"eNumber":null},{"name":"black pepper","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"celery","allergen":null,"eNumber":null},{"name":"pimento","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"chillies","allergen":null,"eNumber":null},{"name":"cloves","allergen":null,"eNumber":null},{"name":"nutmeg","allergen":null,"eNumber":null},{"name":"garlic","allergen":null,"eNumber":null},{"name":"flavour enhancers","allergen":null,"eNumber":null},{"name":"e631","allergen":null,"eNumber":"E631"},{"name":"e627","allergen":null,"eNumber":"E627"},{"name":"origanum","allergen":null,"eNumber":null},{"name":"sage","allergen":null,"eNumber":null},{"name":"thyme","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":738,"proteinG":6.6,"carbsG":20,"sugarG":8.1,"fatG":5.5,"satFatG":1,"fibreG":17.1,"sodiumMg":13395}'::jsonb
);

select public.import_product(
  '6001038201555', 'Robertsons Rajah Medium Curry Powder', 'Robertsons',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001038201555.jpg',
  100, 'g', 'sauces-spreads',
  array['milk', 'egg', 'soy']::text[],
  '[{"name":"wheat bran","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"coriander","allergen":null,"eNumber":null},{"name":"turmeric","allergen":null,"eNumber":null},{"name":"turmeric","allergen":null,"eNumber":null},{"name":"chilli","allergen":null,"eNumber":null},{"name":"fenugreek","allergen":null,"eNumber":null},{"name":"cumin","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1217,"proteinG":12.9,"carbsG":26,"sugarG":8.3,"fatG":8.7,"satFatG":1.3,"fibreG":35.1,"sodiumMg":340}'::jsonb
);

select public.import_product(
  '6003770000168', 'Nando''s Medium Peri Peri Sauce', 'Nando''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6003770000168.jpg',
  250, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"onion puree","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"lemon puree","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null},{"name":"cayenne pepper","allergen":null,"eNumber":null},{"name":"african bird''s eye chilli","allergen":null,"eNumber":null},{"name":"paprika","allergen":null,"eNumber":null},{"name":"serrano chilli","allergen":null,"eNumber":null},{"name":"garlic puree","allergen":null,"eNumber":null},{"name":"stabilisers","allergen":null,"eNumber":null},{"name":"xanthan gum","allergen":null,"eNumber":null},{"name":"propylene glycol alginate","allergen":null,"eNumber":null},{"name":"ascorbic acid","allergen":null,"eNumber":null},{"name":"rosemary extract","allergen":null,"eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6001770000010', 'Steers Barbeque Sauce', 'Steers',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001770000010.jpg',
  375, 'ml', 'sauces-spreads',
  array['egg', 'soy']::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"tomato paste","allergen":null,"eNumber":null},{"name":"chemically modified starch","allergen":null,"eNumber":null},{"name":"e1422","allergen":null,"eNumber":"E1422"},{"name":"salt","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":null},{"name":"e260","allergen":null,"eNumber":"E260"},{"name":"worcester seasoning","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":null},{"name":"e150a","allergen":null,"eNumber":"E150A"},{"name":"spices","allergen":null,"eNumber":null},{"name":"maltodextrin","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"anticaking agent","allergen":null,"eNumber":null},{"name":"e551","allergen":null,"eNumber":"E551"},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"antioxidant tbhq","allergen":null,"eNumber":null},{"name":"e319","allergen":null,"eNumber":"E319"},{"name":"msg flavour enhancer","allergen":null,"eNumber":null},{"name":"e621","allergen":null,"eNumber":"E621"},{"name":"colourant","allergen":null,"eNumber":null},{"name":"e150c","allergen":null,"eNumber":"E150C"},{"name":"seasoning blend","allergen":null,"eNumber":null},{"name":"mixed spices","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null},{"name":"wheat cereal","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"maize flour","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"garlic powder","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":null},{"name":"e202","allergen":null,"eNumber":"E202"},{"name":"sodium benzoate","allergen":null,"eNumber":null},{"name":"e211","allergen":null,"eNumber":"E211"},{"name":"stabilizer","allergen":null,"eNumber":null},{"name":"e415","allergen":null,"eNumber":"E415"},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"spice extracts","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"e471","allergen":null,"eNumber":"E471"},{"name":"anticaking agent","allergen":null,"eNumber":null},{"name":"e551","allergen":null,"eNumber":"E551"},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":325,"proteinG":0.9,"carbsG":18,"sugarG":15,"fatG":0.1,"satFatG":0.1,"fibreG":0.5,"sodiumMg":755}'::jsonb
);

select public.import_product(
  '8715035110304', 'Kikkoman Soy Sauce', 'Kikkoman',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/8715035110304.jpg',
  250, 'ml', 'sauces-spreads',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"soybeans","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6009522309138', 'Mrs H.S.Ball''s Sauce Sweet Chilli', 'Mrs H.S.Ball''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009522309138.jpg',
  360, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"onion","allergen":null,"eNumber":null},{"name":"chemically modified maize starch","allergen":null,"eNumber":"E1422"},{"name":"salt","allergen":null,"eNumber":null},{"name":"dehydrated red bell pepper","allergen":null,"eNumber":null},{"name":"garlic","allergen":null,"eNumber":null},{"name":"dehydrated onion","allergen":null,"eNumber":null},{"name":"sulphur dioxide","allergen":null,"eNumber":null},{"name":"dehydrated chilli rakes","allergen":null,"eNumber":null},{"name":"spice","allergen":null,"eNumber":null},{"name":"preservatives","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"sodium benzoate","allergen":null,"eNumber":"E211"},{"name":"flavourings","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":754,"proteinG":0.2,"carbsG":44,"sugarG":39.9,"fatG":0,"satFatG":0,"fibreG":0.1,"sodiumMg":118}'::jsonb
);

select public.import_product(
  '6009802926123', 'Fresh Earth Gluten Free Brown Bread', 'Fresh Earth',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009802926123.jpg',
  320, 'g', 'bakery',
  array['milk', 'peanut', 'soy', 'tree-nut']::text[],
  '[{"name":"tapioca starch","allergen":null,"eNumber":null},{"name":"sorghum flour","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"psyllium","allergen":null,"eNumber":null},{"name":"potato starch","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"egg powder","allergen":null,"eNumber":null},{"name":"maize starch","allergen":null,"eNumber":null},{"name":"fibre","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1030,"proteinG":4.5,"carbsG":41.9,"sugarG":1.4,"fatG":4.3,"satFatG":1.2,"fibreG":10.3,"sodiumMg":542}'::jsonb
);

select public.import_product(
  '6009802926116', 'Fresh Earth Gluten Free White Bread', 'Fresh Earth',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009802926116.jpg',
  320, 'g', 'bakery',
  array['milk', 'peanut', 'soy', 'tree-nut']::text[],
  '[{"name":"tapioca starch","allergen":null,"eNumber":null},{"name":"maize starch","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"psyllium","allergen":null,"eNumber":null},{"name":"potato starch","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"egg powder","allergen":null,"eNumber":null},{"name":"fibre","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1045,"proteinG":4.1,"carbsG":43,"sugarG":1.8,"fatG":4.8,"satFatG":1.2,"fibreG":8.5,"sodiumMg":484}'::jsonb
);

select public.import_product(
  '6009880806836', 'Earth & Co Vegan Dairy Free Cheddar Flavoured Cheese Slices', 'Earth & Co',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009880806836.jpg',
  150, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"coconut oil","allergen":null,"eNumber":null},{"name":"tapioca","allergen":null,"eNumber":null},{"name":"potato starch","allergen":null,"eNumber":null},{"name":"sea salt","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"colourants","allergen":null,"eNumber":null},{"name":"paprika extract","allergen":null,"eNumber":null},{"name":"beta-carotene","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1276,"proteinG":0,"carbsG":25,"sugarG":0,"fatG":23.1,"satFatG":20.6,"fibreG":0,"sodiumMg":680}'::jsonb
);

select public.import_product(
  '6002291004174', 'Fairview Plant Based Cheddar Flavour Cheese', 'Fairview',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6002291004174.jpg',
  200, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"coconut oil","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"modified potato starch","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"vegetable base","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":null},{"name":"paprika and beta carotene","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1316,"proteinG":0.3,"carbsG":22,"sugarG":0,"fatG":25.5,"satFatG":22,"fibreG":0,"sodiumMg":330}'::jsonb
);

select public.import_product(
  '6009218008604', 'PnP Live Well Dairy Free Plain Cultured Soya Yoghurt', 'PnP',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009218008604.jpg',
  500, 'g', 'dairy-eggs',
  array['peanut']::text[],
  '[{"name":"soya milk","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"soya beans","allergen":null,"eNumber":null},{"name":"coconut oil","allergen":null,"eNumber":null},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":null},{"name":"plant-based starter culture","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":319,"proteinG":1.9,"carbsG":6,"sugarG":3.3,"fatG":5,"satFatG":3.7,"fibreG":1,"sodiumMg":13}'::jsonb
);

select public.import_product(
  '6009617225718', 'Lancewood Lactose Free Plain Yoghurt', 'Lancewood',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009617225718.jpg',
  1, 'kg', 'dairy-eggs',
  array['soy']::text[],
  '[{"name":"pasteurised low-fat milk","allergen":null,"eNumber":null},{"name":"stabilisers","allergen":null,"eNumber":null},{"name":"e1442","allergen":null,"eNumber":"E1442"},{"name":"e1422","allergen":null,"eNumber":"E1422"},{"name":"e331","allergen":null,"eNumber":"E331"},{"name":"e551","allergen":null,"eNumber":"E551"},{"name":"lactase enzyme","allergen":null,"eNumber":null},{"name":"yoghurt cultures","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"pimaricin","allergen":null,"eNumber":"E235"},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":189,"proteinG":3,"carbsG":5,"sugarG":1.3,"fatG":1.3,"satFatG":0.8,"fibreG":0.5,"sodiumMg":38}'::jsonb
);

select public.import_product(
  '6009888668351', 'ButtaNutt Unsweetened Almond Milk', 'ButtaNutt',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009888668351.jpg',
  1, 'l', 'drinks',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"almond paste","allergen":null,"eNumber":null},{"name":"almonds","allergen":null,"eNumber":null},{"name":"almond oil","allergen":null,"eNumber":null},{"name":"calcium carbonate","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":null},{"name":"potassium phosphate","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"tree nuts (declared allergen)","allergen":"tree-nut","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":122,"proteinG":0.5,"carbsG":0.2,"sugarG":0.1,"fatG":3,"satFatG":0.2,"fibreG":0.3,"sodiumMg":39}'::jsonb
);

select public.import_product(
  '6009650905158', 'McCain Garden Mix', 'McCain',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009650905158.jpg',
  1, 'kg', 'frozen',
  array[]::text[],
  '[{"name":"carrot roundels","allergen":null,"eNumber":null},{"name":"cut green beans","allergen":null,"eNumber":null},{"name":"cauliflower cuts","allergen":null,"eNumber":null},{"name":"broccoli cuts","allergen":null,"eNumber":null},{"name":"marrow roundels","allergen":null,"eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6009650905875', 'McCain Traditional  Style Slap Chips', 'McCain',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009650905875.jpg',
  1, 'kg', 'frozen',
  array[]::text[],
  '[{"name":"potatoes","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":472,"proteinG":2,"carbsG":15,"sugarG":0.5,"fatG":4.5,"satFatG":2.3,"fibreG":1.9,"sodiumMg":7}'::jsonb
);

select public.import_product(
  '6001046600210', 'I&J Original Fish Fingers', 'I&J',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001046600210.jpg',
  600, 'g', 'frozen',
  array[]::text[],
  '[{"name":"hake","allergen":null,"eNumber":null},{"name":"merluccius spp","allergen":null,"eNumber":null},{"name":"fish","allergen":null,"eNumber":null},{"name":"batter","allergen":null,"eNumber":null},{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"maize starch","allergen":null,"eNumber":null},{"name":"starch","allergen":null,"eNumber":null},{"name":"potato or tapioca","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"crumb","allergen":null,"eNumber":null},{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":null},{"name":"annatto","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"predust","allergen":null,"eNumber":null},{"name":"maize flour","allergen":null,"eNumber":null},{"name":"crumb","allergen":null,"eNumber":null},{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"wheat gluten","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"fish (declared allergen)","allergen":"fish","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":859,"proteinG":10,"carbsG":16,"sugarG":0.3,"fatG":11.7,"satFatG":1.7,"fibreG":1,"sodiumMg":360}'::jsonb
);

select public.import_product(
  '6001428000317', 'Dr Oetker Ital Pizza Classic Hawaiian Pizza', 'Dr Oetker',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001428000317.jpg',
  305, 'g', 'frozen',
  array['soy']::text[],
  '[{"name":"pizza base","allergen":null,"eNumber":null},{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"tomato sauce","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"tomato paste","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"thickener","allergen":null,"eNumber":"E1422"},{"name":"dried garlic","allergen":null,"eNumber":null},{"name":"herb and spice","allergen":null,"eNumber":null},{"name":"dried ginger","allergen":null,"eNumber":null},{"name":"mozzarella cheese","allergen":null,"eNumber":null},{"name":"milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"cheese cultures","allergen":null,"eNumber":null},{"name":"non-animal rennet","allergen":null,"eNumber":null},{"name":"pineapple pieces","allergen":null,"eNumber":null},{"name":"pineapple","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":"E330"},{"name":"ham","allergen":null,"eNumber":null},{"name":"pork meat","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"dextrose","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"spice extract","allergen":null,"eNumber":null},{"name":"thickener","allergen":null,"eNumber":"E407A"},{"name":"sodium ascorbate","allergen":null,"eNumber":"E301"},{"name":"preservative","allergen":null,"eNumber":null},{"name":"sodium nitrite","allergen":null,"eNumber":"E250"},{"name":"stabilisers","allergen":null,"eNumber":null},{"name":"e450","allergen":null,"eNumber":"E450"},{"name":"e451","allergen":null,"eNumber":"E451"},{"name":"herb","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6001107300189', 'Purity Jar Apple & Banana 200ml from 8 Months', 'Purity',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001107300189.jpg',
  null, null, 'baby',
  array['milk', 'egg', 'gluten']::text[],
  '[{"name":"fruits","allergen":null,"eNumber":null},{"name":"apple purée","allergen":null,"eNumber":null},{"name":"banana purée","allergen":null,"eNumber":null},{"name":"banana","allergen":null,"eNumber":null},{"name":"acidity regulators","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":275,"proteinG":0.2,"carbsG":17,"sugarG":6.1,"fatG":0.1,"satFatG":0.1,"fibreG":1,"sodiumMg":2}'::jsonb
);

select public.import_product(
  '6001059944707', 'Purity Jar Bananas 125ml from 6 Months', 'Purity',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001059944707.jpg',
  null, null, 'baby',
  array['milk', 'egg', 'gluten']::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"banana purée","allergen":null,"eNumber":null},{"name":"banana","allergen":null,"eNumber":null},{"name":"acidity regulators","allergen":null,"eNumber":null},{"name":"modified tapioca starch","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"lemon juice concentrate","allergen":null,"eNumber":null},{"name":"ascorbic acid","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":261,"proteinG":0.2,"carbsG":15,"sugarG":10.8,"fatG":0.2,"satFatG":0.1,"fibreG":1.3,"sodiumMg":2}'::jsonb
);

select public.import_product(
  '6009516203039', 'Purity Pouch Sweet Potato Apple & Sweetcorn 110ml from 6 Months', 'Purity',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009516203039.jpg',
  null, null, 'baby',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"sweet potato puree","allergen":null,"eNumber":null},{"name":"sweetcorn","allergen":null,"eNumber":null},{"name":"modified tapioca starch","allergen":null,"eNumber":null},{"name":"apple puree","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"lemon juice concentrate","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":211,"proteinG":0.2,"carbsG":13,"sugarG":6.2,"fatG":0.5,"satFatG":0.2,"fibreG":2.2,"sodiumMg":18}'::jsonb
);

select public.import_product(
  '6009188007959', 'Nestle Cerelac Regular Stage 1 Baby Cereal', 'Nestle',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009188007959.jpg',
  200, 'g', 'baby',
  array[]::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"skimmed milk powder","allergen":null,"eNumber":null},{"name":"brown sugar","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"rapeseed","allergen":null,"eNumber":null},{"name":"coconut","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"ascorbyl palmitate","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"calcium carbonate","allergen":null,"eNumber":null},{"name":"sodium phosphate","allergen":null,"eNumber":null},{"name":"vitamins","allergen":null,"eNumber":null},{"name":"niacin","allergen":null,"eNumber":null},{"name":"pantothenic acid","allergen":null,"eNumber":null},{"name":"folic acid","allergen":null,"eNumber":null},{"name":"probiotic","allergen":null,"eNumber":null},{"name":"bifidobacterium lactis culture","allergen":null,"eNumber":null},{"name":"ferrous fumarate","allergen":null,"eNumber":null},{"name":"zinc sulphate","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6009880806935', 'Hey Baby Organic Carrot & Sweetcorn Flavoured Pea Puffed Stars', 'Hey Baby',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009880806935.jpg',
  12, 'g', 'baby',
  array[]::text[],
  '[{"name":"pea flour","allergen":null,"eNumber":null},{"name":"maize flour","allergen":null,"eNumber":null},{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"carrot powder","allergen":null,"eNumber":null},{"name":"carrot","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"sweetcorn powder","allergen":null,"eNumber":null},{"name":"rosemary extract","allergen":null,"eNumber":null},{"name":"vitamin b1","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1730,"proteinG":15.9,"carbsG":69,"sugarG":4.6,"fatG":7.5,"satFatG":0.7,"fibreG":1.5,"sodiumMg":15}'::jsonb
);

-- import_product says open_food_facts and unverified. These came from
-- Pick n Pay, and each ingredient list was checked by hand against the
-- label text before this migration was written.
update public.products
   set source = 'retailer',
       verified = true
 where source = 'open_food_facts'
   and created_at = now()
   and barcode in (
     '6009522300562',
     '6001024103184',
     '6001059946404',
     '6001024136373',
     '6001115001368',
     '6001087404242',
     '6009682952267',
     '6003105000665',
     '6003105003185',
     '9310155009577',
     '8076809545440',
     '6001038285005',
     '6001038284954',
     '6001038201555',
     '6003770000168',
     '6001770000010',
     '8715035110304',
     '6009522309138',
     '6009802926123',
     '6009802926116',
     '6009880806836',
     '6002291004174',
     '6009218008604',
     '6009617225718',
     '6009888668351',
     '6009650905158',
     '6009650905875',
     '6001046600210',
     '6001428000317',
     '6001107300189',
     '6001059944707',
     '6009516203039',
     '6009188007959',
     '6009880806935'
   );

-- Pick n Pay's pack shot for products we already had.
update public.products
   set image_url = 'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/' || barcode || '.jpg'
 where source in ('open_food_facts', 'seed')
   and barcode in (
     '6009522302979',
     '6001021020002',
     '6009815580015',
     '6001464147960',
     '6001030003577',
     '6009671360400',
     '40737430',
     '6001317040318',
     '6001770024245',
     '6009614730529',
     '6009617224896',
     '6001087374057',
     '6009691358807',
     '6001324254371',
     '6009612470113',
     '5449000123268',
     '6009612470175',
     '6009612470892',
     '6001032061063',
     '6009510804782',
     '6001120609894',
     '6001120609870',
     '8003340095813',
     '6001007444945',
     '6009518601680'
   );
