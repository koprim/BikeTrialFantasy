// Screen tests are written in French: every test starts in the reference language, device included.
jest.mock('expo-localization', () => {
  const { REFERENCE_LANGUAGE } = require('../src/i18n/languages');
  return { getLocales: () => [{ languageCode: REFERENCE_LANGUAGE, languageTag: REFERENCE_LANGUAGE }] };
});

const asyncStorageModule = require('@react-native-async-storage/async-storage');
const AsyncStorage = asyncStorageModule.default || asyncStorageModule; // the Jest mock has no `default`
const i18n = require('../src/i18n').default;
const { REFERENCE_LANGUAGE } = require('../src/i18n/languages');
const { LANGUAGE_KEY } = require('../src/i18n/detect');

afterEach(async () => {
  await AsyncStorage.removeItem(LANGUAGE_KEY);
  if (i18n.language !== REFERENCE_LANGUAGE) await i18n.changeLanguage(REFERENCE_LANGUAGE);
});
