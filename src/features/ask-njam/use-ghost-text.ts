/**
 * useGhostText: asks for the likely rest of a message while you type.
 *
 * The rules, each one a line below:
 *   - Wait for a pause of PAUSE_MS after the last keystroke, so a fast
 *     typist sends nothing until they stop. One pause, at most one request.
 *   - Need at least MIN_CHARACTERS typed; two letters are not enough to guess from.
 *   - A new keystroke cancels the request in flight (AbortController), so a
 *     stale guess never costs more than it already has.
 *   - A reply that arrives after the text has changed is ignored, even if
 *     the cancel came too late to stop it.
 * The edge function caps how long a completion may be.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { completeMessage } from '@/services/ai';

const PAUSE_MS = 400;
const MIN_CHARACTERS = 3;
// A finished sentence has nothing left to complete.
const FINISHED = /[.!?]\s*$/;

export function useGhostText() {
  const [ghost, setGhost] = useState<string | null>(null);
  const pauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const latestText = useRef('');

  const cancel = useCallback(() => {
    if (pauseTimer.current) clearTimeout(pauseTimer.current);
    pauseTimer.current = null;
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  const onChangeText = useCallback(
    (text: string) => {
      latestText.current = text;
      cancel();
      // The old ghost was the rest of a different message.
      setGhost(null);
      if (text.trim().length < MIN_CHARACTERS || FINISHED.test(text)) return;

      pauseTimer.current = setTimeout(() => {
        const controller = new AbortController();
        inFlight.current = controller;
        completeMessage(text, controller.signal).then((completion) => {
          // Late reply: the person has typed since we asked.
          if (controller.signal.aborted || latestText.current !== text) return;
          setGhost(completion);
        });
      }, PAUSE_MS);
    },
    [cancel],
  );

  // Leaving the screen stops any pending or running request.
  useEffect(() => cancel, [cancel]);

  return { ghost, onChangeText };
}
