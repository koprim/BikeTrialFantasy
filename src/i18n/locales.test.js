const { LANGUAGES, REFERENCE_LANGUAGE, languageByCode } = require('./languages');
const { leafKeys, valueAt } = require('./progress');

const reference = languageByCode(REFERENCE_LANGUAGE);
const variables = (text) =>
  (text.match(/\{\{\s*[\w.]+\s*\}\}/g) || [])
    .map((v) => v.replace(/\s/g, ''))
    .sort()
    .join();

describe.each(LANGUAGES.map((language) => [language.code, language]))('%s', (code, language) => {
  test.each(['ui', 'game'])('every %s key exists in the reference language', (file) => {
    const unknown = leafKeys(language[file]).filter((key) => typeof valueAt(reference[file], key) !== 'string');
    expect(unknown).toEqual([]);
  });

  test.each(['ui', 'game'])('%s texts keep the reference variables', (file) => {
    const wrong = leafKeys(language[file]).filter((key) => {
      const text = valueAt(language[file], key);
      const source = valueAt(reference[file], key);
      return (
        typeof text === 'string' && text !== '' && typeof source === 'string' && variables(text) !== variables(source)
      );
    });
    expect(wrong).toEqual([]);
  });
});
