import i18n from './index';

test('starts in the reference language', () => {
  expect(i18n.language).toBe('fr');
  expect(i18n.t('common.unexpectedError')).toBe('Une erreur est survenue.');
});

test('a key missing in the chosen language falls back to English', async () => {
  i18n.addResource('es', 'ui', 'common.onlyEnglish', '');
  i18n.addResource('en', 'ui', 'common.onlyEnglish', 'English text');
  await i18n.changeLanguage('es');
  expect(i18n.t('common.onlyEnglish')).toBe('English text');
});
