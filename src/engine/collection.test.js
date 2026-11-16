const {
  emptyCollection, countOf, openPack, canOpenDaily, openDailyPack, openStarter, recycle, craft, ownedRefs,
} = require('./collection');
const { makeRng } = require('./rng');
const { atLeast } = require('./rarity');
const { CARDS, CARDS_BY_ID, RIDERS_BY_ID, BALANCE } = require('../data/index');

const deps = { cards: CARDS, balance: BALANCE };
const allCommon = { ...BALANCE, pack: { ...BALANCE.pack, odds: { C: 1, R: 0, E: 0, L: 0 } } };

test('emptyCollection', () => {
  expect(emptyCollection()).toEqual({ owned: {}, fragments: 0, pity: { E: 0, L: 0 }, packsOpened: 0, lastPackDate: null, starterGiven: false, lastPack: [] });
});

test('a pack has 5 cards, at least one Rare, all added to the collection', () => {
  const col = openPack(emptyCollection(), deps, makeRng(7));
  expect(col.lastPack).toHaveLength(5);
  expect(col.lastPack.some((c) => atLeast(c.rarity, 'R'))).toBe(true);
  col.lastPack.forEach(({ cardId, rarity }) => {
    expect(CARDS_BY_ID[cardId].rarities).toContain(rarity);
    expect(countOf(col, cardId, rarity)).toBeGreaterThan(0);
  });
  expect(col.packsOpened).toBe(1);
});

test('same seed, same pack', () => {
  expect(openPack(emptyCollection(), deps, makeRng(3)).lastPack).toEqual(openPack(emptyCollection(), deps, makeRng(3)).lastPack);
});

test('pity counters grow without E/L and force an Épique on the 10th pack', () => {
  const d = { cards: CARDS, balance: allCommon };
  let col = emptyCollection();
  for (let i = 0; i < 9; i++) col = openPack(col, d, makeRng(i + 1));
  expect(col.pity).toEqual({ E: 9, L: 9 });
  col = openPack(col, d, makeRng(100));
  expect(col.lastPack.at(-1).rarity).toBe('E');
  expect(col.pity).toEqual({ E: 0, L: 10 });
});

test('pity forces a Légendaire on the 60th pack', () => {
  const col = openPack({ ...emptyCollection(), pity: { E: 0, L: 59 } }, { cards: CARDS, balance: allCommon }, makeRng(5));
  expect(col.lastPack.at(-1).rarity).toBe('L');
  expect(col.pity).toEqual({ E: 0, L: 0 });
});

test('isNew is false for a card already owned', () => {
  const first = openPack(emptyCollection(), deps, makeRng(11));
  const again = openPack({ ...first, lastPack: [] }, deps, makeRng(11));
  expect(again.lastPack.every((c) => !c.isNew)).toBe(true);
});

test('one daily pack per day, driven by the (simulated) date', () => {
  const col = emptyCollection();
  expect(canOpenDaily(col, '2026-11-16')).toBe(true);
  const opened = openDailyPack(col, '2026-11-16', deps);
  expect(opened.lastPackDate).toBe('2026-11-16');
  expect(canOpenDaily(opened, '2026-11-16')).toBe(false);
  expect(openDailyPack(opened, '2026-11-16', deps)).toBe(opened);
  expect(canOpenDaily(opened, '2026-11-17')).toBe(true);
});

test('starter: 6 Common pilots covering every slot, 3 techniques, 1 equipment, once', () => {
  const col = openStarter(emptyCollection(), { cards: CARDS, ridersById: RIDERS_BY_ID }, makeRng(1));
  expect(col.starterGiven).toBe(true);
  expect(col.lastPack).toHaveLength(10);
  col.lastPack.forEach((c) => expect(c.rarity).toBe('C'));
  const pilots = col.lastPack.map((c) => CARDS_BY_ID[c.cardId]).filter((c) => c.type === 'PILOT');
  const cats = pilots.map((c) => RIDERS_BY_ID[c.subject].category).sort();
  expect(cats).toEqual(['ELITE_WOMEN', 'ELITE_WOMEN', 'JUNIOR_20', 'JUNIOR_26', 'SENIOR_20', 'SENIOR_26']);
  pilots.forEach((c) => expect(RIDERS_BY_ID[c.subject].active).toBe(true));
  const types = col.lastPack.map((c) => CARDS_BY_ID[c.cardId].type);
  expect(types.filter((t) => t === 'TECHNIQUE')).toHaveLength(3);
  expect(types.filter((t) => t === 'EQUIPMENT')).toHaveLength(1);
  expect(openStarter(col, { cards: CARDS, ridersById: RIDERS_BY_ID }, makeRng(2))).toBe(col);
});

test('recycle turns a duplicate into fragments, never the last copy', () => {
  const col = { ...emptyCollection(), owned: { x: { R: 2 } } };
  const once = recycle(col, 'x', 'R', BALANCE);
  expect(once.owned.x.R).toBe(1);
  expect(once.fragments).toBe(BALANCE.fragments.perDuplicate.R);
  expect(recycle(once, 'x', 'R', BALANCE)).toBe(once);
});

test('craft spends fragments; refused without enough fragments or for a missing rarity', () => {
  const card = CARDS_BY_ID['technique-2026-gap'];
  const rich = { ...emptyCollection(), fragments: 500 };
  const crafted = craft(rich, card, 'R', BALANCE);
  expect(countOf(crafted, card.id, 'R')).toBe(1);
  expect(crafted.fragments).toBe(500 - BALANCE.fragments.craftCost.R);
  const poor = { ...emptyCollection(), fragments: 10 };
  expect(craft(poor, card, 'R', BALANCE)).toBe(poor);
  const noL = CARDS_BY_ID['technique-2026-pivot'];
  expect(craft(rich, noL, 'L', BALANCE)).toBe(rich);
});

test('ownedRefs lists owned card/rarity pairs matching a filter', () => {
  const col = { ...emptyCollection(), owned: { 'technique-2026-gap': { C: 2, R: 0 }, 'equipment-2026-alpha': { C: 1 } } };
  expect(ownedRefs(col, CARDS, (c) => c.type === 'TECHNIQUE').map(({ cardId, rarity, count }) => [cardId, rarity, count]))
    .toEqual([['technique-2026-gap', 'C', 2]]);
});

test('openDailyPack without a date does nothing', () => {
  const col = emptyCollection();
  expect(openDailyPack(col, null, deps)).toBe(col);
  expect(openDailyPack(col, undefined, deps)).toBe(col);
});

test('pack odds over 2000 packs match the balance (non-guaranteed slots) and every pack has a Rare+', () => {
  const rng = makeRng(42);
  const N = 2000;
  const counts = { C: 0, R: 0, E: 0, L: 0 };
  let col = emptyCollection();
  for (let i = 0; i < N; i++) {
    col = openPack(col, deps, rng);
    expect(col.lastPack.some((c) => atLeast(c.rarity, 'R'))).toBe(true);
    col.lastPack.slice(0, 4).forEach((c) => { counts[c.rarity] += 1; });
  }
  const odds = BALANCE.pack.odds;
  const total = N * 4;
  ['C', 'R', 'E'].forEach((r) => expect(Math.abs(counts[r] / total - odds[r])).toBeLessThanOrEqual(0.03));
  expect(Math.abs(counts.L / total - odds.L)).toBeLessThanOrEqual(0.01);
});
