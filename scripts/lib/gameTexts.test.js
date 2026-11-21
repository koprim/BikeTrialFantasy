const { splitGameTexts, mergeGameTexts } = require('./gameTexts');

const seasons = [
  { id: '2026', name: 'Coupe 2026', events: [{ id: '2026-r1', name: 'Coupe 2026 — Manche 1', round: 1 }] },
];
const cards = [
  {
    id: 'technique-2026-gap',
    type: 'TECHNIQUE',
    name: 'Gap',
    rarities: ['C'],
    effects: [
      {
        description: "+{value} pts s'il réussit un Gap",
        trigger: { type: 'ALWAYS' },
        reward: { type: 'FLAT_POINTS', value: 1 },
      },
    ],
  },
];

test('splits names and descriptions out of the mechanics', () => {
  const out = splitGameTexts({ seasons, cards });
  expect(out.seasons).toEqual([{ id: '2026', events: [{ id: '2026-r1', round: 1 }] }]);
  expect(out.cards[0]).toEqual({
    id: 'technique-2026-gap',
    type: 'TECHNIQUE',
    rarities: ['C'],
    effects: [{ trigger: { type: 'ALWAYS' }, reward: { type: 'FLAT_POINTS', value: 1 } }],
  });
  expect(out.texts).toEqual({
    cards: { 'technique-2026-gap': { name: 'Gap', effects: ["+{{value}} pts s'il réussit un Gap"] } },
    seasons: { 2026: { name: 'Coupe 2026' } },
    events: { '2026-r1': { name: 'Coupe 2026 — Manche 1' } },
  });
});

test('without cards, the merge keeps the existing card texts', () => {
  const current = { cards: { a: { name: 'A', effects: [] } }, seasons: { old: { name: 'Old' } }, events: {} };
  const { texts } = splitGameTexts({ seasons });
  expect(mergeGameTexts(current, texts)).toEqual({
    cards: { a: { name: 'A', effects: [] } },
    seasons: { 2026: { name: 'Coupe 2026' } },
    events: { '2026-r1': { name: 'Coupe 2026 — Manche 1' } },
  });
});
