/**
 * A copy of the catalogue kept on the phone, so the next time the app opens
 * its products appear from storage at once instead of after the download.
 *
 * It is only a head start. useCatalogue still downloads the catalogue each
 * time the app opens and swaps the fresh list in a few seconds later, and
 * the Verdict screen always reads its product fresh from the database. The
 * verdicts are decided on the phone against your rules as they are now,
 * which are never read from this copy.
 *
 * Android's AsyncStorage cannot read back one value much bigger than 2 MB,
 * and the catalogue is bigger than that, so it is saved in parts of
 * PRODUCTS_PER_PART products, one key each, plus a key saying how many parts
 * there are. Change "v1" if CatalogueProduct changes shape, so an old copy
 * is never read as the new one.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CatalogueProduct } from '@/features/verdict/catalogue';

const STORAGE_KEY = 'njam.catalogue.v1';
const PART_COUNT_KEY = `${STORAGE_KEY}.parts`;

/** About 250 kB each, well under Android's limit. */
const PRODUCTS_PER_PART = 100;

function partKey(index: number): string {
  return `${STORAGE_KEY}.part.${index}`;
}

/**
 * The copy saved last time, or null when there is none or it cannot be read.
 * On the web, the first copy of each page is drawn in Node, which has no
 * window and no storage, so it skips the read there.
 */
export async function readSavedCatalogue(): Promise<CatalogueProduct[] | null> {
  if (typeof window === 'undefined') return null;
  try {
    const count = Number(await AsyncStorage.getItem(PART_COUNT_KEY));
    if (!count) return null;
    const parts = await AsyncStorage.multiGet(Array.from({ length: count }, (_, index) => partKey(index)));
    // A part missing means the copy was never finished. Better none than half.
    if (parts.some(([, value]) => value === null)) return null;
    return parts.flatMap(([, value]) => JSON.parse(value as string) as CatalogueProduct[]);
  } catch {
    return null;
  }
}

/** Replaces the saved copy. A failure only costs the head start next time. */
export async function saveCatalogue(products: CatalogueProduct[]): Promise<void> {
  if (typeof window === 'undefined') return;
  const parts: [string, string][] = [];
  for (let from = 0; from < products.length; from += PRODUCTS_PER_PART) {
    parts.push([partKey(parts.length), JSON.stringify(products.slice(from, from + PRODUCTS_PER_PART))]);
  }
  try {
    // The count is removed first and written last, so a copy cut off
    // halfway (the app closed mid-save) is never read as a whole one.
    await AsyncStorage.removeItem(PART_COUNT_KEY);
    await AsyncStorage.multiSet(parts);
    await AsyncStorage.setItem(PART_COUNT_KEY, String(parts.length));
  } catch (error) {
    console.warn('Could not keep the catalogue on the phone', error);
  }
}
