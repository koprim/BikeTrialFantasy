import { useEffect, useState } from 'react';
import { startLanguage } from './index';

/** Renders nothing until the starting language is applied, so no screen flips language after showing. */
export function LanguageGate({ children }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    startLanguage().then(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, []);
  return ready ? children : null;
}
