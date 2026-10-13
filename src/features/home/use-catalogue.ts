/**
 * useCatalogue: everything Home, Search and an aisle page need to show
 * products with their verdicts, in one hook so the three screens agree.
 *
 * It loads the whole catalogue (a few dozen products for now), the
 * household's default profile, the aisles, the stores and the household's
 * saved products. It decides each product's verdict once per load with the
 * default profile, the same profile a scan is recorded against.
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
import { fetchActiveProfile, type ActiveProfile } from '@/features/profile/active-profile';
import { fetchCatalogue, type CatalogueProduct } from '@/features/verdict/catalogue';
import { decideVerdict, type VerdictState } from '@/services/verdict';

/** Everything loaded before a screen can draw its grid. */
export type Loaded = {
  products: CatalogueProduct[];
  profile: ActiveProfile;
  categories: Category[];
  stores: Store[];
};

/** A product with its verdict for the default profile. */
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
  const [products, profile, categories, stores, saved] = await Promise.all([
    fetchCatalogue(),
    fetchActiveProfile(householdId),
    fetchCategories(),
    fetchStores(),
    fetchSavedProductIds(),
  ]);
  if (!profile) throw new Error('No diet profile');
  return { loaded: { products, profile, categories, stores }, saved };
}

/** Does a product's name or brand contain what was typed? Ignores case. */
function matchesSearch(product: CatalogueProduct, query: string): boolean {
  const wanted = query.trim().toLowerCase();
  if (wanted.length === 0) return true;
  return product.name.toLowerCase().includes(wanted) || (product.brand ?? '').toLowerCase().includes(wanted);
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

export function useCatalogue() {
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

  // Decide every product once per load, not on every key typed in a search.
  const checked = useMemo<Checked[]>(() => {
    if (!loaded) return [];
    return loaded.products.map((product) => ({
      product,
      verdict: decideVerdict(
        {
          verified: product.verified,
          readFromLabel: false,
          ingredients: product.ingredients,
          mayContain: product.mayContain,
        },
        loaded.profile.rules,
      ).state,
    }));
  }, [loaded]);

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
