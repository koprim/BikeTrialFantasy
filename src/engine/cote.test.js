const { coteFromRank } = require('./cote');

describe('coteFromRank', () => {
  test('top 3 → 1.0', () => {
    expect(coteFromRank(1)).toBe(1.0);
    expect(coteFromRank(3)).toBe(1.0);
  });
  test('4–10 → 1.3', () => expect(coteFromRank(10)).toBe(1.3));
  test('11–25 → 1.6', () => expect(coteFromRank(25)).toBe(1.6));
  test('26–50 → 2.0', () => expect(coteFromRank(50)).toBe(2.0));
  test('beyond 50 → 2.5', () => expect(coteFromRank(51)).toBe(2.5));
  test('unranked/null → 2.5', () => expect(coteFromRank(null)).toBe(2.5));
});
