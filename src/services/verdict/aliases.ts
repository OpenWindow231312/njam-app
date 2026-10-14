/**
 * Aliases: the other names a thing you avoid goes by on a label.
 *
 * A label rarely says "caffeine". It says "black tea" or "instant coffee".
 * The catalogue's alias chain (ingredients.canonical_id) only covers the
 * ingredients someone linked by hand, and a list read from a photo has no
 * chain at all. So the engine also checks every ingredient name against
 * these word lists, the same way for the verdict and for the highlighting.
 *
 * Each group has three lists:
 *   contains - any of these means it is in there: Not safe.
 *   traces   - any of these means there may be a little: Caution.
 *   notThis  - these look like a match but are not ("rooibos tea" has no
 *              caffeine, "peanut butter" has no milk). They are removed
 *              from the name before anything else is checked.
 *
 * Matching is case-insensitive and on whole words, so "coconut" is never
 * "nut" and "maltodextrin" is never "malt". A word followed by "free", or
 * after "no", "non" or "without", does not count: "peanut-free" is not a peanut.
 *
 * No imports, like the rest of the engine, so it can be tested on its own.
 */

export type AliasGroup = {
  /** How a reason line names it: "caffeine". */
  word: string;
  /** The rule targets that use this group: an allergen slug, or an ingredient you avoid. */
  targets: string[];
  contains: string[];
  traces: string[];
  notThis: string[];
};

export const ALIAS_GROUPS: AliasGroup[] = [
  {
    word: 'caffeine',
    targets: ['caffeine'],
    contains: [
      'caffeine', 'coffee', 'espresso', 'tea', 'black tea', 'green tea', 'white tea', 'oolong',
      'matcha', 'chai', 'guarana', 'kola', 'kola nut', 'cola nut', 'yerba mate', 'mate tea', 'maté',
      'energy drink', 'theine',
    ],
    traces: [
      'cocoa', 'cacao', 'chocolate', 'decaf', 'decaffeinated', 'decaf coffee', 'decaffeinated coffee',
      'decaf tea', 'decaffeinated tea',
    ],
    // Herbal teas and cocoa butter have no caffeine. White chocolate has no cocoa solids.
    notThis: [
      'rooibos tea', 'rooibos', 'honeybush tea', 'honeybush', 'herbal tea', 'chamomile tea',
      'peppermint tea', 'mint tea', 'fruit tea', 'tea tree', 'cocoa butter', 'white chocolate',
    ],
  },
  {
    word: 'milk',
    targets: ['milk', 'dairy', 'lactose'],
    contains: [
      'milk', 'milk powder', 'skim milk', 'skimmed milk', 'milk solids', 'milk fat', 'milkfat',
      'milk protein', 'whey', 'whey powder', 'whey protein', 'casein', 'caseinate', 'lactose',
      'butter', 'butterfat', 'butter oil', 'buttermilk', 'cream', 'cheese', 'yoghurt', 'yogurt',
      'ghee', 'curds', 'lactalbumin', 'lactoglobulin', 'dairy',
    ],
    traces: [],
    // Plant milks and butters, and things that only sound like dairy.
    notThis: [
      'peanut butter', 'nut butter', 'almond butter', 'cashew butter', 'cocoa butter', 'shea butter',
      'butter beans', 'butternut', 'coconut milk', 'coconut cream', 'almond milk', 'oat milk',
      'soy milk', 'soya milk', 'rice milk', 'cream of tartar', 'milk thistle',
    ],
  },
  {
    word: 'peanuts',
    targets: ['peanut', 'peanuts'],
    contains: [
      'peanut', 'peanut oil', 'peanut butter', 'peanut powder', 'peanut flour', 'groundnut',
      'groundnut oil', 'ground nut', 'arachis', 'arachis oil', 'monkey nut',
    ],
    traces: [],
    notThis: [],
  },
  {
    word: 'tree nuts',
    targets: ['tree-nut', 'tree nut', 'tree nuts', 'nuts'],
    contains: [
      'nut', 'mixed nuts', 'almond', 'cashew', 'hazelnut', 'walnut', 'pecan', 'pistachio',
      'macadamia', 'brazil nut', 'pine nut', 'nut oil', 'marzipan', 'praline', 'frangipane',
    ],
    traces: ['nougat'],
    // Coconut and nutmeg are not tree nuts here, and a groundnut is a peanut.
    notThis: ['coconut', 'nutmeg', 'butternut', 'doughnut', 'ground nut', 'groundnut', 'monkey nut'],
  },
  {
    word: 'soy',
    targets: ['soy', 'soya'],
    contains: [
      'soy', 'soya', 'soybean', 'soya bean', 'soy bean', 'soy lecithin', 'soya lecithin', 'soy protein',
      'soy sauce', 'edamame', 'tofu', 'miso', 'tempeh',
    ],
    // Lecithin is often soy, unless the label says where it came from.
    traces: ['lecithin'],
    notThis: ['sunflower lecithin', 'rapeseed lecithin', 'egg lecithin'],
  },
  {
    word: 'gluten',
    targets: ['gluten', 'wheat'],
    contains: [
      'gluten', 'wheat', 'wheat flour', 'whole wheat', 'wheat starch', 'barley', 'barley malt',
      'rye', 'malt', 'malt extract', 'malt vinegar', 'semolina', 'spelt', 'durum', 'couscous',
      'bulgur', 'triticale', 'cake flour', 'bread flour', 'self raising flour', 'brown bread flour',
    ],
    // Oats are often grown and milled next to wheat. Plain "flour" is usually wheat.
    traces: ['oats', 'oat', 'flour'],
    notThis: [
      'buckwheat', 'rice flour', 'maize flour', 'corn flour', 'cornflour', 'almond flour',
      'coconut flour', 'chickpea flour', 'potato flour', 'tapioca flour', 'soy flour', 'soya flour',
    ],
  },
  {
    word: 'egg',
    targets: ['egg', 'eggs'],
    contains: ['egg', 'egg yolk', 'egg white', 'whole egg', 'egg powder', 'albumen', 'mayonnaise', 'meringue'],
    traces: [],
    notThis: ['eggplant'],
  },
];

export type AliasMatch = 'contains' | 'traces' | null;

/**
 * Lower case, and every run of punctuation as one space, so "Peanut-free"
 * reads "peanut free" and "Emulsifier (Soy Lecithin)" reads
 * "emulsifier soy lecithin". Accented letters are kept (maté).
 */
export function normalise(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim()} `;
}

/** Words that, just before a term, mean the label is saying it is absent. */
const ABSENT_BEFORE = /(?:^| )(?:no|non|without|free from|no added)\s*$/;
/** "free" just after a term: "peanut free". */
const ABSENT_AFTER = /^\s*free(?: |$)/;

/**
 * Does the text name this term as a whole word (or its plural)?
 * "black tea" names "tea"; "steak" does not. "peanut free" does not name "peanut".
 */
export function mentions(text: string, term: string): boolean {
  const haystack = normalise(text);
  const needle = normalise(term).trim();
  if (needle.length === 0) return false;
  // A space on each side is the word boundary: normalise padded the text with one.
  const pattern = new RegExp(` ${needle}(?:s|es)?(?= )`, 'g');
  for (const found of haystack.matchAll(pattern)) {
    const before = haystack.slice(0, found.index);
    const after = haystack.slice(found.index + found[0].length);
    if (!ABSENT_BEFORE.test(before) && !ABSENT_AFTER.test(after)) return true;
  }
  return false;
}

/** Removes each phrase (as whole words), longest first, so "rooibos tea" goes before "rooibos". */
function without(text: string, phrases: string[]): string {
  let rest = normalise(text);
  const longestFirst = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of longestFirst) {
    const needle = normalise(phrase).trim();
    rest = rest.replace(new RegExp(` ${needle}(?:s|es)?(?= )`, 'g'), ' ');
  }
  return rest;
}

/** The group for a rule target, e.g. "caffeine" or the allergen slug "tree-nut". null if there is none. */
export function aliasGroupFor(target: string): AliasGroup | null {
  const wanted = target.trim().toLowerCase();
  return ALIAS_GROUPS.find((group) => group.targets.includes(wanted)) ?? null;
}

/** How one name matches a group: contains, traces, or not at all. */
function matchName(name: string, group: AliasGroup): AliasMatch {
  const rest = without(name, group.notThis);
  // Take the trace phrases out first, so "decaf coffee" is a trace, not coffee.
  const restWithoutTraces = without(rest, group.traces);
  if (group.contains.some((term) => mentions(restWithoutTraces, term))) return 'contains';
  if (group.traces.some((term) => mentions(rest, term))) return 'traces';
  return null;
}

/**
 * How an ingredient matches a group. Checks the name as printed and the
 * canonical name it is an alias of; the stronger match counts.
 */
export function matchIngredient(item: { name: string; canonicalName: string | null }, group: AliasGroup): AliasMatch {
  const matches = [matchName(item.name, group), item.canonicalName ? matchName(item.canonicalName, group) : null];
  if (matches.includes('contains')) return 'contains';
  if (matches.includes('traces')) return 'traces';
  return null;
}
