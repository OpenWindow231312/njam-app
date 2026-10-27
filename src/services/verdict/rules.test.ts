/**
 * Tests for "may contain" lines and severity. Run with `npm test`.
 *
 * Onboarding tells someone who picks Severe that even a trace is dangerous,
 * so for them a "may contain" line is Not safe. For Avoid and Moderate it
 * stays Caution, because the product may well be fine.
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
