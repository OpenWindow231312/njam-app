/**
 * Your notification and privacy choices, saved to your account in the
 * user_settings table (one row per person), so they follow you to any phone.
 *
 * The row is only made the first time you change something. Until then the
 * defaults below apply, and they match the column defaults in the migration
 * (20261018120000_household_and_settings.sql).
 */
import { supabase } from '@/lib/supabase';

export type AccountSettings = {
  notifyRecalls: boolean;
  notifyLabelChanges: boolean;
  notifyHousehold: boolean;
  notifyWeeklySummary: boolean;
  /** "21:00". Both null means quiet hours are off. */
  quietFrom: string | null;
  quietUntil: string | null;
  /** Off: scans are not written to your history at all (see verdict/scans.ts). */
  keepScanHistory: boolean;
  helpImprove: boolean;
};

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  notifyRecalls: true,
  notifyLabelChanges: true,
  notifyHousehold: true,
  notifyWeeklySummary: false,
  quietFrom: '21:00',
  quietUntil: '07:00',
  keepScanHistory: true,
  helpImprove: false,
};

/** Postgres sends a time as "21:00:00"; the app shows "21:00". */
function shortTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

export async function fetchAccountSettings(userId: string): Promise<AccountSettings> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_ACCOUNT_SETTINGS;
  return {
    notifyRecalls: data.notify_recalls,
    notifyLabelChanges: data.notify_label_changes,
    notifyHousehold: data.notify_household,
    notifyWeeklySummary: data.notify_weekly_summary,
    quietFrom: shortTime(data.quiet_from),
    quietUntil: shortTime(data.quiet_until),
    keepScanHistory: data.keep_scan_history,
    helpImprove: data.help_improve,
  };
}

/** Saves all of them at once: an upsert makes the row the first time. */
export async function saveAccountSettings(userId: string, settings: AccountSettings): Promise<void> {
  const { error } = await supabase.from('user_settings').upsert({
    user_id: userId,
    notify_recalls: settings.notifyRecalls,
    notify_label_changes: settings.notifyLabelChanges,
    notify_household: settings.notifyHousehold,
    notify_weekly_summary: settings.notifyWeeklySummary,
    quiet_from: settings.quietFrom,
    quiet_until: settings.quietUntil,
    keep_scan_history: settings.keepScanHistory,
    help_improve: settings.helpImprove,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}
