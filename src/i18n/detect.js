import { REFERENCE_LANGUAGE } from './languages';

export const LANGUAGE_KEY = 'language';

export async function detectLanguage() {
  return REFERENCE_LANGUAGE;
}
