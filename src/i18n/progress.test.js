const { leafKeys, valueAt, translationProgress, languagesProgress } = require('./progress');

const reference = { ui: { a: 'A', b: { c: 'C' } }, game: { cards: { x: { name: 'X', effects: ['e1', 'e2'] } } } };

test('leaf keys walk objects and arrays', () => {
  expect(leafKeys(reference.game)).toEqual(['cards.x.name', 'cards.x.effects.0', 'cards.x.effects.1']);
  expect(valueAt(reference.game, 'cards.x.effects.1')).toBe('e2');
  expect(leafKeys({})).toEqual([]);
});

test('percentage = present and non-empty keys / reference keys, floored', () => {
  const language = { ui: { a: 'A', b: { c: '  ' } }, game: { cards: { x: { name: 'X', effects: ['e1'] } } } };
  expect(translationProgress(language, reference)).toEqual({
    percent: 60,
    missing: ['ui:b.c', 'game:cards.x.effects.1'],
  });
  expect(translationProgress(reference, reference).percent).toBe(100);
});

test('every registry language is reported, the reference at 100 %', () => {
  const rows = languagesProgress();
  expect(rows.map((row) => row.code)).toEqual(require('./languages').LANGUAGES.map((l) => l.code));
  expect(rows.find((row) => row.code === 'fr').percent).toBe(100);
});
