import i18n, { setLanguage } from './index';
import { LANGUAGE_KEY } from './detect';

test('setLanguage applies and saves a registry language', async () => {
  const saved = {};
  const storage = { setItem: async (key, value) => (saved[key] = value) };
  await setLanguage('en', storage);
  expect(i18n.language).toBe('en');
  expect(saved[LANGUAGE_KEY]).toBe('en');
});

test('setLanguage ignores a language outside the registry', async () => {
  await setLanguage('de', { setItem: jest.fn() });
  expect(i18n.language).toBe('fr');
});
