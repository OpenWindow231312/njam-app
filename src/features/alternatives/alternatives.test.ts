/**
 * Tests for picking alternatives. Run with `npm test`.
 *
 * The catalogue below is the seeded one (supabase/migrations, as live on
 * 14 Oct 2026): names, aisles and ingredient lists with their allergen tags.
 * Verdicts come from the real engine, with Jan Hendrik's rules from his user
 * test: a peanut allergy and no caffeine.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decideVerdict, type ProfileRule } from '../../services/verdict/index.ts';
import { pickAlternatives, productKind, type Candidate } from './alternatives.ts';

/** [name, aisle, ingredients as "name" or "name:allergen"]. All verified. */
const SEED: [string, string, string[]][] = [
  ['Superior White Bread', 'bakery', ['wheat flour:gluten', 'water', 'yeast', 'salt', 'soya flour:soy', 'vegetable oil', 'sugar']],
  ['Buttermilk Rusks', 'biscuits-rusks', ['wheat flour:gluten', 'sugar', 'vegetable fat', 'buttermilk powder:milk', 'raising agent', 'salt']],
  ['Marie Biscuits', 'biscuits-rusks', ['wheat flour:gluten', 'sugar', 'vegetable fat', 'invert syrup', 'raising agent', 'salt', 'soya lecithin:soy', 'flavouring']],
  ['Tennis Biscuits', 'biscuits-rusks', ['wheat flour:gluten', 'sugar', 'vegetable fat', 'coconut', 'golden syrup', 'salt', 'raising agent', 'flavouring']],
  ['Jungle Oats', 'cereals', ['wholegrain oats:gluten']],
  ['Weet-Bix', 'cereals', ['whole wheat:gluten', 'sugar', 'salt', 'barley malt extract:gluten']],
  ['Fresh Full Cream Milk', 'dairy-eggs', ['pasteurised milk:milk']],
  ['Large Eggs, 6 pack', 'dairy-eggs', ['whole eggs:egg']],
  ['Mature Cheddar', 'dairy-eggs', ['pasteurised milk:milk', 'salt', 'annatto']],
  ['Ultra Mel Custard', 'dairy-eggs', ['full cream milk:milk', 'sugar', 'modified maize starch', 'cream:milk', 'flavouring']],
  ['100% Apple Juice', 'drinks', ['apple juice from concentrate']],
  ['Coca-Cola Original', 'drinks', ['carbonated water', 'sugar', 'sulphite ammonia caramel', 'phosphoric acid', 'flavouring', 'caffeine']],
  ['Milo', 'drinks', ['barley malt extract:gluten', 'milk solids:milk', 'sugar', 'cocoa']],
  ['Long Grain Parboiled Rice', 'pantry', ['parboiled rice']],
  ['Super Maize Meal', 'pantry', ['maize meal']],
  ['White Sugar', 'pantry', ['sugar']],
  ['Original Recipe Chutney', 'sauces-spreads', ['sugar', 'peach', 'apricot', 'vinegar', 'maize starch', 'salt', 'onion', 'garlic']],
  ['Original Spread', 'sauces-spreads', ['vegetable oil', 'water', 'salt', 'buttermilk powder:milk', 'potassium sorbate']],
  ['Smooth Peanut Butter', 'sauces-spreads', ['peanuts:peanut', 'sugar', 'vegetable oil', 'salt']],
  ['Tomato Sauce', 'sauces-spreads', ['tomato paste', 'sugar', 'vinegar', 'salt', 'modified maize starch', 'onion', 'spices']],
  ['Baked Beans in Tomato Sauce', 'tins-jars', ['haricot beans', 'water', 'tomato paste', 'sugar', 'salt', 'modified maize starch', 'spices']],
  ['Pilchards in Tomato Sauce', 'tins-jars', ['pilchards:fish', 'tomato paste', 'water', 'salt', 'modified maize starch']],
];

const JAN_HENDRIK: ProfileRule[] = [
  { type: 'allergen', target: 'peanut', operator: 'excludes', threshold: null, unit: null, severity: 'moderate' },
  { type: 'ingredient', target: 'caffeine', operator: 'excludes', threshold: null, unit: null, severity: null },
];

const MILK_ALLERGY: ProfileRule[] = [
  { type: 'allergen', target: 'milk', operator: 'excludes', threshold: null, unit: null, severity: 'severe' },
];

/** The catalogue as useCatalogue gives it: each product with its verdict for these rules. */
function catalogue(rules: ProfileRule[], extra: [string, string, string[]][] = []): Candidate[] {
  return [...SEED, ...extra].map(([name, aisle, ingredients]) => ({
    product: { id: name, name, categoryId: aisle },
    verdict: decideVerdict(
      {
        verified: true,
        readFromLabel: false,
        ingredients: ingredients.map((entry) => {
          const [ingredientName, allergen] = entry.split(':');
          return { name: ingredientName, canonicalName: null, allergen: allergen ?? null, eNumber: null };
        }),
        mayContain: [],
      },
      rules,
    ).state,
  }));
}

function namesOf(candidates: Candidate[]): string[] {
  return candidates.map(({ product }) => product.name);
}

function original(name: string, categoryId: string | null) {
  return { id: name, name, categoryId };
}

describe('productKind', () => {
  test('the specific kind wins over the general one', () => {
    assert.equal(productKind('Smooth Peanut Butter'), 'nut butters');
    assert.equal(productKind('Original Spread'), 'spreads');
    assert.equal(productKind('Baked Beans in Tomato Sauce'), 'baked beans');
    assert.equal(productKind('Tomato Sauce'), 'sauces');
    assert.equal(productKind('Buttermilk Rusks'), 'rusks');
    assert.equal(productKind('Cheese Nik Naks'), 'chips');
    assert.equal(productKind('Cappuccino condensed milk flavoured instant powdered cappuccino'), 'coffees');
  });

  test('names from Jan Hendrik’s scans', () => {
    assert.equal(productKind('Thé à la vanille 25 sachets'), 'teas');
    assert.equal(productKind('Blueberry flavoured powdered sports drink makes 9 litres'), 'sports drinks');
    assert.equal(productKind('Coca-Cola Original'), 'soft drinks');
  });

  test('null when we cannot tell', () => {
    assert.equal(productKind('Double action liquid suspension peppermint flavour 150 ml'), null);
  });
});

describe('pickAlternatives', () => {
  test('peanut butter no longer suggests tomato sauce, chutney or margarine', () => {
    const checked = catalogue(JAN_HENDRIK);
    // What the aisle used to show: everything Safe in Sauces and spreads.
    const oldAisle = checked.filter(({ product, verdict }) => product.categoryId === 'sauces-spreads' && verdict === 'safe');
    assert.ok(namesOf(oldAisle).includes('Tomato Sauce'));

    // The seeded catalogue has no other nut butter, so the honest answer is none.
    assert.deepEqual(pickAlternatives(original('Smooth Peanut Butter', 'sauces-spreads'), checked), []);
  });

  test('a peanut-free nut butter is suggested once the catalogue has one', () => {
    const checked = catalogue(JAN_HENDRIK, [['Almond Butter', 'sauces-spreads', ['almonds', 'salt']]]);
    assert.deepEqual(namesOf(pickAlternatives(original('Smooth Peanut Butter', 'sauces-spreads'), checked)), ['Almond Butter']);
  });

  test('a black tea suggests a rooibos, not a juice', () => {
    const checked = catalogue(JAN_HENDRIK, [['Rooibos Tea, 80 bags', 'drinks', ['rooibos tea']]]);
    const picked = pickAlternatives(original('Thé à la vanille 25 sachets', null), checked);
    assert.deepEqual(namesOf(picked), ['Rooibos Tea, 80 bags']);
  });

  test('cola has no Safe alternative, and apple juice is not padded in', () => {
    const picked = pickAlternatives(original('Coca-Cola Original', 'drinks'), catalogue(JAN_HENDRIK));
    assert.deepEqual(picked, []);
  });

  test('only Safe products, never Caution: Milo has cocoa, so it is not suggested for no caffeine', () => {
    const checked = catalogue(JAN_HENDRIK, [['Hot Chocolate', 'drinks', ['sugar', 'cocoa', 'milk powder:milk']]]);
    assert.deepEqual(pickAlternatives(original('Milo', 'drinks'), checked), []);
  });

  test('rusks with milk suggest no biscuits, because a biscuit is not a rusk', () => {
    const picked = pickAlternatives(original('Buttermilk Rusks', 'biscuits-rusks'), catalogue(MILK_ALLERGY));
    assert.deepEqual(picked, []);
  });

  test('custard with milk has no milk-free custard, so nothing from Dairy and eggs is padded in', () => {
    const picked = pickAlternatives(original('Ultra Mel Custard', 'dairy-eggs'), catalogue(MILK_ALLERGY));
    assert.deepEqual(picked, []);
  });

  test('a product of a kind we cannot tell falls back to its aisle, Safe only', () => {
    const picked = pickAlternatives(original('Mystery pantry thing', 'pantry'), catalogue(JAN_HENDRIK));
    assert.deepEqual(namesOf(picked), ['Long Grain Parboiled Rice', 'Super Maize Meal', 'White Sugar']);
  });

  test('a product of a kind we cannot tell, with no aisle, gets none', () => {
    const picked = pickAlternatives(original('Double action liquid suspension', null), catalogue(JAN_HENDRIK));
    assert.deepEqual(picked, []);
  });
});
