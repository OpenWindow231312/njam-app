/**
 * Tests for the alias matcher and how the engine uses it. Run with `npm test`.
 *
 * The cases come from Jan Hendrik's user test (14 Oct 2026): he avoids
 * caffeine and is allergic to peanuts. A tea listing "black tea" and a
 * cappuccino listing "instant coffee" came back Caution with nothing
 * highlighted, because nothing said black tea has caffeine.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { aliasGroupFor, matchIngredient, mentions } from './aliases.ts';
import { decideVerdict, type ProfileRule, type VerdictIngredient, type VerdictProduct } from './index.ts';

/** How an ingredient name, as printed, matches the group for a rule target. */
function match(name: string, target: string) {
  const group = aliasGroupFor(target);
  assert.ok(group, `no alias group for ${target}`);
  return matchIngredient({ name, canonicalName: null }, group);
}

function ingredient(name: string, allergen: string | null = null): VerdictIngredient {
  return { name, canonicalName: null, allergen, eNumber: null };
}

function product(names: string[], verified = true): VerdictProduct {
  return { verified, readFromLabel: !verified, ingredients: names.map((name) => ingredient(name)), mayContain: [] };
}

const avoidCaffeine: ProfileRule = {
  type: 'ingredient',
  target: 'caffeine',
  operator: 'excludes',
  threshold: null,
  unit: null,
  severity: null,
};

function allergy(target: string): ProfileRule {
  return { type: 'allergen', target, operator: 'excludes', threshold: null, unit: null, severity: 'severe' };
}

describe('mentions', () => {
  test('matches whole words, any case, and plurals', () => {
    assert.equal(mentions('Black Tea', 'tea'), true);
    assert.equal(mentions('roasted peanuts', 'peanut'), true);
    assert.equal(mentions('Emulsifier (Soy Lecithin)', 'soy lecithin'), true);
  });

  test('does not match inside another word', () => {
    assert.equal(mentions('steak', 'tea'), false);
    assert.equal(mentions('coconut', 'nut'), false);
    assert.equal(mentions('maltodextrin', 'malt'), false);
    assert.equal(mentions('buckwheat', 'wheat'), false);
  });

  test('does not count a word the label says is absent', () => {
    assert.equal(mentions('peanut-free', 'peanut'), false);
    assert.equal(mentions('free from peanuts', 'peanut'), false);
    assert.equal(mentions('non-dairy creamer', 'dairy'), false);
    assert.equal(mentions('caffeine free', 'caffeine'), false);
  });

  test('still counts it when a free-from claim is about something else', () => {
    assert.equal(mentions('free from colourants, milk', 'milk'), true);
  });
});

describe('caffeine', () => {
  test('tea and coffee have caffeine', () => {
    for (const name of ['black tea', 'Green tea extract', 'instant coffee', 'Espresso', 'guarana', 'kola nut', 'yerba mate']) {
      assert.equal(match(name, 'caffeine'), 'contains', name);
    }
  });

  test('rooibos and other herbal teas do not', () => {
    for (const name of ['rooibos tea', 'Rooibos', 'honeybush tea', 'chamomile tea', 'peppermint tea']) {
      assert.equal(match(name, 'caffeine'), null, name);
    }
  });

  test('a blend with real tea in it still does', () => {
    assert.equal(match('rooibos and black tea blend', 'caffeine'), 'contains');
  });

  test('cocoa, chocolate and decaf have a little', () => {
    for (const name of ['cocoa powder', 'milk chocolate', 'decaffeinated coffee', 'decaf tea']) {
      assert.equal(match(name, 'caffeine'), 'traces', name);
    }
  });

  test('cocoa butter and white chocolate have none', () => {
    assert.equal(match('cocoa butter', 'caffeine'), null);
    assert.equal(match('white chocolate', 'caffeine'), null);
  });
});

describe('milk', () => {
  test('dairy under its other names', () => {
    for (const name of ['milk powder', 'skim milk', 'whey', 'sodium caseinate', 'lactose', 'butter', 'cream', 'buttermilk', 'milk solids']) {
      assert.equal(match(name, 'milk'), 'contains', name);
    }
  });

  test('not peanut butter, cocoa butter or plant milks', () => {
    for (const name of ['peanut butter', 'cocoa butter', 'coconut milk', 'almond milk', 'cream of tartar', 'non-dairy creamer']) {
      assert.equal(match(name, 'milk'), null, name);
    }
  });
});

describe('peanuts and tree nuts', () => {
  test('peanut under its other names', () => {
    for (const name of ['peanut oil', 'peanut butter', 'peanut powder', 'groundnuts', 'arachis oil']) {
      assert.equal(match(name, 'peanut'), 'contains', name);
    }
  });

  test('tree nuts, but not coconut, nutmeg or peanuts', () => {
    for (const name of ['almonds', 'cashew nuts', 'hazelnut paste', 'walnut', 'pecan', 'pistachio', 'macadamia', 'hazelnut oil']) {
      assert.equal(match(name, 'tree-nut'), 'contains', name);
    }
    for (const name of ['coconut', 'desiccated coconut', 'nutmeg', 'peanuts', 'ground nuts']) {
      assert.equal(match(name, 'tree-nut'), null, name);
    }
  });
});

describe('soy and gluten', () => {
  test('soy under its other names', () => {
    for (const name of ['soya', 'soybean oil', 'soy lecithin', 'edamame', 'tofu', 'miso']) {
      assert.equal(match(name, 'soy'), 'contains', name);
    }
    assert.equal(match('lecithin', 'soy'), 'traces');
    assert.equal(match('sunflower lecithin', 'soy'), null);
  });

  test('gluten under its other names', () => {
    for (const name of ['wheat flour', 'barley', 'rye', 'malt extract', 'semolina', 'spelt']) {
      assert.equal(match(name, 'gluten'), 'contains', name);
    }
    assert.equal(match('rolled oats', 'gluten'), 'traces');
    assert.equal(match('buckwheat', 'gluten'), null);
    assert.equal(match('maltodextrin', 'gluten'), null);
    assert.equal(match('rice flour', 'gluten'), null);
  });
});

describe('the engine with aliases', () => {
  test('a black tea is Not safe for someone avoiding caffeine, with black tea highlighted', () => {
    const verdict = decideVerdict(product(['black tea', 'vanilla flavour'], false), [avoidCaffeine]);
    assert.equal(verdict.state, 'unsafe');
    assert.deepEqual(verdict.checks[0].matched, ['black tea']);
    assert.equal(verdict.reasons[0].text, 'Contains black tea, which has caffeine. You avoid caffeine.');
  });

  test('instant coffee in a cappuccino is Not safe too', () => {
    const verdict = decideVerdict(product(['sugar', 'milk solids', 'instant coffee'], false), [avoidCaffeine]);
    assert.equal(verdict.state, 'unsafe');
    assert.deepEqual(verdict.checks[0].matched, ['instant coffee']);
  });

  test('rooibos is Safe for someone avoiding caffeine, once verified', () => {
    const verdict = decideVerdict(product(['rooibos tea']), [avoidCaffeine]);
    assert.equal(verdict.state, 'safe');
  });

  test('cocoa is Caution, never Safe, for someone avoiding caffeine', () => {
    const verdict = decideVerdict(product(['sugar', 'cocoa powder']), [avoidCaffeine]);
    assert.equal(verdict.state, 'caution');
    assert.equal(verdict.checks[0].outcome, 'unchecked');
    assert.deepEqual(verdict.checks[0].matched, ['cocoa powder']);
  });

  test('an untagged peanut oil is Not safe for a peanut allergy', () => {
    const verdict = decideVerdict(product(['sunflower oil', 'peanut oil']), [allergy('peanut')]);
    assert.equal(verdict.state, 'unsafe');
    assert.deepEqual(verdict.checks[0].matched, ['peanut oil']);
  });

  test('a tagged allergen still counts without any alias', () => {
    const tagged: VerdictProduct = { verified: true, readFromLabel: false, ingredients: [ingredient('hydrolysed protein', 'soy')], mayContain: [] };
    assert.equal(decideVerdict(tagged, [allergy('soy')]).state, 'unsafe');
  });

  test('coconut is Safe for a tree nut allergy', () => {
    const verdict = decideVerdict(product(['desiccated coconut', 'sugar']), [allergy('tree-nut')]);
    assert.equal(verdict.state, 'safe');
  });

  test('avoiding milk as an ingredient keeps the group exceptions', () => {
    const avoidMilk: ProfileRule = { ...avoidCaffeine, target: 'milk' };
    assert.equal(decideVerdict(product(['coconut milk', 'sugar']), [avoidMilk]).state, 'safe');
    assert.equal(decideVerdict(product(['whey powder', 'sugar']), [avoidMilk]).state, 'unsafe');
  });

  test('a rule with no alias group still matches its own word inside a name', () => {
    const avoidSugar: ProfileRule = { ...avoidCaffeine, target: 'sugar' };
    const verdict = decideVerdict(product(['brown sugar', 'flour']), [avoidSugar]);
    assert.equal(verdict.state, 'unsafe');
    assert.equal(verdict.reasons[0].text, 'Contains brown sugar, which you avoid.');
  });
});
