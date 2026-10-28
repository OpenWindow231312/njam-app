/**
 * useSwipeHint: whether to show "Swipe right to take it" over the typing bar.
 *
 * The hint shows whenever there is a suggestion, until you have taken one
 * SHOW_UNTIL times. After that you know the gesture and it never shows
 * again. The count is kept on the phone (AsyncStorage), like the device
 * settings, so it survives closing the app.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'njam.askSwipeHint.v1';
const SHOW_UNTIL = 3;

export function useSwipeHint() {
  // null until the saved count is read, so the hint never flashes up for
  // someone who has already learnt the gesture.
  const [taken, setTaken] = useState<number | null>(null);

  useEffect(() => {
    // The web's first render runs in Node, which has no storage.
    if (typeof window === 'undefined') return;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => setTaken(Number(saved ?? 0)))
      .catch(() => setTaken(SHOW_UNTIL));
  }, []);

  const onTake = useCallback(() => {
    setTaken((count) => {
      const next = (count ?? 0) + 1;
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return { showHint: taken !== null && taken < SHOW_UNTIL, onTake };
}
