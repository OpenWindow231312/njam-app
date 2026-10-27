/**
 * Tests for the scanner's barcode helpers. Run with `npm test`.
 */
/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { formatBarcode, parseTypedBarcode } from './barcode.ts';

describe('formatBarcode', () => {
  test('groups an EAN-13 the way it is printed', () => {
    assert.equal(formatBarcode('6001234000017'), '6 001234 000017');
  });

  test('leaves other lengths alone', () => {
    assert.equal(formatBarcode('12345670'), '12345670');
  });
});

describe('parseTypedBarcode', () => {
  test('keeps a clean 13-digit number', () => {
    assert.equal(parseTypedBarcode('6001234000017'), '6001234000017');
  });

  test('drops the spaces and dashes people copy from the pack', () => {
    assert.equal(parseTypedBarcode('6 001234 000017'), '6001234000017');
    assert.equal(parseTypedBarcode('6-001234-000017'), '6001234000017');
  });

  test('accepts EAN-8 and UPC-A lengths', () => {
    assert.equal(parseTypedBarcode('12345670'), '12345670');
    assert.equal(parseTypedBarcode('012345678905'), '012345678905');
  });

  test('turns down a number that is too short, too long or not a number', () => {
    assert.equal(parseTypedBarcode('600123'), null);
    assert.equal(parseTypedBarcode('60012340000171'), null);
    assert.equal(parseTypedBarcode('6001234OOOO17'), null);
    assert.equal(parseTypedBarcode(''), null);
  });
});
