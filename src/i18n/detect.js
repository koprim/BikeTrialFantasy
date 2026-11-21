import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { FALLBACK_LANGUAGE, languageByCode } from './languages';

export const LANGUAGE_KEY = 'language';

const known = (code) => !!code && !!languageByCode(code);
const baseCode = (locale) =>
  String(locale.languageCode || locale.languageTag || '')
    .split('-')[0]
    .toLowerCase();

async function savedLanguage(storage) {
  try {
    return await storage.getItem(LANGUAGE_KEY);
  } catch {
    return null;
  }
}

function deviceLanguage(deviceLocales) {
  try {
    return (deviceLocales() || []).map(baseCode).find(known) || null;
  } catch {
    return null;
  }
}

/** Saved choice if declared in the registry, else first device language in the registry, else the fallback. */
export async function detectLanguage({ storage = AsyncStorage, deviceLocales = getLocales } = {}) {
  const saved = await savedLanguage(storage);
  if (known(saved)) return saved;
  return deviceLanguage(deviceLocales) || FALLBACK_LANGUAGE;
}
