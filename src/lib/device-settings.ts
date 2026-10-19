/**
 * Settings that belong to this phone, not to the person: whether the
 * flashlight is on when the scanner opens, and whether Njam vibrates.
 *
 * They are kept in AsyncStorage on the phone, so they work offline and do
 * not follow you to another phone (a torch you want at home may be wrong on
 * a borrowed phone). Your notification and privacy choices are different:
 * they are saved to your account (src/features/profile/account-settings.ts).
 *
 * Three ways in:
 *   useDeviceSettings()        - in a screen, re-renders when a setting changes.
 *   currentDeviceSettings()    - a plain read, for code outside React (haptics).
 *   setDeviceSetting(key, v)   - change one, and save it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type DeviceSettings = {
  /** The flashlight's state when the scanner opens. You can still switch it there. */
  flashlight: 'off' | 'on';
  /** Vibrate when something works: a scan, a save, a product added. */
  vibrate: boolean;
};

const STORAGE_KEY = 'njam.deviceSettings.v1';

const DEFAULTS: DeviceSettings = { flashlight: 'off', vibrate: true };

// The settings as last read or changed. Starts as the defaults and is
// replaced as soon as the saved copy has been read.
let current: DeviceSettings = DEFAULTS;
const listeners = new Set<(settings: DeviceSettings) => void>();

function tellListeners() {
  for (const listener of listeners) listener(current);
}

/**
 * Reads the saved copy once, when the app starts. A missing or broken copy
 * means the defaults. On the web, the first copy of each page is drawn in
 * Node, which has no window and no storage, so it skips the read there.
 */
const loaded: Promise<void> =
  typeof window === 'undefined'
    ? Promise.resolve()
    : AsyncStorage.getItem(STORAGE_KEY)
        .then((saved) => {
          if (!saved) return;
          current = { ...DEFAULTS, ...(JSON.parse(saved) as Partial<DeviceSettings>) };
          tellListeners();
        })
        .catch(() => {});

export function currentDeviceSettings(): DeviceSettings {
  return current;
}

export async function setDeviceSetting<K extends keyof DeviceSettings>(key: K, value: DeviceSettings[K]) {
  await loaded;
  current = { ...current, [key]: value };
  tellListeners();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function useDeviceSettings(): DeviceSettings {
  const [settings, setSettings] = useState(current);
  useEffect(() => {
    listeners.add(setSettings);
    // In case the saved copy arrived between the first render and now.
    setSettings(current);
    return () => {
      listeners.delete(setSettings);
    };
  }, []);
  return settings;
}
