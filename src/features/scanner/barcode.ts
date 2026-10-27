/**
 * Barcode helpers for the scanner. Plain functions with no React, so the
 * tests can run them with `npm test`.
 */

/** EAN-13 is printed as 1, 6 and 6 digits: "6 001234 000017". Other lengths stay as they are. */
export function formatBarcode(barcode: string): string {
  if (barcode.length !== 13) return barcode;
  return `${barcode.slice(0, 1)} ${barcode.slice(1, 7)} ${barcode.slice(7)}`;
}

/** Grocery barcodes are 8 (EAN-8), 12 (UPC-A) or 13 (EAN-13) digits. */
const GROCERY_LENGTHS = [8, 12, 13];

/**
 * A barcode typed by hand, cleaned up: spaces and dashes are dropped, since
 * people copy the gaps printed under the bars. Returns null when what is
 * left is not a grocery barcode, so the field can say so.
 */
export function parseTypedBarcode(typed: string): string | null {
  const digits = typed.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  return GROCERY_LENGTHS.includes(digits.length) ? digits : null;
}
