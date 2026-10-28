/**
 * Tests for how the engine treats Open Food Facts records. Run with `npm test`.
 *
 * A complete record is decided like a verified one. A thin one (fewer than
 * three real ingredients) stays capped at Caution, because a list cut short
 * can hide the very allergen a rule is looking for.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decideVerdict, isCompleteList, type ProfileRule, type VerdictIngredient, type VerdictProduct } from './index.ts';

function ingredient(name: string, allergen: string | null = null): VerdictIngredient {
  return { name, canonicalName: null, allergen, eNumber: null };
}

function fromOpenFoodFacts(ingredients: VerdictIngredient[]): VerdictProduct {
  return { verified: false, readFromLabel: false, fromOpenFoodFacts: true, ingredients, mayContain: [] };
}

const peanutAllergy: ProfileRule = {
  type: 'allergen',
  target: 'peanut',
  operator: 'excludes',
  threshold: null,
  unit: null,
  severity: 'severe',
};

describe('isCompleteList', () => {
  test('three different ingredients is complete', () => {
    assert.equal(isCompleteList([ingredient('flour'), ingredient('sugar'), ingredient('butter')]), true);
  });

  test('one ingredient is not', () => {
    assert.equal(isCompleteList([ingredient('wheat flour')]), false);
  });

  test('declared allergen lines do not count towards a whole label', () => {
    const list = [ingredient('flour'), ingredient('sugar'), ingredient('milk (declared allergen)', 'milk')];
    assert.equal(isCompleteList(list), false);
  });

  test('the same ingredient twice counts once', () => {
    assert.equal(isCompleteList([ingredient('sugar'), ingredient('sugar'), ingredient('flour')]), false);
  });
});

describe('Open Food Facts records', () => {
  test('a complete record with nothing you avoid is Safe', () => {
    const product = fromOpenFoodFacts([ingredient('maize'), ingredient('sunflower oil'), ingredient('salt')]);
    assert.equal(decideVerdict(product, [peanutAllergy]).state, 'safe');
  });

  test('a complete record with your allergen is Not safe', () => {
    const product = fromOpenFoodFacts([ingredient('peanuts', 'peanut'), ingredient('sugar'), ingredient('salt')]);
    assert.equal(decideVerdict(product, [peanutAllergy]).state, 'unsafe');
  });

  test('a thin record is Caution and says why', () => {
    const verdict = decideVerdict(fromOpenFoodFacts([ingredient('wheat flour')]), [peanutAllergy]);
    assert.equal(verdict.state, 'caution');
    assert.ok(verdict.reasons.some((reason) => reason.text.includes('looks incomplete')));
  });

  test('a thin record with your allergen is still Not safe', () => {
    const verdict = decideVerdict(fromOpenFoodFacts([ingredient('peanuts', 'peanut')]), [peanutAllergy]);
    assert.equal(verdict.state, 'unsafe');
  });

  // A shopper's list is trusted for now (TRUST_SHOPPER_LISTS), so it is not capped.
  test('an unverified record not from Open Food Facts is Safe', () => {
    const product: VerdictProduct = {
      verified: false,
      readFromLabel: false,
      ingredients: [ingredient('maize'), ingredient('sunflower oil'), ingredient('salt')],
      mayContain: [],
    };
    assert.equal(decideVerdict(product, [peanutAllergy]).state, 'safe');
  });

  test('a photo read is trusted like any shopper list, even when it says Open Food Facts', () => {
    const product: VerdictProduct = {
      ...fromOpenFoodFacts([ingredient('maize'), ingredient('sunflower oil'), ingredient('salt')]),
      readFromLabel: true,
    };
    assert.equal(decideVerdict(product, [peanutAllergy]).state, 'safe');
  });
});
