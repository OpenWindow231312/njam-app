/**
 * Tests for the rules that cap or break a verdict. Run with `npm test`.
 *
 * Onboarding tells someone who picks Severe that even a trace is dangerous,
 * so for them a "may contain" line is Not safe. For Avoid and Moderate it
 * stays Caution, because the product may well be fine.
 *
 * A label the reader was not sure of (medium or low confidence) can never be
 * Safe, because the word it misread could be the allergen.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { decideVerdict, type ProfileRule, type VerdictIngredient, type VerdictProduct } from './index.ts';

function ingredient(name: string): VerdictIngredient {
  return { name, canonicalName: null, allergen: null, eNumber: null };
}

/** A verified product, so nothing but the rule itself decides the verdict. */
function product(overrides: Partial<VerdictProduct> = {}): VerdictProduct {
  return {
    verified: true,
    readFromLabel: false,
    ingredients: [ingredient('wheat flour'), ingredient('sugar'), ingredient('cocoa powder')],
    mayContain: [],
    ...overrides,
  };
}

function peanutAllergy(severity: ProfileRule['severity']): ProfileRule {
  return { type: 'allergen', target: 'peanut', operator: 'excludes', threshold: null, unit: null, severity };
}

describe('a "may contain" line', () => {
  const traces = product({ mayContain: ['peanut'] });

  test('is Not safe for a severe allergy', () => {
    const verdict = decideVerdict(traces, [peanutAllergy('severe')]);
    assert.equal(verdict.state, 'unsafe');
    assert.equal(verdict.checks[0].outcome, 'broken');
    assert.equal(
      verdict.reasons[0].text,
      'The label says it may contain peanuts. You marked peanuts as severe, so even a trace is too much.',
    );
  });

  test('is Caution for a moderate allergy', () => {
    const verdict = decideVerdict(traces, [peanutAllergy('moderate')]);
    assert.equal(verdict.state, 'caution');
    assert.equal(verdict.checks[0].outcome, 'unchecked');
  });

  test('is Caution for an allergen you avoid', () => {
    assert.equal(decideVerdict(traces, [peanutAllergy(null)]).state, 'caution');
  });

  test('for another allergen does not touch a severe peanut allergy', () => {
    const verdict = decideVerdict(product({ mayContain: ['soy'] }), [peanutAllergy('severe')]);
    assert.equal(verdict.state, 'safe');
  });
});

describe('how sure the label reader was', () => {
  const hardToRead = 'The label photo was hard to read, so we may have missed or misread an ingredient.';
  const avoidCaffeine: ProfileRule = { type: 'ingredient', target: 'caffeine', operator: 'excludes', threshold: null, unit: null, severity: null };
  const labelRead = (readConfidence: VerdictProduct['readConfidence'], names = ['rooibos tea']) =>
    product({ verified: false, readFromLabel: true, readConfidence, ingredients: names.map(ingredient) });

  test('a high confidence read can be Safe', () => {
    assert.equal(decideVerdict(labelRead('high'), [avoidCaffeine]).state, 'safe');
  });

  for (const confidence of ['medium', 'low'] as const) {
    test(`a ${confidence} confidence read is capped at Caution and says why`, () => {
      const verdict = decideVerdict(labelRead(confidence), [avoidCaffeine]);
      assert.equal(verdict.state, 'caution');
      assert.ok(verdict.reasons.some((reason) => reason.text === hardToRead));
    });
  }

  test('a low confidence read that breaks a rule is still Not safe', () => {
    assert.equal(decideVerdict(labelRead('low', ['black tea']), [avoidCaffeine]).state, 'unsafe');
  });
});

describe('nutrient limits', () => {
  function limit(target: string, operator: 'lte' | 'gte', threshold: number, unit: string | null): ProfileRule {
    return { type: 'nutrient', target, operator, threshold, unit, severity: null };
  }
  const sugarUpTo10g = limit('sugar', 'lte', 10, 'g');
  const withFacts = (values: NonNullable<VerdictProduct['nutrition']>['values']) =>
    product({ nutrition: { basis: '100g', values } });

  test('a product under the limit is Safe', () => {
    const verdict = decideVerdict(withFacts({ sugar_g: 4.2 }), [sugarUpTo10g]);
    assert.equal(verdict.state, 'safe');
    assert.equal(verdict.checks[0].outcome, 'met');
    assert.equal(verdict.checks[0].detail, '4.2 g sugar per 100 g');
  });

  test('exactly on the limit is still within it', () => {
    assert.equal(decideVerdict(withFacts({ sugar_g: 10 }), [sugarUpTo10g]).state, 'safe');
  });

  test('a product over the limit is Not safe, with the number and the limit', () => {
    const verdict = decideVerdict(withFacts({ sugar_g: 12.4 }), [sugarUpTo10g]);
    assert.equal(verdict.state, 'unsafe');
    assert.equal(verdict.reasons[0].text, '12.4 g sugar per 100 g, over your 10 g limit.');
  });

  test('a minimum the product falls short of is Not safe', () => {
    const verdict = decideVerdict(withFacts({ fibre_g: 3 }), [limit('fibre', 'gte', 6, 'g')]);
    assert.equal(verdict.state, 'unsafe');
    assert.equal(verdict.reasons[0].text, '3 g fibre per 100 g, under your 6 g minimum.');
  });

  test('a limit in g is checked against sodium in mg', () => {
    assert.equal(decideVerdict(withFacts({ sodium_mg: 400 }), [limit('sodium', 'lte', 0.4, 'g')]).state, 'safe');
    assert.equal(decideVerdict(withFacts({ sodium_mg: 410 }), [limit('sodium', 'lte', 0.4, 'g')]).state, 'unsafe');
  });

  test('a product with no nutrition facts stays Caution', () => {
    const verdict = decideVerdict(product(), [sugarUpTo10g]);
    assert.equal(verdict.state, 'caution');
    assert.equal(verdict.checks[0].outcome, 'unchecked');
  });

  test('a table that leaves the nutrient out stays Caution', () => {
    const verdict = decideVerdict(withFacts({ fat_g: 2 }), [sugarUpTo10g]);
    assert.equal(verdict.state, 'caution');
    assert.match(verdict.reasons[0].text, /does not list sugar/);
  });

  test('a nutrient the engine does not know stays Caution', () => {
    assert.equal(decideVerdict(withFacts({ sugar_g: 1 }), [limit('caffeine', 'lte', 50, 'mg')]).state, 'caution');
  });

  test('a label given per serving only stays Caution, because limits are per 100 g', () => {
    const perServing = product({ nutrition: { basis: 'serving', values: { sugar_g: 2 } } });
    const verdict = decideVerdict(perServing, [sugarUpTo10g]);
    assert.equal(verdict.state, 'caution');
    assert.match(verdict.reasons[0].text, /per serving only/);
  });

  test('a unit that cannot be compared stays Caution', () => {
    assert.equal(decideVerdict(withFacts({ energy_kj: 900 }), [limit('energy', 'lte', 200, 'kcal')]).state, 'caution');
  });
});

describe('a diet rule', () => {
  const halaal: ProfileRule = { type: 'diet', target: 'halaal', operator: 'requires', threshold: null, unit: null, severity: null };
  const noGelatine: ProfileRule = { type: 'ingredient', target: 'gelatine', operator: 'excludes', threshold: null, unit: null, severity: null };

  test('is only a name, so on its own it changes nothing', () => {
    const verdict = decideVerdict(product(), [halaal, noGelatine]);
    assert.equal(verdict.state, 'safe');
    assert.equal(verdict.checks.length, 1);
  });

  test('still lets the rules saved with it break a product', () => {
    const verdict = decideVerdict(product({ ingredients: [ingredient('sugar'), ingredient('gelatine')] }), [halaal, noGelatine]);
    assert.equal(verdict.state, 'unsafe');
  });

  test('alone, it does not count as having rules', () => {
    assert.equal(decideVerdict(product(), [halaal]).state, 'caution');
  });
});
