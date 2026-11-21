const { gameText } = require('./game');

const registry = {
  FALLBACK_LANGUAGE: 'en',
  REFERENCE_LANGUAGE: 'fr',
  LANGUAGES: [
    {
      code: 'fr',
      game: {
        cards: { c1: { name: 'Pneus', effects: ['+{{value}} pts FR', 'deux'] } },
        seasons: { s: { name: 'Saison' } },
        events: { e: { name: 'Manche' } },
      },
    },
    { code: 'en', game: { cards: { c1: { name: 'Tyres', effects: ['+{{value}} pts EN'] } }, seasons: {}, events: {} } },
    {
      code: 'es',
      game: { cards: { c1: { name: '', effects: [] } }, seasons: { s: { name: 'Temporada' } }, events: {} },
    },
  ],
};
registry.languageByCode = (code) => registry.LANGUAGES.find((l) => l.code === code) || null;

test('reads the chosen language', () => {
  expect(gameText('es', registry).seasonName('s')).toBe('Temporada');
});

test('missing or empty texts fall back to English, then French', () => {
  const es = gameText('es', registry);
  expect(es.cardName('c1')).toBe('Tyres');
  expect(es.effectText('c1', 0, '30')).toBe('+30 pts EN');
  expect(es.effectText('c1', 1, '30')).toBe('deux');
  expect(es.eventName('e')).toBe('Manche');
});

test('an unknown id shows the id, an unknown effect shows nothing', () => {
  const fr = gameText('fr', registry);
  expect(fr.cardName('nope')).toBe('nope');
  expect(fr.effectText('nope', 0, '1')).toBe('');
});

test('the real registry reads the generated French texts', () => {
  expect(gameText('fr').cardName('technique-2026-gap')).toBe('Gap');
  expect(gameText('fr').seasonName('2026')).toBe('Coupe du Monde 2026');
});

test('an unknown language is skipped: the chain is English then French', () => {
  expect(gameText('de', registry).cardName('c1')).toBe('Tyres');
  expect(gameText('en', registry).eventName('e')).toBe('Manche');
});
