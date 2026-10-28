/**
 * Builds a migration that adds everyday products from Pick n Pay's website,
 * with clean pack shots, and gives existing products the same pack shots.
 *
 *   node scripts/import-pnp-products.mjs <existing-barcodes.txt> <out-dir>
 *
 * existing-barcodes.txt holds one "barcode,source" or "barcode,source,image_url"
 * per line: the catalogue as it is now, so a product we already have is never
 * added twice, and a pack shot swapped in by an earlier run is not redone.
 *
 * It writes to <out-dir>:
 *   products.json      what was read and mapped, for checking by hand
 *   photos/<barcode>.jpg  one pack shot per product, to upload to the
 *                      product-photos bucket before the migration runs
 *   migration.sql      the import, ready to copy into supabase/migrations
 *
 * Two jobs:
 *   1. NEW_PRODUCTS: each one is read from Pick n Pay's product page data
 *      (barcode, ingredient list, allergen warnings, nutrition table, photo)
 *      and saved through import_product, the same path as an Open Food Facts
 *      import, then marked source 'retailer' and verified. Check every
 *      mapped list in products.json against the label text before running
 *      the migration: verified means the engine trusts it. Products without
 *      an ingredient list are skipped: the verdict engine cannot judge them.
 *   2. PHOTO_SEARCHES: Pick n Pay's search results carry each product's
 *      photo address, and that address contains the barcode. Any barcode we
 *      already have gets Pick n Pay's photo instead of the Open Food Facts
 *      one, which is often a phone snap.
 *
 * Read slowly, one request every PAUSE_MS, to be polite to Pick n Pay.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const API = 'https://www.pnp.co.za/pnphybris/v2/pnp-spa';
const STORE = 'WC21';
const PAUSE_MS = 700;
const HEADERS = { 'User-Agent': 'Njam/1.0 (DV300 student project)', 'Content-Type': 'application/json' };
const PHOTO_BASE = 'https://tvbicevfvcvnkgcutrhv.supabase.co/storage/v1/object/public/product-photos/';

/** Pick n Pay product codes, by our aisle (categories.slug). */
const NEW_PRODUCTS = {
  'tins-jars': [
    372642, 247089, // vegetables: Koo creamstyle sweetcorn, Koo mixed vegetables
    209277, 106751, // beans: Rhodes butter beans, Koo chakalaka
    128151, // Koo peach halves
    180832, // Lucky Star tuna in oil
  ],
  pantry: [
    1021943, 425204, // soup: Knorr, Royco
    139407, 438900, // stock: Ina Paarman chicken powder, beef concentrate
    755708, 872560, // gluten-free pasta: San Remo, Barilla
  ],
  'sauces-spreads': [
    250981, 195808, 147222, // spices: Robertsons chicken and barbecue, Rajah curry
    154907, 106689, 960798, 866053, // sauces: Nando's, Steers BBQ, Kikkoman, Mrs Ball's sweet chilli
  ],
  bakery: [601558, 601557], // gluten-free bread: Fresh Earth
  'dairy-eggs': [
    901002, 877401, // dairy-free cheese: Earth & Co, Fairview
    939043, 884038, // dairy-free soya yoghurt, lactose-free yoghurt
  ],
  drinks: [982203, 679915], // almond milk: ButtaNutt, Almond Breeze
  frozen: [533360, 634526, 476961, 701421, 145443], // McCain veg and chips, I&J fish fingers, ice cream, pizza
  baby: [216079, 235123, 683337, 965960, 910657], // Purity jars and pouch, Cerelac, Hey Baby puffs
};

/**
 * Nutrition tables that pass the checks below but are wrong on the page,
 * found by reading them. Left out rather than trusted: a limit rule that
 * under-counts could say Safe.
 */
const WRONG_NUTRITION = {
  '6001299031076': 'Clover butter: 3.4 g saturated fat of 81 g fat, and 10 g fibre',
};

/**
 * Ingredient lists typed wrongly on the page, corrected by reading them:
 * a missing comma, a list written as a sentence, a bracket left open.
 */
const LABEL_FIXES = {
  // "Lemon Puree (4%) Vegetable Oil": the comma after (4%) is missing.
  '6003770000168':
    "Water, Vinegar, Onion Puree (11%), Salt, Lemon Puree (4%), Vegetable Oil (Sunflower Seed), Spices (Cayenne Pepper, African Bird's Eye Chilli, Paprika), Serrano Chilli, Garlic Puree (1%), Stabilisers (Xanthan Gum, Propylene Glycol Alginate), Ascorbic Acid, Rosemary Extract",
  // McCain Garden Mix is written as one sentence joined by "&" and "and".
  '6009650905158': 'Carrot Roundels, Cut Green Beans, Cauliflower Cuts, Broccoli Cuts, Marrow Roundels',
  // Cerelac: "Probiotic 106 CFU/g ... culture)" closes a bracket it never opened.
  '6009188007959':
    'Wheat Flour (gluten), Skimmed Milk Powder (30%), Brown Sugar, Vegetable Oil (Palm Fruit, Rapeseed, Coconut, Sunflower Seed, Ascorbyl Palmitate), Flavouring, Calcium Carbonate, Sodium Phosphate, Vitamins (C, E, Niacin, Pantothenic Acid, B1, A, B2, B6, Folic Acid, D3, B12), Probiotic (Bifidobacterium lactis culture), Ferrous Fumarate, Zinc Sulphate',
};

/**
 * Barcodes where Pick n Pay's photo shows a different product from our
 * record, so the barcode match cannot be trusted. Their photo is kept.
 */
const WRONG_PHOTOS = {
  '6007359002727': 'ours is Clover Ma Milk Alternative, Pick n Pay shows Good Hope soy milk',
  '6009510802542': 'ours is Doritos Sweet Chilli Pepper, Pick n Pay shows Simba Sweet Chilli And Pepper',
  '6009617221734': 'ours is plain chunky cottage cheese, Pick n Pay shows the chives one',
};

/** Brands Pick n Pay files under a range name ("ITAL" for Dr Oetker Ital Pizza). */
const BRAND_FIXES = {
  '6001428000317': 'Dr Oetker',
};

/** Searches whose results are matched against barcodes we already have. */
const PHOTO_SEARCHES = [
  'sweetcorn', 'beans', 'chakalaka', 'tinned fruit', 'tinned vegetables', 'chickpeas',
  'tomato paste', 'curry powder', 'spice', 'herbs', 'salt', 'soy sauce', 'peri peri',
  'barbecue sauce', 'sweet chilli sauce', 'mustard', 'relish', 'gluten free', 'dairy free',
  'lactose free', 'almond milk', 'oat milk', 'soya milk', 'frozen vegetables', 'frozen chips',
  'fish fingers', 'ice cream', 'pizza', 'baby food', 'baby cereal', 'baby snacks',
  'energy drink', 'sparkling water', 'beer', 'wine', 'crisps', 'chocolate bar', 'sweets',
  'biltong', 'protein bar', 'wraps', 'muffins', 'granola', 'pasta', 'noodles', 'cream cheese',
];

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(path, method = 'GET') {
  const response = await fetch(API + path, { method, headers: HEADERS, body: method === 'POST' ? '{}' : undefined });
  if (!response.ok) throw new Error(`${response.status} for ${path}`);
  return response.json();
}

// ---------------------------------------------------------------------------
// Ingredients
// ---------------------------------------------------------------------------

const OPEN = '([{';
const CLOSE = ')]}';

/** True when every bracket in the text is closed again. */
function balanced(text) {
  let depth = 0;
  for (const char of text) {
    if (OPEN.includes(char)) depth += 1;
    if (CLOSE.includes(char)) depth -= 1;
    if (depth < 0) return false;
  }
  return depth === 0;
}

/**
 * Splits on commas and semicolons that are not inside brackets. A label
 * with a bracket left open cannot be read as a tree, so every bracket is
 * ignored and every comma splits: each word still becomes an ingredient
 * the rules can see, which is the safe way to be wrong.
 */
function splitTopLevel(text) {
  if (!balanced(text)) return text.replace(/[()[\]{}]/g, ',').split(/[,;]/).map((part) => part.trim()).filter(Boolean);
  const parts = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (OPEN.includes(char)) depth += 1;
    if (CLOSE.includes(char)) depth -= 1;
    if ((char === ',' || char === ';') && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean);
}

/**
 * "Emulsifier (Lecithin)(Soy)" has the name "Emulsifier" and the inside
 * "Lecithin, Soy": every top-level bracket group is inside, the rest is the
 * name.
 */
function splitBrackets(item) {
  let depth = 0;
  let name = '';
  let inside = '';
  for (const char of item) {
    if (OPEN.includes(char)) {
      if (depth > 0) inside += char;
      else inside += ', ';
      depth += 1;
    } else if (CLOSE.includes(char)) {
      depth -= 1;
      if (depth > 0) inside += char;
    } else if (depth > 0) {
      inside += char;
    } else {
      name += char;
    }
  }
  return { name, inside: inside.replace(/^,\s*/, '') };
}

const E_NUMBER = /^e\s?(\d{3,4}[a-z]{0,3})$/i;
/** "Ammonium Bicarbonate E503": an E-number written after the name. */
const TRAILING_E_NUMBER = /\s+\(?e\s?(\d{3,4}[a-z]{0,3})\)?$/i;
/** Amounts and notes that are not ingredients: "56%", "Minimum 35%", "Irradiated". */
const NOT_AN_INGREDIENT = [
  /^(min(imum)?\.?\s*)?[\d.,]+\s*%(\s*min(imum)?\.?)?$/,
  /^(irradiated|radiated|radurised|non-[il]odated|genetically modified|protein source|vegetable origin|non-animal( origin)?)$/,
  /^(in variable proportions?|sustainably grown|unhydrogenated)$/,
  /^(made )?(from )?reconstituted (from )?concentrates?( with water)?$/,
];

function cleanName(raw) {
  return raw
    .replace(/[*_†‡]/g, '')
    .replace(/[’‘]/g, "'")
    .replace(/\b(contains|as an additive)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s:;.&-]+|[\s:;.&-]+$/g, '')
    .toLowerCase()
    .replace(/^and\s+/, '');
}

const isNote = (name) => NOT_AN_INGREDIENT.some((pattern) => pattern.test(name));
/** "A", "B12" inside "Vitamins (A, B12)" are not ingredients on their own. "Egg" and "soy" are. */
const isVitaminLetter = (name) => /^[a-z]\d{0,2}$/.test(name);

/**
 * One label item to our ingredient rows. "Emulsifiers (E471, E322)" keeps
 * "emulsifiers" and both E-numbers. "Canola and/or Sunflower" becomes both,
 * because a rule has to see each one. The name before a colon is a class
 * ("Preservative: Potassium Sorbate"), so the part after it is the name.
 */
function ingredientsFrom(item) {
  const { name: outside, inside } = splitBrackets(item);
  const rawName = outside.includes(':') ? outside.split(':').pop() : outside;
  const own = rawName
    .split(/\band\/or\b|\//i)
    .map(cleanName)
    .filter((name) => name && !isNote(name) && !isVitaminLetter(name))
    .map((name) => {
      const alone = name.match(E_NUMBER);
      if (alone) return { name, allergen: null, eNumber: `E${alone[1].toUpperCase()}` };
      const trailing = name.match(TRAILING_E_NUMBER);
      return trailing
        ? { name: name.slice(0, trailing.index).trim(), allergen: null, eNumber: `E${trailing[1].toUpperCase()}` }
        : { name, allergen: null, eNumber: null };
    });

  const insideParts = inside ? splitTopLevel(inside) : [];
  const eNumbers = insideParts.map((part) => cleanName(part).match(E_NUMBER)).filter(Boolean);
  const rest = insideParts.filter((part) => !E_NUMBER.test(cleanName(part)) && !isNote(cleanName(part)));

  // One E-number in brackets names the thing itself: "Citric Acid (E330)".
  if (own.length === 1 && !own[0].eNumber && eNumbers.length === 1 && rest.length === 0) {
    own[0].eNumber = `E${eNumbers[0][1].toUpperCase()}`;
  } else {
    for (const match of eNumbers) own.push({ name: `e${match[1].toLowerCase()}`, allergen: null, eNumber: `E${match[1].toUpperCase()}` });
  }
  const children = rest.flatMap(ingredientsFrom);
  return [...own, ...children];
}

// ---------------------------------------------------------------------------
// Allergens
// ---------------------------------------------------------------------------

/** Words on a Pick n Pay allergen line, to our allergens.slug. */
const ALLERGEN_WORDS = [
  { slug: 'milk', pattern: /milk|dairy|lactose|whey|casein/i },
  { slug: 'egg', pattern: /\begg/i },
  { slug: 'fish', pattern: /\bfish/i },
  { slug: 'crustacean-mollusc', pattern: /crustacean|shellfish|mollus/i },
  { slug: 'peanut', pattern: /peanut|groundnut/i },
  { slug: 'soy', pattern: /\bsoy/i },
  { slug: 'tree-nut', pattern: /tree ?nut|hazelnut|almond|cashew|macadamia|pecan|walnut|pistachio/i },
  { slug: 'gluten', pattern: /gluten|wheat|barley|\brye\b|\boats?\b/i },
];

/** The same names the Open Food Facts import uses, so they share a catalogue row. */
const DECLARED_NAME = {
  milk: 'milk', egg: 'egg', fish: 'fish', 'crustacean-mollusc': 'shellfish',
  peanut: 'peanuts', soy: 'soy', 'tree-nut': 'tree nuts', gluten: 'gluten',
};

function slugsIn(text) {
  return ALLERGEN_WORDS.filter(({ pattern }) => pattern.test(text)).map(({ slug }) => slug);
}

/**
 * "Contains milk and soya. May contain traces of nuts." Everything after
 * "may contain" (or "traces", or "manufactured in a facility") is a trace;
 * everything before is contained.
 */
function allergensFrom(text) {
  // "Free from peanuts, milk, gluten" and "Shell fish free" name what is
  // not there, so those parts are dropped before reading the rest.
  const line = (text ?? '')
    .split(/[.;]/)
    .filter((part) => !/\bfree\b/i.test(part))
    .join('. ');
  const traceAt = line.search(/may contain|traces?|facility|factory/i);
  const contained = traceAt === -1 ? line : line.slice(0, traceAt);
  const traces = traceAt === -1 ? '' : line.slice(traceAt);
  return { contains: slugsIn(contained), mayContain: slugsIn(traces) };
}

/**
 * Allergens named in the ingredient list itself. Some packs list "Egg
 * Powder" but leave egg off the allergen line, and our ingredient rows for
 * names like "egg powder" or "casein" carry no allergen, so without this the
 * engine could miss it. Plant milks ("Soya Milk", "Almond Milk") are not
 * cow's milk; their soy or nut is still caught by its own word.
 */
function allergensInList(label) {
  return slugsIn(label.replace(/\b(soya?|almond|oat|rice|coconut|cashew|nut|plant[- ]based)\s+milk\b/gi, ''));
}

// ---------------------------------------------------------------------------
// Nutrition, with the same checks as the Open Food Facts import
// ---------------------------------------------------------------------------

/** "<0.1 g" reads as 0.1: the upper bound, so a limit is never under-counted. */
function amount(value) {
  const match = String(value ?? '').replace(',', '.').match(/([\d.]+)/);
  return match ? Number(match[1]) : null;
}

function nutritionFrom(rows, columns) {
  if (!Array.isArray(rows)) return null;
  const all = rows.flatMap((row) => [row, ...(row.childRows ?? [])]);
  const find = (label) => amount(all.find((row) => row.label?.toLowerCase() === label)?.per100g);
  const perMl = columns?.some((name) => /100\s?ml/i.test(name));
  const table = {
    perBasis: perMl ? '100ml' : '100g',
    energyKj: find('energy'),
    proteinG: find('protein'),
    carbsG: find('carbohydrate'),
    sugarG: find('of which total sugar'),
    fatG: find('total fat'),
    satFatG: find('of which saturated fat'),
    fibreG: find('dietary fibre'),
    sodiumMg: find('total sodium'),
  };
  if (table.energyKj === null) return null;
  const grams = [table.proteinG, table.carbsG, table.fatG, table.fibreG].map((value) => value ?? 0);
  if (grams.reduce((sum, value) => sum + value, 0) > 100) return null;
  if (table.sugarG !== null && table.carbsG !== null && table.sugarG > table.carbsG) return null;
  if (table.satFatG !== null && table.fatG !== null && table.satFatG > table.fatG) return null;
  if (table.sodiumMg !== null && table.sodiumMg > 40_000) return null;
  const [protein, carbs, fat, fibre] = grams;
  const expected = protein * 17 + carbs * 17 + fat * 37 + fibre * 8;
  if (expected > 100 && Math.abs(table.energyKj - expected) > expected * 0.2) return null;
  return table;
}

// ---------------------------------------------------------------------------
// One product
// ---------------------------------------------------------------------------

/** "Rama 70% Fat Spread Original 500g" ends in its pack size. */
function packFrom(name) {
  const match = name.match(/\s(\d+(?:[.,]\d+)?)\s?(g|kg|ml|l)$/i);
  if (!match) return { name, size: null, unit: null };
  return { name: name.slice(0, match.index).trim(), size: Number(match[1].replace(',', '.')), unit: match[2].toLowerCase() };
}

/**
 * "CROSSE&BLACKWELL" is written "Crosse & Blackwell" at the start of the
 * name. When the brand is not there ("NO NAME" on "PnP Large Eggs"), the
 * first word of the name is the brand on the pack.
 */
function brandFrom(brand, name) {
  if (!brand) return name.split(' ')[0];
  const letters = (text) => text.toLowerCase().replace(/[^a-z]/g, '');
  const target = letters(brand);
  const words = name.split(' ');
  for (let count = 1; count <= words.length; count += 1) {
    const start = words.slice(0, count).join(' ');
    if (letters(start) === target) return start;
    if (letters(start).length > target.length) break;
  }
  return words[0];
}

function fieldsOf(product) {
  const fields = {};
  let nutrition = null;
  for (const section of product.productDetailsDisplayInfoResponse?.productDetailDisplayInfos ?? []) {
    for (const field of section.displayInfoFields ?? []) {
      if (field.displayType === 'TABLE') nutrition = { rows: field.rows, columns: field.columns?.map((column) => column.name) };
      else fields[field.name] = (field.values ?? []).map((value) => value.value).join('; ');
    }
  }
  return { fields, nutrition };
}

function photoOf(product) {
  const zooms = (product.images ?? []).filter((image) => image.format === 'zoom').map((image) => image.url);
  return zooms.find((url) => /Straight_on/.test(url)) ?? zooms[0] ?? null;
}

function mapProduct(product, aisle) {
  const { fields, nutrition } = fieldsOf(product);
  const barcode = fields.Barcode?.trim();
  if (!barcode || !/^\d{8,14}$/.test(barcode)) return { skipped: 'no barcode' };
  if (!fields.Ingredients) return { skipped: 'no ingredient list' };

  const label = (LABEL_FIXES[barcode] ?? fields.Ingredients)
    // A footnote after the list: "... Marjoram. †Sustainably grown."
    .replace(/\.\s*[*†‡][^,]*$/, '')
    .replace(/\.$/, '')
    // "Citric Acid (E330)Colourant": a comma the label left out.
    .replace(/\)(?=[A-Za-z])/g, '), ');
  const listed = splitTopLevel(label).flatMap(ingredientsFrom);
  const allergenLine = [fields.Allergens, fields['Allergen Warnings']].filter(Boolean).join('. ');
  const fromLine = allergensFrom(allergenLine);
  const contains = [...new Set([...fromLine.contains, ...allergensInList(label)])];
  const mayContain = fromLine.mayContain;
  const declared = contains.map((slug) => ({ name: `${DECLARED_NAME[slug]} (declared allergen)`, allergen: slug, eNumber: null }));
  const pack = packFrom(product.name.trim());

  return {
    barcode,
    pnpCode: product.code,
    photo: photoOf(product),
    labelText: { ingredients: fields.Ingredients, allergens: allergenLine },
    args: {
      p_barcode: barcode,
      p_name: pack.name,
      p_brand: BRAND_FIXES[barcode] ?? brandFrom(product.brand, pack.name),
      p_image_url: `${PHOTO_BASE}${barcode}.jpg`,
      p_serving_size: pack.size,
      p_serving_unit: pack.unit,
      p_category_slug: aisle,
      p_may_contain: mayContain.filter((slug) => !contains.includes(slug)),
      p_ingredients: [...listed, ...declared],
      p_nutrition: WRONG_NUTRITION[barcode] ? null : nutritionFrom(nutrition?.rows, nutrition?.columns),
    },
  };
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const sqlText = (value) => (value === null || value === undefined ? 'null' : `'${String(value).replace(/'/g, "''")}'`);
const sqlJson = (value) => (value === null ? 'null' : `${sqlText(JSON.stringify(value))}::jsonb`);
const sqlArray = (values) => `array[${values.map(sqlText).join(', ')}]::text[]`;

function importCall({ args }) {
  return [
    `select public.import_product(`,
    `  ${sqlText(args.p_barcode)}, ${sqlText(args.p_name)}, ${sqlText(args.p_brand)},`,
    `  ${sqlText(args.p_image_url)},`,
    `  ${args.p_serving_size ?? 'null'}, ${sqlText(args.p_serving_unit)}, ${sqlText(args.p_category_slug)},`,
    `  ${sqlArray(args.p_may_contain)},`,
    `  ${sqlJson(args.p_ingredients)},`,
    `  ${sqlJson(args.p_nutrition)}`,
    `);`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

async function savePhoto(url, path) {
  const response = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'] } });
  if (!response.ok || !/jpeg/.test(response.headers.get('content-type') ?? '')) throw new Error(`photo ${response.status}`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

async function main() {
  const [existingPath, outDir] = process.argv.slice(2);
  if (!existingPath || !outDir) throw new Error('Usage: node scripts/import-pnp-products.mjs <existing-barcodes.txt> <out-dir>');
  const rows = (await readFile(existingPath, 'utf8')).split('\n').filter(Boolean).map((line) => line.trim().split(','));
  const existing = new Map(rows.map(([barcode, source]) => [barcode, source]));
  // An optional third column is the product's image_url: one already in our
  // bucket was swapped by an earlier run and is left alone.
  const hasOurPhoto = new Set(rows.filter(([, , imageUrl]) => imageUrl?.startsWith(PHOTO_BASE)).map(([barcode]) => barcode));
  await mkdir(join(outDir, 'photos'), { recursive: true });

  // Only photos from Open Food Facts or the seed are replaced; a person's own
  // scan photo stays.
  const replaceableSources = new Set(['open_food_facts', 'seed']);
  const replaceable = {
    has: (barcode) => replaceableSources.has(existing.get(barcode)) && !hasOurPhoto.has(barcode) && !WRONG_PHOTOS[barcode],
  };
  const photoFor = new Map();

  // 1. New products.
  const added = [];
  const skipped = [];
  for (const [aisle, codes] of Object.entries(NEW_PRODUCTS)) {
    for (const code of codes) {
      const pnpCode = `${String(code).padStart(18, '0')}_EA`;
      const product = await getJson(`/products/${pnpCode}?fields=FULL&storeCode=${STORE}&scope=details&lang=en&curr=ZAR`);
      const mapped = mapProduct(product, aisle);
      if (mapped.skipped) {
        skipped.push({ code, name: product.name, reason: mapped.skipped });
      } else if (existing.has(mapped.barcode)) {
        skipped.push({ code, name: product.name, reason: 'already in the catalogue, photo swapped' });
        if (replaceable.has(mapped.barcode) && mapped.photo) {
          photoFor.set(mapped.barcode, { url: mapped.photo, name: product.name });
        }
      } else {
        added.push(mapped);
      }
      await pause(PAUSE_MS);
    }
  }

  // 2. Pick n Pay photos for barcodes we already have.
  for (const term of PHOTO_SEARCHES) {
    const fields = 'products(code,name,images(DEFAULT))';
    const result = await getJson(`/products/search?fields=${fields}&query=${encodeURIComponent(term)}&pageSize=72&storeCode=${STORE}&lang=en&curr=ZAR`, 'POST');
    for (const product of result.products ?? []) {
      for (const image of product.images ?? []) {
        const match = image.url?.match(/-(\d{8,14})-Straight_on-/);
        if (!match || !replaceable.has(match[1])) continue;
        // The search gives the 400px "product" size; the page uses 515px "zoom".
        if (!photoFor.has(match[1]) || image.format === 'zoom') photoFor.set(match[1], { url: image.url, name: product.name });
      }
    }
    await pause(PAUSE_MS);
  }

  // 3. Photos to disk.
  const photos = [...added.map((item) => [item.barcode, item.photo]), ...[...photoFor].map(([barcode, found]) => [barcode, found.url])];
  const failedPhotos = [];
  for (const [barcode, url] of photos) {
    try {
      await savePhoto(url, join(outDir, 'photos', `${barcode}.jpg`));
    } catch (error) {
      failedPhotos.push({ barcode, error: String(error) });
    }
    await pause(200);
  }
  const noPhoto = new Set(failedPhotos.map((item) => item.barcode));

  await writeFile(
    join(outDir, 'products.json'),
    JSON.stringify({ added, skipped, photoSwaps: Object.fromEntries(photoFor), failedPhotos }, null, 2),
  );

  const swaps = [...photoFor.keys()].filter((barcode) => !noPhoto.has(barcode));
  const imported = added.filter((item) => !noPhoto.has(item.barcode));
  const sql = [
    imported.map(importCall).join('\n\n'),
    // import_product labels every row it saves open_food_facts and
    // unverified. now() is the same moment for the whole migration, so
    // created_at = now() picks out only the rows saved just above.
    `-- import_product says open_food_facts and unverified. These came from\n-- Pick n Pay, and each ingredient list was checked by hand against the\n-- label text before this migration was written.\nupdate public.products\n   set source = 'retailer',\n       verified = true\n where source = 'open_food_facts'\n   and created_at = now()\n   and barcode in (\n${imported.map((item) => `     ${sqlText(item.barcode)}`).join(',\n')}\n   );`,
    `-- Pick n Pay's pack shot for products we already had.\nupdate public.products\n   set image_url = '${PHOTO_BASE}' || barcode || '.jpg'\n where source in ('open_food_facts', 'seed')\n   and barcode in (\n${swaps.map((barcode) => `     ${sqlText(barcode)}`).join(',\n')}\n   );`,
  ].join('\n\n');
  await writeFile(join(outDir, 'migration.sql'), sql);

  console.log(`added ${added.length}, skipped ${skipped.length}, photo swaps ${swaps.length}, failed photos ${failedPhotos.length}`);
  for (const item of skipped) console.log(`  skipped ${item.name}: ${item.reason}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
