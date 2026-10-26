/**
 * Tests for validate.ts. Run from this folder with `npx deno test validate.test.ts`.
 *
 * The recipe cases come from bug 11, seen again on 26 Oct 2026: asked for "a
 * quick dinner idea", Gemini sent a recipe block holding only its type and
 * title, so it was dropped and the person saw "Here is a quick dinner idea"
 * with nothing after it. The recipe now comes in its own `recipe` field,
 * where the schema can require its ingredients and steps.
 */
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { validateBlocks } from './validate.ts';

const OATS = 'oats-id';
const known = new Set([OATS]);

const intro = { type: 'text', text: 'Here is a quick dinner idea.' };
const suggestions = { type: 'suggestions', prompts: ['Something sweeter?', 'What else can I make?'] };
const recipe = {
  title: 'Pilchard rice bowl',
  ingredients: [
    { name: '400 g pilchards in tomato sauce', productId: null, allergen: 'fish', eNumber: null },
    { name: '200 g rice', productId: null, allergen: null, eNumber: null },
  ],
  steps: ['Cook the rice.', 'Warm the pilchards and serve on the rice.'],
};

describe('the recipe field', () => {
  test('becomes a recipe block after the text, before the suggestions', () => {
    const blocks = validateBlocks({ blocks: [intro, suggestions], recipe }, known);
    assert.deepEqual(
      blocks.map((block) => block.type),
      ['text', 'recipe', 'suggestions'],
    );
    const shown = blocks[1];
    assert.equal(shown.type, 'recipe');
    if (shown.type === 'recipe') {
      assert.equal(shown.title, 'Pilchard rice bowl');
      assert.equal(shown.ingredients.length, 2);
      assert.equal(shown.ingredients[0].allergen, 'fish');
      assert.equal(shown.steps.length, 2);
    }
  });

  test('null means no recipe, and the other blocks are unchanged', () => {
    const blocks = validateBlocks({ blocks: [intro, suggestions], recipe: null }, known);
    assert.deepEqual(
      blocks.map((block) => block.type),
      ['text', 'suggestions'],
    );
  });

  test('a recipe without steps is still dropped, never shown half-written', () => {
    const blocks = validateBlocks({ blocks: [intro], recipe: { ...recipe, steps: [] } }, known);
    assert.deepEqual(
      blocks.map((block) => block.type),
      ['text'],
    );
  });

  test('an ingredient keeps only a catalogue id the function read', () => {
    const withIds = {
      ...recipe,
      ingredients: [
        { name: '80 g oats', productId: OATS, allergen: 'gluten', eNumber: null },
        { name: '250 ml milk', productId: 'invented-id', allergen: 'milk', eNumber: null },
      ],
    };
    const [, shown] = validateBlocks({ blocks: [intro], recipe: withIds }, known);
    assert.equal(shown.type, 'recipe');
    if (shown.type === 'recipe') {
      assert.equal(shown.ingredients[0].productId, OATS);
      assert.equal(shown.ingredients[1].productId, null);
    }
  });
});
