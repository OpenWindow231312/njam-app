/**
 * Reads and writes the scans table: the record of each verdict.
 *
 * A scan stores the verdict and its reason lines exactly as they were shown,
 * so reopening it from History shows the same answer even if the rules or
 * the product have changed since.
 */
import { supabase } from '@/lib/supabase';
import type { VerdictReason, VerdictState } from '@/services/verdict';

export type ScanRecord = {
  id: string;
  barcode: string;
  verdict: VerdictState;
  reasons: VerdictReason[];
  scannedAt: string;
  productName: string | null;
  productBrand: string | null;
  productImageUrl: string | null;
  profileName: string | null;
};

type ScanRow = {
  id: string;
  barcode: string;
  verdict: VerdictState;
  reasons: VerdictReason[];
  scanned_at: string;
  products: { name: string; brand: string | null; image_url: string | null } | null;
  diet_profiles: { name: string } | null;
};

const SCAN_COLUMNS = 'id, barcode, verdict, reasons, scanned_at, products ( name, brand, image_url ), diet_profiles ( name )';

function toRecord(row: ScanRow): ScanRecord {
  return {
    id: row.id,
    barcode: row.barcode,
    verdict: row.verdict,
    reasons: row.reasons,
    scannedAt: row.scanned_at,
    productName: row.products?.name ?? null,
    productBrand: row.products?.brand ?? null,
    productImageUrl: row.products?.image_url ?? null,
    profileName: row.diet_profiles?.name ?? null,
  };
}

export async function recordScan(scan: {
  userId: string;
  profileId: string;
  productId: string | null;
  barcode: string;
  verdict: VerdictState;
  reasons: VerdictReason[];
}): Promise<void> {
  // "Keep my scan history" off on Profile > Settings: nothing is written.
  // If the setting cannot be read, the scan is kept, as it was before the
  // setting existed. Your own settings row is only made once you change one.
  const settings = await supabase
    .from('user_settings')
    .select('keep_scan_history')
    .eq('user_id', scan.userId)
    .maybeSingle();
  if (!settings.error && settings.data && !settings.data.keep_scan_history) return;

  const { error } = await supabase.from('scans').insert({
    user_id: scan.userId,
    diet_profile_id: scan.profileId,
    product_id: scan.productId,
    barcode: scan.barcode,
    verdict: scan.verdict,
    reasons: scan.reasons,
  });
  if (error) throw error;
}

export async function fetchScan(id: string): Promise<ScanRecord | null> {
  const { data, error } = await supabase.from('scans').select(SCAN_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as unknown as ScanRow) : null;
}

/** Your household's latest scans, newest first. RLS limits it to your household. */
export async function fetchRecentScans(limit = 30): Promise<ScanRecord[]> {
  const { data, error } = await supabase
    .from('scans')
    .select(SCAN_COLUMNS)
    .order('scanned_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as unknown as ScanRow[]).map(toRecord);
}
