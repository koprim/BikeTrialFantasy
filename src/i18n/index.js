import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LANGUAGES, REFERENCE_LANGUAGE, FALLBACK_LANGUAGE, languageByCode } from './languages';
import { detectLanguage, LANGUAGE_KEY } from './detect';

i18n.use(initReactI18next).init({
  // Game texts (language.game) are read by src/i18n/game.js, not by i18next.
  resources: Object.fromEntries(LANGUAGES.map((language) => [language.code, { ui: language.ui }])),
  lng: REFERENCE_LANGUAGE, // replaced by startLanguage() before the first screen renders
  fallbackLng: [FALLBACK_LANGUAGE, REFERENCE_LANGUAGE],
  ns: ['ui'],
  defaultNS: 'ui',
  returnEmptyString: false, // an empty draft text counts as missing
  interpolation: { escapeValue: false }, // React already escapes
  initAsync: false, // i18next < 24: initImmediate: false
});

/** Applies the starting language (saved choice, device, fallback). Never rejects. */
export async function startLanguage(deps) {
  try {
    await i18n.changeLanguage(await detectLanguage(deps));
  } catch {
    // keep the current language
  }
  return i18n.language;
}

/** Applies a registry language now and remembers it on this device. */
export async function setLanguage(code, storage = AsyncStorage) {
  if (!languageByCode(code)) return;
  await i18n.changeLanguage(code);
  try {
    await storage.setItem(LANGUAGE_KEY, code);
  } catch {
    // the choice still applies for this session
  }
}

export default i18n;
