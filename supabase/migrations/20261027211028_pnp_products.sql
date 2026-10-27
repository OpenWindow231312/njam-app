-- Njam: everyday products from Pick n Pay, and clean pack shots
--
-- Two things, both read from Pick n Pay's website (pnp.co.za) by
-- scripts/import-pnp-products.mjs, which wrote everything below the
-- "Products" line:
--
--   1. 34 everyday products the catalogue was missing (margarine, jam,
--      butter, cheese, crackers, bread, eggs, mayonnaise and more). Each one
--      has its barcode, the ingredient list and allergen line from the pack,
--      and the nutrition table. Each list was checked by hand against the
--      label text, so they are saved verified.
--   2. 129 products we already had get Pick n Pay's pack shot instead of
--      their Open Food Facts photo, which is often a phone snap. Matched by
--      barcode, so it is the same product. A photo a person took when they
--      added a product is never replaced.
--
-- Photos: at the top level of the product-photos bucket, named after the
-- barcode, uploaded before this migration ran. The pack shots belong to
-- Pick n Pay and the brand owners; they are used here for a non-commercial
-- student project.
--
-- Clover butter has no nutrition table: the one on its page says 3.4 g
-- saturated fat and 10 g fibre, which is wrong for butter.

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

select public.import_product(
  '6009710390184', 'Rama 70% Fat Spread Original', 'Rama',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009710390184.jpg',
  500, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"vegetable oils and fats","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"linseed","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"palm kernel","allergen":null,"eNumber":null},{"name":"fully hydrogenated fats","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"palm kernel","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"e471","allergen":null,"eNumber":"E471"},{"name":"e322","allergen":null,"eNumber":"E322"},{"name":"whey powder","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":null},{"name":"vitamins","allergen":null,"eNumber":null},{"name":"niacin","allergen":null,"eNumber":null},{"name":"folic acid","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"beta-carotene","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":2167,"proteinG":0.4,"carbsG":1,"sugarG":0.4,"fatG":70,"satFatG":32.7,"fibreG":1,"sodiumMg":450}'::jsonb
);

select public.import_product(
  '6009710390146', 'Flora Light 40% Fat Spread', 'Flora',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009710390146.jpg',
  1, 'kg', 'sauces-spreads',
  array[]::text[],
  '[{"name":"water","allergen":null,"eNumber":null},{"name":"vegetable oils and fats","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"canola seed","allergen":null,"eNumber":null},{"name":"linseed oil","allergen":null,"eNumber":null},{"name":"fully hydrogenated fats","allergen":null,"eNumber":null},{"name":"palm and palm kernel","allergen":null,"eNumber":null},{"name":"starch","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"whey powder","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"e471","allergen":null,"eNumber":"E471"},{"name":"e322","allergen":null,"eNumber":"E322"},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":null},{"name":"beta-carotene","allergen":null,"eNumber":null},{"name":"vitamins","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1590,"proteinG":0.3,"carbsG":1.5,"sugarG":0.5,"fatG":40,"satFatG":11.7,"fibreG":0.5,"sodiumMg":333}'::jsonb
);

select public.import_product(
  '6001114000027', 'Blossom Regular Margarine', 'Blossom',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001114000027.jpg',
  500, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"vegetable fats and oils","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"sunflower","allergen":null,"eNumber":null},{"name":"maize","allergen":null,"eNumber":null},{"name":"tbhq","allergen":null,"eNumber":"E319"},{"name":"water","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"e471","allergen":null,"eNumber":"E471"},{"name":"e476","allergen":null,"eNumber":"E476"},{"name":"e322","allergen":null,"eNumber":"E322"},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"citric acid","allergen":null,"eNumber":"E330"},{"name":"beta carotene","allergen":null,"eNumber":"E160A"}]'::jsonb,
  '{"perBasis":"100g","energyKj":2643,"proteinG":0.6,"carbsG":1,"sugarG":0.1,"fatG":71.1,"satFatG":41,"fibreG":0.3,"sodiumMg":384}'::jsonb
);

select public.import_product(
  '6009522310622', 'All Gold Smooth Apricot Jam', 'All Gold',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009522310622.jpg',
  900, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"glucose","allergen":null,"eNumber":null},{"name":"apricot pulp","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":"E330"},{"name":"pectin","allergen":null,"eNumber":"E440"},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"anti-foaming agent","allergen":null,"eNumber":"E900"}]'::jsonb,
  '{"perBasis":"100g","energyKj":842,"proteinG":0.1,"carbsG":49,"sugarG":40.2,"fatG":0.2,"satFatG":0,"fibreG":0.5,"sodiumMg":8.2}'::jsonb
);

select public.import_product(
  '6009522310585', 'All Gold Strawberry Jam', 'All Gold',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009522310585.jpg',
  460, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"strawberries","allergen":null,"eNumber":null},{"name":"glucose","allergen":null,"eNumber":null},{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"pectin","allergen":null,"eNumber":"E440"},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"acidity regulator","allergen":null,"eNumber":"E330"},{"name":"colourant","allergen":null,"eNumber":"E124"},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"anti-foaming agent","allergen":null,"eNumber":"E900"}]'::jsonb,
  '{"perBasis":"100g","energyKj":882,"proteinG":0.1,"carbsG":51,"sugarG":48.7,"fatG":0.2,"satFatG":0,"fibreG":0.5,"sodiumMg":5.7}'::jsonb
);

select public.import_product(
  '6005044000034', 'Rhodes Superfine Apricot Jam', 'Rhodes',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6005044000034.jpg',
  900, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"sugar","allergen":null,"eNumber":null},{"name":"apricots","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":"E330"},{"name":"pectin","allergen":null,"eNumber":"E440"}]'::jsonb,
  '{"perBasis":"100g","energyKj":1110,"proteinG":0.3,"carbsG":65,"sugarG":64.9,"fatG":0.1,"satFatG":0.1,"fibreG":0.8,"sodiumMg":6}'::jsonb
);

select public.import_product(
  '80177173', 'Nutella Chocolate Spread', 'Nutella',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/80177173.jpg',
  350, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"sugar","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"hazelnuts","allergen":null,"eNumber":null},{"name":"skimmed milk powder","allergen":null,"eNumber":null},{"name":"fat-reduced cocoa powder","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"lecithin","allergen":null,"eNumber":null},{"name":"soy","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"vanillin","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"tree nuts (declared allergen)","allergen":"tree-nut","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":2266,"proteinG":6.3,"carbsG":58,"sugarG":56.3,"fatG":30.9,"satFatG":10.6,"fibreG":3,"sodiumMg":42}'::jsonb
);

select public.import_product(
  '6001069020446', 'Nola Original Mayonnaise', 'Nola',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001069020446.jpg',
  750, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"vegetable oil","allergen":null,"eNumber":null},{"name":"sunflower seed","allergen":null,"eNumber":null},{"name":"antioxidant tbhq","allergen":null,"eNumber":"E319"},{"name":"water","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"e1442","allergen":null,"eNumber":"E1442"},{"name":"e415","allergen":null,"eNumber":"E415"},{"name":"e412","allergen":null,"eNumber":"E412"},{"name":"e551","allergen":null,"eNumber":"E551"},{"name":"egg","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":"E300"},{"name":"lactic acid","allergen":null,"eNumber":"E270"},{"name":"mustard","allergen":null,"eNumber":null},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"colourants","allergen":null,"eNumber":null},{"name":"quinoline yellow","allergen":null,"eNumber":"E104"},{"name":"sunset yellow","allergen":null,"eNumber":"E110"},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"sorbic acid","allergen":null,"eNumber":"E200"},{"name":"antioxidant edta","allergen":null,"eNumber":"E985"},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1995,"proteinG":0.3,"carbsG":8,"sugarG":6.7,"fatG":52.3,"satFatG":7.2,"fibreG":0.5,"sodiumMg":475}'::jsonb
);

select public.import_product(
  '5000184321064', 'Hellmann''s Real Mayonnaise', 'Hellmann''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/5000184321064.jpg',
  400, 'g', 'sauces-spreads',
  array[]::text[],
  '[{"name":"rapeseed oil","allergen":null,"eNumber":null},{"name":"egg & egg yolk","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"spirit vinegar","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"lemon juice concentrate","allergen":null,"eNumber":null},{"name":"antioxidant","allergen":null,"eNumber":null},{"name":"calcium disodium edta","allergen":null,"eNumber":null},{"name":"paprika extract","allergen":null,"eNumber":null},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":3011,"proteinG":1.1,"carbsG":1.4,"sugarG":1.3,"fatG":79,"satFatG":6.1,"fibreG":null,"sodiumMg":null}'::jsonb
);

select public.import_product(
  '60019578', 'All Gold Tomato Sauce', 'All Gold',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/60019578.jpg',
  700, 'ml', 'sauces-spreads',
  array[]::text[],
  '[{"name":"tomato concentrate","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"tomato paste","allergen":null,"eNumber":null},{"name":"cane sugar","allergen":null,"eNumber":null},{"name":"vinegar","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"spices","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":456,"proteinG":0.5,"carbsG":27,"sugarG":22.2,"fatG":0.1,"satFatG":0.1,"fibreG":1.5,"sodiumMg":672}'::jsonb
);

select public.import_product(
  '6001299031076', 'Clover Mooi River Salted Butter', 'Clover',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001299031076.jpg',
  200, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"cream","allergen":null,"eNumber":null},{"name":"cow''s milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '5740900846401', 'Lurpak Salted Butter', 'Lurpak',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/5740900846401.jpg',
  100, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"cream","allergen":null,"eNumber":null},{"name":"from pasteurized cow''s milk","allergen":null,"eNumber":null},{"name":"lactic acid culture","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":3038,"proteinG":0.6,"carbsG":0.7,"sugarG":0.7,"fatG":82,"satFatG":52,"fibreG":null,"sodiumMg":null}'::jsonb
);

select public.import_product(
  '6009617223509', 'Lancewood Cheddar Cheese Slices', 'Lancewood',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009617223509.jpg',
  175, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"cheese","allergen":null,"eNumber":null},{"name":"cow''s milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"animal and microbial rennet","allergen":null,"eNumber":null},{"name":"lactic cultures","allergen":null,"eNumber":null},{"name":"skimmed milk","allergen":null,"eNumber":null},{"name":"butter","allergen":null,"eNumber":null},{"name":"skimmed milk powder","allergen":null,"eNumber":null},{"name":"emulsifying salt","allergen":null,"eNumber":"E452"},{"name":"modified starch","allergen":null,"eNumber":"E1442"},{"name":"unsalted butter","allergen":null,"eNumber":null},{"name":"cream","allergen":null,"eNumber":null},{"name":"lactic culture","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":"E330"},{"name":"colourant","allergen":null,"eNumber":"E160C"},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":845,"proteinG":14.2,"carbsG":7,"sugarG":5.5,"fatG":13,"satFatG":8.5,"fibreG":0,"sodiumMg":1470}'::jsonb
);

select public.import_product(
  '6001049038188', 'Parmalat Sliced Processed Cheddar Cheese', 'Parmalat',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001049038188.jpg',
  400, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"cheese","allergen":null,"eNumber":null},{"name":"pasteurised cow''s milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"calcium chloride","allergen":null,"eNumber":"E509"},{"name":"cheese cultures","allergen":null,"eNumber":null},{"name":"colourant","allergen":null,"eNumber":"E160B"},{"name":"non-animal rennet","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"milk solids","allergen":null,"eNumber":null},{"name":"whey","allergen":null,"eNumber":null},{"name":"cow''s milk","allergen":null,"eNumber":null},{"name":"butter","allergen":null,"eNumber":null},{"name":"cream","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":null},{"name":"e270","allergen":null,"eNumber":"E270"},{"name":"e524","allergen":null,"eNumber":"E524"},{"name":"emulsifying salts","allergen":null,"eNumber":null},{"name":"e450","allergen":null,"eNumber":"E450"},{"name":"e452","allergen":null,"eNumber":"E452"},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"e407","allergen":null,"eNumber":"E407"},{"name":"e407a","allergen":null,"eNumber":"E407A"},{"name":"flavouring","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"acidity regulators","allergen":null,"eNumber":null},{"name":"e339","allergen":null,"eNumber":"E339"},{"name":"e330","allergen":null,"eNumber":"E330"},{"name":"colourant","allergen":null,"eNumber":"E160C"}]'::jsonb,
  '{"perBasis":"100g","energyKj":972,"proteinG":14,"carbsG":4,"sugarG":4,"fatG":18,"satFatG":12,"fibreG":null,"sodiumMg":1463}'::jsonb
);

select public.import_product(
  '6001299015007', 'Clover Cheddar Cheese', 'Clover',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001299015007.jpg',
  800, 'g', 'dairy-eggs',
  array[]::text[],
  '[{"name":"cow''s milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"calcium chloride","allergen":null,"eNumber":"E509"},{"name":"natural colourant","allergen":null,"eNumber":null},{"name":"annatto","allergen":null,"eNumber":"E160B"},{"name":"starter culture","allergen":null,"eNumber":null},{"name":"microbial rennet","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"sodium nitrate","allergen":null,"eNumber":"E251"},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1619,"proteinG":24.1,"carbsG":1,"sugarG":0.5,"fatG":32.7,"satFatG":22.9,"fibreG":0.5,"sodiumMg":584}'::jsonb
);

select public.import_product(
  '6009617220201', 'Lancewood Medium Fat Plain Cream Cheese', 'Lancewood',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009617220201.jpg',
  230, 'g', 'dairy-eggs',
  array['egg', 'soy', 'gluten']::text[],
  '[{"name":"pasteurised cream","allergen":null,"eNumber":null},{"name":"pasteurised full cream milk","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"stabiliser","allergen":null,"eNumber":null},{"name":"e1422","allergen":null,"eNumber":"E1422"},{"name":"e440","allergen":null,"eNumber":"E440"},{"name":"e500","allergen":null,"eNumber":"E500"},{"name":"e331","allergen":null,"eNumber":"E331"},{"name":"e417","allergen":null,"eNumber":"E417"},{"name":"e412","allergen":null,"eNumber":"E412"},{"name":"lactic culture","allergen":null,"eNumber":null},{"name":"firming agent","allergen":null,"eNumber":"E509"},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1108,"proteinG":9.3,"carbsG":2,"sugarG":1.7,"fatG":24.9,"satFatG":16.4,"fibreG":0.5,"sodiumMg":283}'::jsonb
);

select public.import_product(
  '6001007309459', 'PnP Large Eggs 6 Pack', 'PnP',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001007309459.jpg',
  null, null, 'dairy-eggs',
  array[]::text[],
  '[{"name":"eggs","allergen":null,"eNumber":null},{"name":"egg (declared allergen)","allergen":"egg","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":616,"proteinG":13,"carbsG":1,"sugarG":null,"fatG":10,"satFatG":3,"fibreG":null,"sodiumMg":126}'::jsonb
);

select public.import_product(
  '6001299027321', 'Clover Double Cream Plain Yoghurt', 'Clover',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001299027321.jpg',
  1, 'kg', 'dairy-eggs',
  array[]::text[],
  '[{"name":"high fat cow''s milk","allergen":null,"eNumber":null},{"name":"reconstituted cow''s milk","allergen":null,"eNumber":null},{"name":"reconstituted whey","allergen":null,"eNumber":null},{"name":"cow''s milk","allergen":null,"eNumber":null},{"name":"stabilisers","allergen":null,"eNumber":null},{"name":"e1442","allergen":null,"eNumber":"E1442"},{"name":"e1422","allergen":null,"eNumber":"E1422"},{"name":"e440ii","allergen":null,"eNumber":"E440II"},{"name":"preservatives","allergen":null,"eNumber":null},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"pimaricin","allergen":null,"eNumber":"E235"},{"name":"yoghurt culture","allergen":null,"eNumber":null},{"name":"milk (declared allergen)","allergen":"milk","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":358,"proteinG":2.7,"carbsG":8,"sugarG":5.5,"fatG":4.6,"satFatG":3.3,"fibreG":null,"sodiumMg":77}'::jsonb
);

select public.import_product(
  '6001253010178', 'Albany Superior White Sliced Bread', 'Albany Superior',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001253010178.jpg',
  700, 'g', 'bakery',
  array[]::text[],
  '[{"name":"white bread wheat flour","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"soya flour","allergen":null,"eNumber":null},{"name":"soy","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"flour improver","allergen":null,"eNumber":null},{"name":"mineral salt and vitamins","allergen":null,"eNumber":null},{"name":"electrolytic iron and zinc oxide","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":985,"proteinG":8.1,"carbsG":45,"sugarG":4,"fatG":1.3,"satFatG":0.5,"fibreG":4.3,"sodiumMg":379}'::jsonb
);

select public.import_product(
  '6001253010185', 'Albany Superior Sliced Brown Bread', 'Albany Superior',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001253010185.jpg',
  700, 'g', 'bakery',
  array[]::text[],
  '[{"name":"brown bread wheat flour","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"soya flour","allergen":null,"eNumber":null},{"name":"soy","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"flour improver","allergen":null,"eNumber":null},{"name":"mineral salt and vitamins","allergen":null,"eNumber":null},{"name":"electrolytic iron and zinc oxide","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":949,"proteinG":7.9,"carbsG":41,"sugarG":3.1,"fatG":1.3,"satFatG":0.5,"fibreG":7.1,"sodiumMg":354}'::jsonb
);

select public.import_product(
  '6001710010192', 'Sasko Premium Sliced White Bread', 'Sasko',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001710010192.jpg',
  700, 'g', 'bakery',
  array[]::text[],
  '[{"name":"sasko white bread wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"may contain acidity regulator seasonally","allergen":null,"eNumber":null},{"name":"soybean flour","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"non-hydrogenated vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"tbhq","allergen":null,"eNumber":null},{"name":"preservative","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"flavour enhancer","allergen":null,"eNumber":null},{"name":"flour improvers","allergen":null,"eNumber":null},{"name":"enzymes","allergen":null,"eNumber":null},{"name":"mineral salts and vitamins","allergen":null,"eNumber":null},{"name":"electrolytic iron and zinc oxide","allergen":null,"eNumber":null},{"name":"a and b9","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":980,"proteinG":8.7,"carbsG":44,"sugarG":4.5,"fatG":1.6,"satFatG":0.6,"fibreG":3.9,"sodiumMg":341}'::jsonb
);

select public.import_product(
  '6009629181064', 'Blue Ribbon Classic White Sliced Bread', 'Blue Ribbon',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009629181064.jpg',
  700, 'g', 'bakery',
  array[]::text[],
  '[{"name":"white bread flour","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"wheat gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"soya flour","allergen":null,"eNumber":null},{"name":"soya","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"preservatives","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"flour improvers","allergen":null,"eNumber":null},{"name":"minerals and vitamins","allergen":null,"eNumber":null},{"name":"electrolytic iron","allergen":null,"eNumber":null},{"name":"zinc oxide","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1024,"proteinG":6.7,"carbsG":50,"sugarG":4.2,"fatG":1.7,"satFatG":0.8,"fibreG":5.9,"sodiumMg":356}'::jsonb
);

select public.import_product(
  '6009629181071', 'Blue Ribbon Classic Brown Sliced Bread', 'Blue Ribbon',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009629181071.jpg',
  700, 'g', 'bakery',
  array[]::text[],
  '[{"name":"brown bread flour","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"wheat gluten","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"vegetable fat","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"soya flour","allergen":null,"eNumber":null},{"name":"soya","allergen":null,"eNumber":null},{"name":"emulsifiers","allergen":null,"eNumber":null},{"name":"preservatives","allergen":null,"eNumber":null},{"name":"calcium propionate","allergen":null,"eNumber":null},{"name":"flour improvers","allergen":null,"eNumber":null},{"name":"minerals and vitamins","allergen":null,"eNumber":null},{"name":"electrolytic iron","allergen":null,"eNumber":null},{"name":"zinc oxide","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":998,"proteinG":6.4,"carbsG":47,"sugarG":2.4,"fatG":1.8,"satFatG":0.8,"fibreG":8.8,"sodiumMg":376}'::jsonb
);

select public.import_product(
  '6001056414425', 'Bakers Salticrax Crackers', 'Bakers',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001056414425.jpg',
  200, 'g', 'biscuits-rusks',
  array[]::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"unhydrogenated vegetable oil","allergen":null,"eNumber":null},{"name":"palm kernel","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"soya","allergen":null,"eNumber":null},{"name":"acid","allergen":null,"eNumber":"E270"},{"name":"invert syrup","allergen":null,"eNumber":null},{"name":"malt extract","allergen":null,"eNumber":null},{"name":"barley","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"glucose syrup","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"sunflower lecithin","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"anti-caking agent","allergen":null,"eNumber":"E341"},{"name":"raising agents","allergen":null,"eNumber":null},{"name":"sodium acid pyrophosphate","allergen":null,"eNumber":null},{"name":"sodium bicarbonate","allergen":null,"eNumber":null},{"name":"golden syrup","allergen":null,"eNumber":null},{"name":"flour improver","allergen":null,"eNumber":null},{"name":"sodium metabisulphite","allergen":null,"eNumber":null},{"name":"proteolytic enzyme","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":2055,"proteinG":10.1,"carbsG":57,"sugarG":null,"fatG":24.7,"satFatG":13.1,"fibreG":2.3,"sodiumMg":688}'::jsonb
);

select public.import_product(
  '6009704171492', 'Bakers Crisp Cream Crackers', 'Bakers',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009704171492.jpg',
  200, 'g', 'biscuits-rusks',
  array[]::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"unhydrogenated vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"golden syrup","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"soya","allergen":null,"eNumber":null},{"name":"raising agents","allergen":null,"eNumber":null},{"name":"sodium acid pyrophosphate","allergen":null,"eNumber":null},{"name":"sodium bicarbonate","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"malt extract","allergen":null,"eNumber":null},{"name":"barley","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"fat powder","allergen":null,"eNumber":null},{"name":"unhydrogenated vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit","allergen":null,"eNumber":null},{"name":"maltodextrin","allergen":null,"eNumber":null},{"name":"wheat gluten","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":"E471"},{"name":"acid","allergen":null,"eNumber":"E330"},{"name":"anti-caking agent","allergen":null,"eNumber":"E551"},{"name":"glucose syrup","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"sunflower lecithin","allergen":null,"eNumber":null},{"name":"rice flour","allergen":null,"eNumber":null},{"name":"anti-caking agent","allergen":null,"eNumber":"E341"},{"name":"proteolytic enzyme","allergen":null,"eNumber":null},{"name":"flour improver","allergen":null,"eNumber":null},{"name":"sodium metabisulphite","allergen":null,"eNumber":null},{"name":"soy (declared allergen)","allergen":"soy","eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1626,"proteinG":11.1,"carbsG":60,"sugarG":3.4,"fatG":12.9,"satFatG":7.1,"fibreG":8,"sodiumMg":708}'::jsonb
);

select public.import_product(
  '6004873002943', 'Tasty Treats Saltee Crackers', 'Tasty Treats',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6004873002943.jpg',
  200, 'g', 'biscuits-rusks',
  array['milk', 'egg', 'soy', 'tree-nut']::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"unhydrogenated vegetable oil","allergen":null,"eNumber":null},{"name":"palm fruit mesocarp","allergen":null,"eNumber":null},{"name":"antioxidant tbhq","allergen":null,"eNumber":null},{"name":"sunflower seed oil","allergen":null,"eNumber":null},{"name":"antioxidant tbhq","allergen":null,"eNumber":null},{"name":"wheat gluten","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"malt flour","allergen":null,"eNumber":null},{"name":"barley","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"yeast","allergen":null,"eNumber":null},{"name":"raising agents","allergen":null,"eNumber":null},{"name":"ammonium bicarbonate","allergen":null,"eNumber":"E503"},{"name":"sodium bicarbonate","allergen":null,"eNumber":"E500"},{"name":"sodium acid pyrophosphate","allergen":null,"eNumber":"E450I"},{"name":"glucose","allergen":null,"eNumber":null},{"name":"golden syrup","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"citric acid","allergen":null,"eNumber":"E330"},{"name":"invert syrup","allergen":null,"eNumber":null},{"name":"acidity regulator","allergen":null,"eNumber":null},{"name":"lactic acid","allergen":null,"eNumber":"E270"},{"name":"flour improver","allergen":null,"eNumber":null},{"name":"sodium metabisulphite","allergen":null,"eNumber":"E223"},{"name":"enzymes","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1842,"proteinG":13.4,"carbsG":56,"sugarG":5.2,"fatG":17.8,"satFatG":5.9,"fibreG":4.2,"sodiumMg":798}'::jsonb
);

select public.import_product(
  '6001306000996', 'Kellogg''s Corn Flakes', 'Kellogg''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001306000996.jpg',
  1, 'kg', 'cereals',
  array[]::text[],
  '[{"name":"corn","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"barley malt extract","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"anti-oxidant","allergen":null,"eNumber":null},{"name":"mixed tocopherols","allergen":null,"eNumber":null},{"name":"vitamins minerals","allergen":null,"eNumber":null},{"name":"vitamin a","allergen":null,"eNumber":null},{"name":"niacin","allergen":null,"eNumber":null},{"name":"folic acid","allergen":null,"eNumber":null},{"name":"pantothenic acid","allergen":null,"eNumber":null},{"name":"iron and zinc oxide","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1355,"proteinG":6.6,"carbsG":71,"sugarG":7.9,"fatG":1,"satFatG":0.1,"fibreG":2.3,"sodiumMg":399}'::jsonb
);

select public.import_product(
  '6001052002459', 'Bokomo Corn Flakes', 'Bokomo',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001052002459.jpg',
  1, 'kg', 'cereals',
  array[]::text[],
  '[{"name":"maize","allergen":null,"eNumber":null},{"name":"sugar","allergen":null,"eNumber":null},{"name":"barley malt extract","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"salt","allergen":null,"eNumber":null},{"name":"emulsifier","allergen":null,"eNumber":null},{"name":"vitamins and minerals","allergen":null,"eNumber":null},{"name":"b9 & b12","allergen":null,"eNumber":null},{"name":"electrolytic iron","allergen":null,"eNumber":null},{"name":"zinc oxide and sodium selenite","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1578,"proteinG":7.4,"carbsG":82,"sugarG":7.4,"fatG":1.1,"satFatG":0.4,"fibreG":3.2,"sodiumMg":406}'::jsonb
);

select public.import_product(
  '6009522300098', 'Fatti''s & Moni''s Spaghetti', 'Fatti''s & Moni''s',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009522300098.jpg',
  500, 'g', 'pantry',
  array[]::text[],
  '[{"name":"wheat flour","allergen":null,"eNumber":null},{"name":"wheat","allergen":null,"eNumber":null},{"name":"gluten","allergen":null,"eNumber":null},{"name":"vitamin b2","allergen":null,"eNumber":null},{"name":"beta-carotene","allergen":null,"eNumber":null},{"name":"e160a","allergen":null,"eNumber":"E160A"},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1456,"proteinG":12,"carbsG":66,"sugarG":3.5,"fatG":1.6,"satFatG":0.4,"fibreG":5.7,"sodiumMg":12}'::jsonb
);

select public.import_product(
  '8076800195057', 'Barilla Spaghetti', 'Barilla',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/8076800195057.jpg',
  500, 'g', 'pantry',
  array['egg']::text[],
  '[{"name":"special blend of durum wheat semolina","allergen":null,"eNumber":null},{"name":"water","allergen":null,"eNumber":null},{"name":"gluten (declared allergen)","allergen":"gluten","eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1521,"proteinG":12.8,"carbsG":70.7,"sugarG":3.5,"fatG":2,"satFatG":0.5,"fibreG":3,"sodiumMg":null}'::jsonb
);

select public.import_product(
  '6009188000349', 'Nestle Ricoffy Instant Coffee', 'Nestle',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009188000349.jpg',
  100, 'g', 'pantry',
  array[]::text[],
  '[{"name":"chicory and coffee mixture","allergen":null,"eNumber":null},{"name":"chicory","allergen":null,"eNumber":null},{"name":"coffee","allergen":null,"eNumber":null},{"name":"glucose syrup","allergen":null,"eNumber":null}]'::jsonb,
  '{"perBasis":"100g","energyKj":1536,"proteinG":4.6,"carbsG":83,"sugarG":18.2,"fatG":0,"satFatG":0,"fibreG":7,"sodiumMg":350}'::jsonb
);

select public.import_product(
  '6009188006884', 'Nescafe Classic Instant Coffee Refill', 'Nescafe',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6009188006884.jpg',
  230, 'g', 'pantry',
  array[]::text[],
  '[{"name":"pure soluble coffee","allergen":null,"eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6001299010064', 'Clover Krush Fruit Juice Blend 100% Orange', 'Clover Krush',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001299010064.jpg',
  1.5, 'l', 'drinks',
  array[]::text[],
  '[{"name":"orange juice with cells","allergen":null,"eNumber":null},{"name":"apple juice","allergen":null,"eNumber":null},{"name":"pear juice","allergen":null,"eNumber":null},{"name":"acidity regulators","allergen":null,"eNumber":null},{"name":"e330","allergen":null,"eNumber":"E330"},{"name":"e331","allergen":null,"eNumber":"E331"},{"name":"preservatives","allergen":null,"eNumber":null},{"name":"sodium benzoate","allergen":null,"eNumber":"E211"},{"name":"potassium sorbate","allergen":null,"eNumber":"E202"},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"vitamins","allergen":null,"eNumber":null}]'::jsonb,
  null
);

select public.import_product(
  '6001010001661', 'Rhodes Quality 100% Apple & Cranberry Juice', 'Rhodes',
  'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/6001010001661.jpg',
  1, 'l', 'drinks',
  array[]::text[],
  '[{"name":"apple juice","allergen":null,"eNumber":null},{"name":"cranberry juice","allergen":null,"eNumber":null},{"name":"grape","allergen":null,"eNumber":null},{"name":"pear juice","allergen":null,"eNumber":null},{"name":"aronia juice","allergen":null,"eNumber":null},{"name":"flavourings","allergen":null,"eNumber":null},{"name":"grape skin extract","allergen":null,"eNumber":"E163II"},{"name":"acidity regulator","allergen":null,"eNumber":"E330"}]'::jsonb,
  '{"perBasis":"100g","energyKj":179,"proteinG":0.1,"carbsG":11,"sugarG":10.5,"fatG":0.1,"satFatG":0,"fibreG":0,"sodiumMg":null}'::jsonb
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
     '6009710390184',
     '6009710390146',
     '6001114000027',
     '6009522310622',
     '6009522310585',
     '6005044000034',
     '80177173',
     '6001069020446',
     '5000184321064',
     '60019578',
     '6001299031076',
     '5740900846401',
     '6009617223509',
     '6001049038188',
     '6001299015007',
     '6009617220201',
     '6001007309459',
     '6001299027321',
     '6001253010178',
     '6001253010185',
     '6001710010192',
     '6009629181064',
     '6009629181071',
     '6001056414425',
     '6009704171492',
     '6004873002943',
     '6001306000996',
     '6001052002459',
     '6009522300098',
     '8076800195057',
     '6009188000349',
     '6009188006884',
     '6001299010064',
     '6001010001661'
   );

-- Pick n Pay's pack shot for products we already had.
update public.products
   set image_url = 'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/' || barcode || '.jpg'
 where source in ('open_food_facts', 'seed')
   and barcode in (
     '6009710390177',
     '6009522301262',
     '6001030003966',
     '6001049032445',
     '6009617222786',
     '6001710010253',
     '6001069034405',
     '6001069033552',
     '6001069034139',
     '6001069033569',
     '6009900528793',
     '6001120621254',
     '6009801741208',
     '6001007041052',
     '6007414003263',
     '6001007275273',
     '6001007304201',
     '6001007091743',
     '6009188002213',
     '6007414004383',
     '6001065601069',
     '6001299810312',
     '0041570112618',
     '6001710010369',
     '6001710010420',
     '6001253010314',
     '6009518601505',
     '6007251000128',
     '6001114000324',
     '6001007315474',
     '6009710390412',
     '6001250075019',
     '6001007999827',
     '6001069019990',
     '60050144',
     '60050151',
     '6009617220829',
     '6001049011976',
     '6009510808643',
     '6009218008499',
     '6009218008079',
     '6001299033667',
     '60066473',
     '6004873003827',
     '6001056414500',
     '6004873003490',
     '6001056453004',
     '6001069600860',
     '6009802364277',
     '6001306001009',
     '6001052001018',
     '6001052001049',
     '6009679326071',
     '6009606260317',
     '6001306000903',
     '6001275000003',
     '6001052003906',
     '6001052004620',
     '6001007302856',
     '6002680000312',
     '6009518203280',
     '4806030203659',
     '6009880412563',
     '6001240229781',
     '6009612470083',
     '5449000107749',
     '5449000107664',
     '6009612470045',
     '6009702443768',
     '6001089120843',
     '6006822000529',
     '6006822002288',
     '7613036412346',
     '6001231000191',
     '6001231000276',
     '6001231000351',
     '6001231009811',
     '6001231081404',
     '6002908000063',
     '6001571015596',
     '6002908000070',
     '6003105001228',
     '6001503000034',
     '6001205102562',
     '6001256001951',
     '6009624270213',
     '6001068311804',
     '6001030003553',
     '6001115001535',
     '6009644140404',
     '6009644141005',
     '6009813410475',
     '6001092500052',
     '6009704171089',
     '6001115001542',
     '6001115001337',
     '60051912',
     '6009510809435',
     '6009510809442',
     '6009510809466',
     '6009710720622',
     '6009710723586',
     '6009710720653',
     '6001069202804',
     '6009710720608',
     '6009710720615',
     '6009650905646',
     '6001065601052',
     '6001068592401',
     '6009188000103',
     '6009188001216',
     '6001065034324',
     '6001120609955',
     '6001120016647',
     '6001704008051',
     '6001168050009',
     '6001120602888',
     '6009800820072',
     '60054258',
     '6001049129848',
     '6001325230336',
     '6001299012082',
     '6001007445201',
     '6001087011334',
     '6001087011341',
     '6003105000658',
     '6001038071554',
     '6002908000179',
     '6002908000032'
   );