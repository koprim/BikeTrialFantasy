import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wraps an async call for a button: a press while the call is in flight is ignored (resolves undefined),
 * and `busy` tells the button to show itself disabled.
 * @template T
 * @param {function(...*): Promise<T>} action
 * @returns {{ run: function(...*): Promise<(T|undefined)>, busy: boolean }}
 */
export function useAsyncAction(action) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const latestAction = useRef(action);
  latestAction.current = action;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = useCallback(async (...args) => {
    if (inFlight.current) return undefined;
    inFlight.current = true;
    setBusy(true);
    try {
      return await latestAction.current(...args);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }, []);

  return { run, busy };
}
