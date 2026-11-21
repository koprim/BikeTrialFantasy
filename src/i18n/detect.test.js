import { detectLanguage, LANGUAGE_KEY } from './detect';

const storageWith = (saved) => ({ getItem: async (key) => (key === LANGUAGE_KEY ? saved : null) });
const device =
  (...tags) =>
  () =>
    tags.map((tag) => ({ languageTag: tag, languageCode: tag.split('-')[0] }));

test('a saved registry language wins', async () => {
  expect(await detectLanguage({ storage: storageWith('es'), deviceLocales: device('fr-FR') })).toBe('es');
});

test('an unknown saved language is ignored', async () => {
  expect(await detectLanguage({ storage: storageWith('de'), deviceLocales: device('es-MX') })).toBe('es');
});

test('the first device language present in the registry is used, region ignored', async () => {
  expect(await detectLanguage({ storage: storageWith(null), deviceLocales: device('de-DE', 'es-MX', 'fr-FR') })).toBe(
    'es',
  );
});

test('no known language gives the fallback language', async () => {
  expect(await detectLanguage({ storage: storageWith(null), deviceLocales: device('ja-JP') })).toBe('en');
});

test('broken storage or locales still give a language', async () => {
  const storage = { getItem: async () => Promise.reject(new Error('io')) };
  const deviceLocales = () => {
    throw new Error('no locales');
  };
  expect(await detectLanguage({ storage, deviceLocales })).toBe('en');
});

test('a device locale with a language tag only is understood', async () => {
  const deviceLocales = () => [{ languageTag: 'es-MX' }];
  expect(await detectLanguage({ storage: storageWith(null), deviceLocales })).toBe('es');
});

test('no device locales at all gives the fallback language', async () => {
  expect(await detectLanguage({ storage: storageWith(null), deviceLocales: () => null })).toBe('en');
});
