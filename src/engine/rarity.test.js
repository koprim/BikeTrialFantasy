const { RARITIES, RARITY_LABELS, rarityRank, atLeast } = require('./rarity');

test('four rarities in ascending order with French labels', () => {
  expect(RARITIES).toEqual(['C', 'R', 'E', 'L']);
  expect(RARITY_LABELS).toEqual({ C: 'Commune', R: 'Rare', E: 'Épique', L: 'Légendaire' });
});

test('rarityRank and atLeast', () => {
  expect(rarityRank('C')).toBe(0);
  expect(rarityRank('L')).toBe(3);
  expect(atLeast('E', 'R')).toBe(true);
  expect(atLeast('R', 'R')).toBe(true);
  expect(atLeast('C', 'R')).toBe(false);
});
