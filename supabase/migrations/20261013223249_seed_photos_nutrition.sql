-- Njam: photos and nutrition tables for the seeded products
--
-- Data only. Taken from Open Food Facts (openfoodfacts.org), the open food
-- database, on 13 Oct 2026. The seed's barcodes are placeholders, so each
-- product was matched by name and brand to a South African entry, and the
-- photo and table were checked by hand. The Open Food Facts code each one
-- came from is in the comment beside it.
--
-- Licences: the photos are CC BY-SA and the data is ODbL, both from Open
-- Food Facts and its contributors. The photos load from Open Food Facts'
-- own image server; nothing is copied into Storage.
--
-- Each nutrition table was checked before use: sugar no more than carbs,
-- saturated fat no more than fat, no more than 100 g of nutrients per 100 g,
-- a believable sodium, and energy within 20% of what the protein, carbs, fat
-- and fibre add up to. What failed is left out rather than guessed:
--   Rama Original     sodium given as 180 g per 100 g, so sodium is empty.
--   Lucky Star        energy (438 kJ) contradicts its own macros (~569 kJ),
--                     so it has no table.
-- Where only kcal was given, kJ is kcal x 4.184. Some products have no table
-- on Open Food Facts (Tastic rice, Huletts sugar, All Gold tomato sauce,
-- Knorrox cubes) and Albany Superior White has no photo there; those stay
-- empty, and the app says so.
--
-- These figures are display only. The verdict engine does not read
-- nutrition_facts yet, so they cannot change a verdict.

-- ---------------------------------------------------------------------------
-- Photos
-- ---------------------------------------------------------------------------

update public.products p
set image_url = v.image_url
from (values
  ('2000000000015', 'https://images.openfoodfacts.org/images/products/600/129/900/0270/front_en.9.400.jpg'),  -- OFF 6001299000270: Clover Full Cream Fresh Milk (2 L pack)
  ('2000000000022', 'https://images.openfoodfacts.org/images/products/600/970/846/2480/front_en.3.400.jpg'),  -- OFF 6009708462480: Ultra Mel Custard (1 kg pack)
  ('2000000000039', 'https://images.openfoodfacts.org/images/products/600/961/722/2717/front_en.3.400.jpg'),  -- OFF 6009617222717: Lancewood Cheddar
  ('2000000000046', 'https://images.openfoodfacts.org/images/products/600/161/924/6043/front_en.4.400.jpg'),  -- OFF 6001619246043: Nulaid XL Eggs (same eggs, per 100 g)
  ('2000000000060', 'https://images.openfoodfacts.org/images/products/600/127/500/0003/front_en.26.400.jpg'),  -- OFF 6001275000003: Jungle Oats 1 kg
  ('2000000000077', 'https://images.openfoodfacts.org/images/products/600/105/200/3906/front_en.4.400.jpg'),  -- OFF 6001052003906: Bokomo Weet-Bix (1.35 kg pack)
  ('2000000000084', 'https://images.openfoodfacts.org/images/products/600/106/848/0401/front_en.12.400.jpg'),  -- OFF 6001068480401: Nestle Milo 500 g
  ('2000000000091', 'https://images.openfoodfacts.org/images/products/600/120/515/2000/front_en.3.400.jpg'),  -- OFF 6001205152000: Iwisa Super Maize Meal 2.5 kg
  ('2000000000107', 'https://images.openfoodfacts.org/images/products/600/123/100/0351/front_en.11.400.jpg'),  -- OFF 6001231000351: Tastic Long Grain Parboiled Rice; no nutrition on OFF
  ('2000000000114', 'https://images.openfoodfacts.org/images/products/600/104/200/0403/front_en.3.400.jpg'),  -- OFF 6001042000403: Huletts White Sugar; no nutrition on OFF
  ('2000000000121', 'https://images.openfoodfacts.org/images/products/600/952/231/0288/front_en.13.400.jpg'),  -- OFF 6009522310288: Black Cat Smooth Peanut Butter 400 g
  ('2000000000138', 'https://images.openfoodfacts.org/images/products/600/952/230/8407/front_en.14.400.jpg'),  -- OFF 6009522308407: All Gold Tomato Sauce; no nutrition on OFF
  ('2000000000145', 'https://images.openfoodfacts.org/images/products/600/109/250/0052/front_en.48.400.jpg'),  -- OFF 6001092500052: Mrs H.S. Balls Original Recipe Chutney 470 g
  ('2000000000152', 'https://images.openfoodfacts.org/images/products/600/971/039/0184/front_en.5.400.jpg'),  -- OFF 6009710390184: Rama Original 500 g
  ('2000000000169', 'https://images.openfoodfacts.org/images/products/600/952/230/0586/front_en.23.400.jpg'),  -- OFF 6009522300586: KOO Baked Beans in Tomato Sauce 410 g
  ('2000000000176', 'https://images.openfoodfacts.org/images/products/600/111/500/1535/front_en.35.400.jpg'),  -- OFF 6001115001535: Lucky Star Pilchards in Tomato Sauce 400 g
  ('2000000000183', 'https://images.openfoodfacts.org/images/products/600/106/960/0822/front_en.8.400.jpg'),  -- OFF 6001069600822: Ouma Buttermilk Rusks 500 g
  ('2000000000190', 'https://images.openfoodfacts.org/images/products/600/970/417/0693/front_en.5.400.jpg'),  -- OFF 6009704170693: Bakers Tennis
  ('2000000000206', 'https://images.openfoodfacts.org/images/products/600/105/645/3004/front_fr.41.400.jpg'),  -- OFF 6001056453004: Bakers Blue Label Marie 200 g
  ('2000000000213', 'https://images.openfoodfacts.org/images/products/544/900/000/0439/front_en.292.400.jpg'),  -- OFF 5449000000439: Coca-Cola Original
  ('2000000000220', 'https://images.openfoodfacts.org/images/products/600/124/023/9346/front_en.3.400.jpg'),  -- OFF 6001240239346: Liqui-Fruit Clear Apple (photo and table from two OFF entries)
  ('2000000000237', 'https://images.openfoodfacts.org/images/products/600/951/080/9435/front_en.11.400.jpg'),  -- OFF 6009510809435: Simba Salt & Vinegar 120 g (photo); table from the Simba-made Salt & Vinegar potato chips entry
  ('2000000000244', 'https://images.openfoodfacts.org/images/products/600/951/080/8643/front_en.31.400.jpg'),  -- OFF 6009510808643: Nik Naks Original Cheese
  ('2000000000251', 'https://images.openfoodfacts.org/images/products/600/103/806/2453/front_en.3.400.jpg')  -- OFF 6001038062453: Knorrox Beef cubes 120 g; OFF nutrition implausible
) as v(barcode, image_url)
where p.barcode = v.barcode;

-- ---------------------------------------------------------------------------
-- Nutrition tables, per 100 g or 100 ml as the label gives them
-- ---------------------------------------------------------------------------

insert into public.nutrition_facts
  (product_id, per_basis, energy_kj, protein_g, carbs_g, sugar_g, fat_g, sat_fat_g, fibre_g, sodium_mg)
select p.id, v.per_basis, v.energy_kj, v.protein_g, v.carbs_g, v.sugar_g, v.fat_g, v.sat_fat_g, v.fibre_g, v.sodium_mg
from (values
  ('2000000000015', '100ml', 262.0, 3.2, 5.0, 5.0, 3.4, 1.9, 0.0, 50),  -- OFF 6001299000270
  ('2000000000022', '100g', 366, 1.6, 16.0, 11.6, 1.84, 0.88, 0.08, 40),  -- OFF 6009708462480
  ('2000000000039', '100g', 1598, 25.2, 1.0, 0.5, 30.7, 21.5, 0.05, null),  -- OFF 6009617222717
  ('2000000000046', '100g', 616, 12.6, 1.0, 1.0, 10.3, 3.0, null, 50),  -- OFF 6001619246043
  ('2000000000053', '100g', 748.4, 6.0, 34.0, null, 1.2, null, 3.0, null),  -- OFF 20156367
  ('2000000000060', '100g', 1584.0, 13.1, 57.0, 1.5, 7.9, 1.6, 11.6, 10),  -- OFF 6001275000003
  ('2000000000077', '100g', 1480.0, 12.4, 63.0, 2.9, 2.9, 0.7, 11.9, 350),  -- OFF 6001052003906
  ('2000000000084', '100g', 1749.0, 11.6, 66.0, 39.2, 10.7, 7.7, 6.1, 300),  -- OFF 6001068480401
  ('2000000000091', '100g', 1390.0, 7.8, 70.0, 0.5, 1.1, 0.2, 3.2, 10),  -- OFF 6001205152000
  ('2000000000121', '100g', 2374.0, 27.5, 16.0, 12.5, 42.8, 6.5, 7.1, 320),  -- OFF 6009522310288
  ('2000000000145', '100g', 730.0, 0.8, 45.2, 34.5, 0.1, 0.02, 1.0, 390),  -- OFF 6001092500052
  ('2000000000152', '100g', 2617.0, 0.4, 1.0, 0.4, 70.0, 32.7, 1.0, null),  -- OFF 6009710390184
  ('2000000000169', '100g', 387.0, 4.7, 16.0, 8.1, 1.0, 0.2, 3.8, 520),  -- OFF 6009522300586
  ('2000000000183', '100g', 1866.2, 9.1, 68.0, 17.9, 14.3, 6.8, 3.3, 620),  -- OFF 6001069600822
  ('2000000000190', '100g', 1931.0, 5.8, 69.0, 21.6, 17.0, 12.4, 3.8, 420),  -- OFF 6009704170693
  ('2000000000206', '100g', 1772.0, 8.21, 76.79, 21.79, 9.64, 5.36, 1.79, 380),  -- OFF 6001056453004
  ('2000000000213', '100ml', 180.0, 0.0, 11.2, 11.2, 0.0, 0.0, 0.0, 0),  -- OFF 5449000000439
  ('2000000000220', '100ml', 205.6, 0.25, 11.5, null, 0.05, null, 0.5, null),  -- OFF 6001240240267
  ('2000000000237', '100g', 2240.0, 7.4, 46.0, 0.7, 36.0, 14.0, 5.2, 910),  -- OFF 6009510804775
  ('2000000000244', '100g', 2263.0, 5.5, 58.5, 0.0, 31.0, 13.0, 3.5, 650)  -- OFF 6009510808643
) as v(barcode, per_basis, energy_kj, protein_g, carbs_g, sugar_g, fat_g, sat_fat_g, fibre_g, sodium_mg)
join public.products p on p.barcode = v.barcode
on conflict (product_id) do nothing;
