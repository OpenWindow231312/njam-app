/**
 * Tests for reading Open Food Facts' nutrition table. Run with npm test.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { readNutriments } from './off-nutrition.ts';

// Close to a real 100 g of digestive biscuits.
const biscuits = {
  'energy-kj_100g': 2050,
  proteins_100g: 7,
  carbohydrates_100g: 63,
  sugars_100g: 17,
  fat_100g: 21,
  'saturated-fat_100g': 10,
  fiber_100g: 3.5,
  sodium_100g: 0.48,
};

describe('readNutriments', () => {
  test('keeps a believable table, with sodium in mg', () => {
    const facts = readNutriments(biscuits, '400 g');
    assert.equal(facts?.perBasis, '100g');
    assert.equal(facts?.carbsG, 63);
    assert.equal(facts?.sodiumMg, 480);
  });

  test('a drink is per 100 ml', () => {
    assert.equal(readNutriments({ sugars_100g: 10.6, carbohydrates_100g: 10.6 }, '330 ml')?.perBasis, '100ml');
    assert.equal(readNutriments({ sugars_100g: 10.6, carbohydrates_100g: 10.6 }, '2 L')?.perBasis, '100ml');
  });

  test('turns kcal into kJ when there is no kJ', () => {
    const facts = readNutriments({ 'energy-kcal_100g': 100 }, null);
    assert.equal(facts?.energyKj, 418.4);
  });

  test('no table at all is null', () => {
    assert.equal(readNutriments({}, null), null);
    assert.equal(readNutriments(undefined, null), null);
  });

  test('more sugar than carbs is left out', () => {
    assert.equal(readNutriments({ ...biscuits, sugars_100g: 70 }, null), null);
  });

  test('more saturated fat than fat is left out', () => {
    assert.equal(readNutriments({ ...biscuits, 'saturated-fat_100g': 25 }, null), null);
  });

  test('sodium of 180 g per 100 g is left out', () => {
    assert.equal(readNutriments({ ...biscuits, sodium_100g: 180 }, null), null);
  });

  test('energy that contradicts its own macros is left out', () => {
    assert.equal(readNutriments({ ...biscuits, 'energy-kj_100g': 438 }, null), null);
  });
});
