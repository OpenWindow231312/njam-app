/**
 * Which products to suggest instead of one that is not Safe.
 *
 * "See alternatives" used to open the whole aisle, Safe only. The aisles are
 * broad ("Sauces and spreads"), so in Jan Hendrik's user test peanut butter
 * suggested tomato sauce. Now an alternative has to be:
 *   1. Safe for the profile, as the verdict engine decided it,
 *   2. not the product itself, and
 *   3. the same kind of product: another nut butter for a peanut butter,
 *      another tea for a tea. The kind comes from words in the name (KINDS).
 *      A product whose kind we cannot tell falls back to its aisle.
 * If nothing qualifies, the list is empty and the screen says so. It never
 * pads the list with something unrelated.
 *
 * No value imports, so Node's test runner can load it on its own (npm test).
 */
import type { VerdictState } from '@/services/verdict';

/**
 * The kinds of product we can tell apart by name, and the words that name
 * them. First match wins, so the specific comes before the general:
 * "Baked Beans in Tomato Sauce" is baked beans, not a sauce, and
 * "Peanut Butter" is a nut butter, not a spread.
 */
const KINDS: { kind: string; words: string[] }[] = [
  { kind: 'baked beans', words: ['baked beans'] },
  { kind: 'tinned fish', words: ['pilchards', 'sardines', 'tuna', 'mackerel'] },
  { kind: 'nut butters', words: ['peanut butter', 'nut butter', 'almond butter', 'cashew butter', 'seed butter'] },
  { kind: 'chips', words: ['chips', 'crisps', 'nik naks', 'puffs'] },
  { kind: 'rusks', words: ['rusk'] },
  { kind: 'biscuits', words: ['biscuit', 'cookie', 'crackers'] },
  { kind: 'stock', words: ['stock', 'bouillon'] },
  { kind: 'sports drinks', words: ['sports drink', 'energy drink', 'isotonic'] },
  { kind: 'coffees', words: ['coffee', 'cappuccino', 'espresso', 'latte', 'mocha', 'chicory'] },
  { kind: 'teas', words: ['tea', 'rooibos', 'honeybush', 'thé'] },
  { kind: 'chocolate drinks', words: ['milo', 'hot chocolate', 'drinking chocolate'] },
  { kind: 'soft drinks', words: ['cola', 'soda', 'soft drink', 'lemonade', 'ginger beer'] },
  { kind: 'juices', words: ['juice'] },
  { kind: 'custards', words: ['custard'] },
  { kind: 'cheeses', words: ['cheese', 'cheddar', 'gouda'] },
  { kind: 'milks', words: ['milk'] },
  { kind: 'eggs', words: ['egg'] },
  { kind: 'breads', words: ['bread'] },
  { kind: 'breakfast cereals', words: ['oats', 'weet bix', 'cereal', 'muesli', 'granola', 'cornflakes'] },
  { kind: 'maize meals', words: ['maize meal', 'mealie meal'] },
  { kind: 'rice', words: ['rice'] },
  { kind: 'sugars', words: ['sugar'] },
  { kind: 'chutneys', words: ['chutney', 'relish', 'atchar'] },
  { kind: 'sauces', words: ['tomato sauce', 'ketchup', 'sauce'] },
  { kind: 'jams', words: ['jam', 'marmalade', 'honey'] },
  { kind: 'spreads', words: ['spread', 'margarine', 'butter'] },
];

/** The name as words: lower case, punctuation as spaces, padded with one space each side. */
function words(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9À-ɏ]+/g, ' ').trim()} `;
}

/**
 * The kind of product a name describes, e.g. "nut butters" for "Smooth
 * Peanut Butter". Whole words only, plurals allowed. null if we cannot tell.
 */
export function productKind(name: string): string | null {
  const text = words(name);
  for (const { kind, words: names } of KINDS) {
    if (names.some((word) => new RegExp(` ${words(word).trim()}(?:s|es)?(?= )`).test(text))) return kind;
  }
  return null;
}

/** What we need to know about the product the alternatives replace. */
export type Original = { id: string; name: string; categoryId: string | null };

/** A catalogue product with its verdict for the profile, as useCatalogue gives it. */
export type Candidate = {
  product: { id: string; name: string; categoryId: string | null };
  verdict: VerdictState;
};

/**
 * The Safe products of the same kind as the original, in catalogue order.
 * Empty when none qualify.
 */
export function pickAlternatives<T extends Candidate>(original: Original, candidates: T[]): T[] {
  const kind = productKind(original.name);
  return candidates.filter(({ product, verdict }) => {
    if (verdict !== 'safe' || product.id === original.id) return false;
    // A kind we know: only the same kind. Otherwise the same aisle, if it has one.
    if (kind) return productKind(product.name) === kind;
    return original.categoryId !== null && product.categoryId === original.categoryId;
  });
}
