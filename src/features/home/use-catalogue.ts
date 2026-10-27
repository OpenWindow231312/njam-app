/**
 * useCatalogue: everything Home, Search and an aisle page need to show
 * products with their verdicts, in one hook so the three screens agree.
 *
 * It loads the whole catalogue (about a thousand products), every
 * profile in the household, the aisles, the stores and the household's
 * saved products. It decides each product's verdict once per load with the
 * default profile, the same profile a scan is recorded against, unless the
 * screen passes the people to check for (Home's "Checking for" list).
 * Checked for several people, a product gets the worst of their verdicts:
 * it is only Safe if it is Safe for every one of them.
 *
 * What it loads is shared by every screen that uses it. A screen opening
 * shows what is already there at once, and reloads in the background
 * whenever it comes into focus, so a product another person in the
 * household saved shows up too. The products themselves are
 * the heavy part (a few megabytes), so they are kept in memory and fetched
 * again only after CATALOGUE_MAX_AGE_MS.
 *
 * The small things (the people, aisles, stores and saved products) load
 * apart from the products, so a screen can draw its aisles and its "Checking
 * for" pill while the products are still downloading.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, useSyncExternalStore } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchCategories, type Category } from '@/features/home/categories';
import type { VerdictFilter } from '@/features/home/FilterSheet';
import { fetchSavedProductIds, saveProduct, unsaveProduct } from '@/features/home/saved-products';
import { fetchStores, type Store } from '@/features/home/stores';
import { fetchHouseholdProfiles, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchCatalogue, type CatalogueProduct } from '@/features/verdict/catalogue';
import { decideVerdict, type VerdictState } from '@/services/verdict';

/** The small things, quick to load, that a screen can draw before the products. */
export type Basics = {
  /** The household's default profile. */
  profile: ActiveProfile;
  /** Everyone in the household, the default profile first. */
  profiles: ActiveProfile[];
  categories: Category[];
  stores: Store[];
};

/** Everything loaded before a screen can draw its grid. */
export type Loaded = Basics & { products: CatalogueProduct[] };

/** A product with its verdict for the people it was checked for. */
export type Checked = { product: CatalogueProduct; verdict: VerdictState };

/** Which aisle to show: everything, your saved products, or one category's id. */
export type Aisle = 'all' | 'saved' | string;

export type Filters = {
  query: string;
  verdictFilter: VerdictFilter;
  /** null means any store. */
  storeId: string | null;
  aisle: Aisle;
};

/** How long the products are kept before they are fetched again. */
const CATALOGUE_MAX_AGE_MS = 10 * 60 * 1000;

/**
 * The products, shared by Home, Search and every aisle page. The promise is
 * kept rather than the list, so two screens opening at once share one fetch.
 */
let cachedProducts: { products: Promise<CatalogueProduct[]>; fetchedAt: number } | null = null;

function catalogueProducts(): Promise<CatalogueProduct[]> {
  if (cachedProducts && Date.now() - cachedProducts.fetchedAt < CATALOGUE_MAX_AGE_MS) {
    return cachedProducts.products;
  }
  const products = fetchCatalogue();
  cachedProducts = { products, fetchedAt: Date.now() };
  // A failed fetch is not kept, so the next focus tries again.
  products.catch(() => {
    cachedProducts = null;
  });
  return products;
}

/**
 * What the last load found, shared by every screen. householdId says whose
 * it is, so signing in to another household never shows the last one's
 * people or saved products. Only updateShared changes it, which tells every
 * screen showing it to draw again.
 */
type Shared = {
  householdId: string | null;
  basics: Basics | null;
  products: CatalogueProduct[] | null;
  saved: Set<string>;
};

let shared: Shared = { householdId: null, basics: null, products: null, saved: new Set() };
const listeners = new Set<() => void>();

function updateShared(change: Partial<Shared>) {
  shared = { ...shared, ...change };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** One empty set for "nothing saved yet", so it is the same object each draw. */
const NOTHING_SAVED = new Set<string>();

async function loadBasics(householdId: string): Promise<{ basics: Basics; saved: Set<string> }> {
  const [profiles, categories, stores, saved] = await Promise.all([
    fetchHouseholdProfiles(householdId),
    fetchCategories(),
    fetchStores(),
    fetchSavedProductIds(),
  ]);
  // fetchHouseholdProfiles puts the default profile first.
  const profile = profiles[0];
  if (!profile) throw new Error('No diet profile');
  return { basics: { profile, profiles, categories, stores }, saved };
}

/** Does a product's name or brand contain what was typed? Ignores case. */
function matchesSearch(product: CatalogueProduct, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted.length === 0) return true;
  return product.name.toLowerCase().includes(wanted) || (product.brand ?? '').toLowerCase().includes(wanted);
}

/** Worse verdicts rank higher, so the worst of several is the highest. */
const VERDICT_RANK: Record<VerdictState, number> = { safe: 0, caution: 1, unsafe: 2 };

function worstOf(verdicts: VerdictState[]): VerdictState {
  return verdicts.reduce((worst, next) => (VERDICT_RANK[next] > VERDICT_RANK[worst] ? next : worst), 'safe');
}

/**
 * The verdicts already decided, shared by every screen, so opening an aisle
 * or Search does not decide a thousand products again. They are kept by the
 * rules they were decided against, written out as text: a fresh copy of the
 * same rules (each focus reloads the profiles) finds the same verdicts, and
 * a changed rule finds nothing and decides again. New products empty it.
 */
let decided: { products: CatalogueProduct[]; byRules: Map<string, Checked[]> } | null = null;

/** Every product with the worst of its verdicts for these people. */
function checkAll(products: CatalogueProduct[], checkFor: ActiveProfile[]): Checked[] {
  if (decided?.products !== products) decided = { products, byRules: new Map() };
  const rulesKey = JSON.stringify(checkFor.map((profile) => profile.rules));
  const known = decided.byRules.get(rulesKey);
  if (known) return known;

  const checked = products.map((product) => {
    const facts = {
      verified: product.verified,
      readFromLabel: false,
      fromOpenFoodFacts: product.source === 'open_food_facts',
      ingredients: product.ingredients,
      mayContain: product.mayContain,
    };
    const verdicts = checkFor.map((profile) => decideVerdict(facts, profile.rules).state);
    return { product, verdict: worstOf(verdicts) };
  });
  decided.byRules.set(rulesKey, checked);
  return checked;
}

function matchesVerdict(verdict: VerdictState, filter: VerdictFilter): boolean {
  if (filter === 'safe') return verdict === 'safe';
  if (filter === 'notUnsafe') return verdict !== 'unsafe';
  return true;
}

/** The products that pass every filter, in catalogue order (A to Z). */
export function applyFilters(checked: Checked[], saved: Set<string>, filters: Filters): Checked[] {
  return checked.filter(
    ({ product, verdict }) =>
      matchesSearch(product, filters.query) &&
      matchesVerdict(verdict, filters.verdictFilter) &&
      (filters.storeId === null || product.storeIds.includes(filters.storeId)) &&
      (filters.aisle === 'all' ||
        (filters.aisle === 'saved' ? saved.has(product.id) : product.categoryId === filters.aisle)),
  );
}

/**
 * forProfileIds: whose rules to check against. Left out, or matching nobody,
 * it is the household's default profile, as before.
 */
export function useCatalogue(forProfileIds?: string[]) {
  const { member } = useAuth();
  const householdId = member?.householdId;
  const snapshot = useSyncExternalStore(subscribe, () => shared);
  const mine = snapshot.householdId === householdId;
  const basics = mine ? snapshot.basics : null;
  const saved = mine ? snapshot.saved : NOTHING_SAVED;
  const products = snapshot.products;
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const reload = useCallback(() => {
    if (!householdId) return;
    const fail = (error: unknown) => {
      console.warn('Could not load the catalogue', error);
      setFailed(true);
    };
    // Two loads side by side, not one after the other: the small one
    // usually lands first and lets the screen draw its aisles.
    loadBasics(householdId)
      .then((result) => {
        updateShared({ householdId, basics: result.basics, saved: result.saved });
        setFailed(false);
      })
      .catch(fail);
    // Usually the same list as last time, from memory. Only a new list is
    // shared, so the verdicts already decided for it are kept.
    catalogueProducts()
      .then((list) => {
        if (list !== shared.products) updateShared({ products: list });
      })
      .catch(fail);
  }, [householdId]);

  // null until both halves are in. Kept as one object for the screens.
  const loaded = useMemo<Loaded | null>(
    () => (basics && products ? { ...basics, products } : null),
    [basics, products],
  );

  useFocusEffect(reload);

  // A string key, so a new array with the same ids does not decide again.
  const forKey = (forProfileIds ?? []).join(',');

  // Not on every key typed in a search. checkAll also remembers across
  // screens and reloads, so this is only slow the first time.
  const checked = useMemo<Checked[]>(() => {
    if (!loaded) return [];
    const wanted = loaded.profiles.filter((profile) => forKey.split(',').includes(profile.id));
    return checkAll(loaded.products, wanted.length > 0 ? wanted : [loaded.profile]);
  }, [loaded, forKey]);

  /** Saves or unsaves at once on screen, and puts it back if the database says no. */
  function toggleSave(productId: string) {
    const wasSaved = saved.has(productId);
    const flip = (current: Set<string>) => {
      const next = new Set(current);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    };
    updateShared({ saved: flip(shared.saved) });
    (wasSaved ? unsaveProduct(productId) : saveProduct(productId)).catch(() => {
      updateShared({ saved: flip(shared.saved) });
      setSaveFailed(true);
    });
  }

  return {
    basics,
    loaded,
    checked,
    saved,
    toggleSave,
    failed,
    dismissFailed: () => setFailed(false),
    saveFailed,
    dismissSaveFailed: () => setSaveFailed(false),
    reload,
  };
}
