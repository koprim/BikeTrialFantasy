import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { gameText } from './game';

/** Game texts in the current language; screens re-render when it changes. */
export function useGameText() {
  const { i18n } = useTranslation();
  return useMemo(() => gameText(i18n.language), [i18n.language]);
}
