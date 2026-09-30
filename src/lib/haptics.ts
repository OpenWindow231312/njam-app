/**
 * Haptics: a short vibration for good news only.
 *
 * Njam vibrates when something succeeds: a barcode scanned and checked, a
 * product added, a change saved. Taps, errors and warnings do not vibrate,
 * so the buzz keeps meaning "that worked". (Decision, 30 Sep 2026.)
 *
 *   hapticSuccess() - call it at the moment of success, e.g. when a scan
 *                     returns its verdict. The neutral Snackbar calls it for
 *                     you when it appears.
 *
 * The web has no vibration motor to drive, so it does nothing there.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function hapticSuccess() {
  if (Platform.OS === 'web') return;
  // Fire and forget: a missing motor or a phone set to no vibration should
  // never break the flow that succeeded.
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
