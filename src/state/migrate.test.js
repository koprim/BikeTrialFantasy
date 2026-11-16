const { migrateSave } = require('./migrate');

const demoCollection = { owned: { 'technique-2026-gap': { C: 1 } }, fragments: 0, pity: { E: 0, L: 0 }, packsOpened: 0, lastPackDate: null, starterGiven: false, lastPack: [] };
const opts = { edition: '2026', demoCollection };
const riderTeam = { senior26: 'senior-26-1', junior26: 'junior-26-1', senior20: 'senior-20-1', junior20: 'junior-20-1', eliteWomen1: 'elite-women-1', eliteWomen2: 'elite-women-2' };

test('old linear saves and saves without picks are dropped', () => {
  expect(migrateSave({ currentIndex: 2, picks: {} }, opts)).toBeNull();
  expect(migrateSave({ player: { name: 'x' } }, opts)).toBeNull();
  expect(migrateSave(null, opts)).toBeNull();
});

test('renames 2026-27 event ids and converts rider teams to Common pilot cards', () => {
  const out = migrateSave({ player: { name: 'Z' }, picks: { '2026-27-r1': riderTeam, '2025-r1': riderTeam }, simulatedDate: null }, opts);
  expect(Object.keys(out.picks).sort()).toEqual(['2025-r1', '2026-r1']);
  expect(out.picks['2026-r1'].slots.senior26).toEqual({ cardId: 'pilot-2026-senior-26-1', rarity: 'C', techniques: [] });
});

test('a save without collection gets the demo collection plus every pilot it used', () => {
  const out = migrateSave({ player: { name: 'Z' }, picks: { '2025-r1': riderTeam } }, opts);
  expect(out.collection.owned['technique-2026-gap']).toEqual({ C: 1 });
  expect(out.collection.owned['pilot-2026-elite-women-2']).toEqual({ C: 1 });
  expect(demoCollection.owned['pilot-2026-elite-women-2']).toBeUndefined(); // not mutated
});

test('a complete saved collection keeps its values', () => {
  const collection = { ...demoCollection, fragments: 99 };
  expect(migrateSave({ picks: {}, collection }, opts).collection).toEqual(collection);
});

test('null teams in picks are skipped', () => {
  const out = migrateSave({ picks: { '2025-r1': null, '2025-r2': riderTeam }, collection: demoCollection }, opts);
  expect(Object.keys(out.picks)).toEqual(['2025-r2']);
});

test('a partial saved collection is merged over the defaults', () => {
  const out = migrateSave({ picks: {}, collection: { owned: { x: { C: 1 } }, fragments: 7 } }, opts);
  expect(out.collection.owned).toEqual({ x: { C: 1 } });
  expect(out.collection.fragments).toBe(7);
  expect(out.collection.packsOpened).toBe(0);
  expect(out.collection.pity).toEqual({ E: 0, L: 0 });
  expect(out.collection.lastPack).toEqual([]);
});
