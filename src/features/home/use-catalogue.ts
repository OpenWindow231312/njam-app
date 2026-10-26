/**
 * useCatalogue: everything Home, Search and an aisle page need to show
 * products with their verdicts, in one hook so the three screens agree.
 *
 * It loads the whole catalogue (a few dozen products for now), every
 * profile in the household, the aisles, the stores and the household's
 * saved products. It decides each product's verdict once per load with the
 * default profile, the same profile a scan is recorded against, unless the
 * screen passes the people to check for (Home's "Checking for" list).
 * Checked for several people, a product gets the worst of their verdicts:
 * it is only Safe if it is Safe for every one of them.
 *
 * It reloads whenever its screen comes back into focus, so a product saved
 * on one screen shows as saved on the others.
 */
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { fetchCategories, type Category } from '@/features/home/categories';
import type { VerdictFilter } from '@/features/home/FilterSheet';
import { fetchSavedProductIds, saveProduct, unsaveProduct } from '@/features/home/saved-products';
import { fetchStores, type Store } from '@/features/home/stores';
import { fetchHouseholdProfiles, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchCatalogue, type CatalogueProduct } from '@/features/verdict/catalogue';
import { decideVerdict, type VerdictState } from '@/services/verdict';

/** Everything loaded before a screen can draw its grid. */
export type Loaded = {
  products: CatalogueProduct[];
  /** The household's default profile. */
  profile: ActiveProfile;
  /** Everyone in the household, the default profile first. */
  profiles: ActiveProfile[];
  categories: Category[];
  stores: Store[];
};

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

async function loadCatalogue(householdId: string): Promise<{ loaded: Loaded; saved: Set<string> }> {
  const [products, profiles, categories, stores, saved] = await Promise.all([
    fetchCatalogue(),
    fetchHouseholdProfiles(householdId),
    fetchCategories(),
    fetchStores(),
    fetchSavedProductIds(),
  ]);
  // fetchHouseholdProfiles puts the default profile first.
  const profile = profiles[0];
  if (!profile) throw new Error('No diet profile');
  return { loaded: { products, profile, profiles, categories, stores }, saved };
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
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  const householdId = member?.householdId;
  const reload = useCallback(() => {
    if (!householdId) return;
    loadCatalogue(householdId)
      .then((result) => {
        setLoaded(result.loaded);
        setSaved(result.saved);
        setFailed(false);
      })
      .catch((error) => {
        console.warn('Could not load the catalogue', error);
        setFailed(true);
      });
  }, [householdId]);

  useFocusEffect(reload);

  // A string key, so a new array with the same ids does not decide again.
  const forKey = (forProfileIds ?? []).join(',');

  // Decide every product once per load (or change of people), not on every
  // key typed in a search.
  const checked = useMemo<Checked[]>(() => {
    if (!loaded) return [];
    const wanted = loaded.profiles.filter((profile) => forKey.split(',').includes(profile.id));
    const checkFor = wanted.length > 0 ? wanted : [loaded.profile];
    return loaded.products.map((product) => {
      const facts = {
        verified: product.verified,
        readFromLabel: false,
        ingredients: product.ingredients,
        mayContain: product.mayContain,
      };
      const verdicts = checkFor.map((profile) => decideVerdict(facts, profile.rules).state);
      return { product, verdict: worstOf(verdicts) };
    });
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
    setSaved(flip);
    (wasSaved ? unsaveProduct(productId) : saveProduct(productId)).catch(() => {
      setSaved(flip);
      setSaveFailed(true);
    });
  }

  return {
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
