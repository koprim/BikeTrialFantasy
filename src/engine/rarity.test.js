const { RARITIES, rarityRank, atLeast } = require('./rarity');

test('four rarities in ascending order', () => {
  expect(RARITIES).toEqual(['C', 'R', 'E', 'L']);
});

test('rarityRank and atLeast', () => {
  expect(rarityRank('C')).toBe(0);
  expect(rarityRank('L')).toBe(3);
  expect(atLeast('E', 'R')).toBe(true);
  expect(atLeast('R', 'R')).toBe(true);
  expect(atLeast('C', 'R')).toBe(false);
});

test('the engine only knows rarity codes', () => {
  expect(require('./rarity')).not.toHaveProperty('RARITY_LABELS');
});
