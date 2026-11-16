const {
  SEASONS, EVENTS_BY_ID, DEMO_PLAYER, RIDERS_BY_ID, CARDS, BALANCE, EDITION, ridersByCategory,
} = require('./index');
const { validateCatalog } = require('../engine/catalog');
const { TRIGGERS, REWARDS } = require('../engine/effects');

test('two yearly seasons: 2025 archived, 2026 current', () => {
  expect(SEASONS.map((s) => s.id)).toEqual(['2025', '2026']);
  expect(SEASONS[1].name).toBe('Coupe du Monde 2026');
  SEASONS.forEach((s) => expect(s.events).toHaveLength(4));
  expect(SEASONS[1].events.map((e) => e.dateFrom)).toEqual(['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20']);
  expect(SEASONS[1].events[0].dateTo).toBe('2026-10-19');
  expect(EVENTS_BY_ID['2026-r3']).toBeDefined();
});

test('ridersByCategory lists 8 active riders per category, legends excluded', () => {
  const byCat = ridersByCategory();
  Object.values(byCat).forEach((list) => {
    expect(list).toHaveLength(8);
    list.forEach((r) => expect(r.active).toBe(true));
  });
  const legends = Object.values(RIDERS_BY_ID).filter((r) => !r.active);
  expect(legends).toHaveLength(3);
});

test('every rider has a brand', () => {
  Object.values(RIDERS_BY_ID).forEach((r) => expect(typeof r.brand).toBe('string'));
});

test('results reference active riders, each with race stats', () => {
  Object.values(EVENTS_BY_ID).forEach((ev) => {
    Object.values(ev.results).forEach((order) => order.forEach((id) => {
      expect(RIDERS_BY_ID[id].active).toBe(true);
      expect(Array.isArray(ev.stats[id].techniques)).toBe(true);
      expect(ev.stats[id].cleanSections).toBeGreaterThanOrEqual(0);
      expect(ev.stats[id].cleanSections).toBeLessThanOrEqual(12);
    }));
  });
});

test('every event has a referee from the catalog', () => {
  const refereeNames = CARDS.filter((c) => c.type === 'REFEREE').map((c) => c.name);
  Object.values(EVENTS_BY_ID).forEach((ev) => expect(refereeNames).toContain(ev.referee));
});

test('the catalog is valid', () => {
  expect(validateCatalog(CARDS, RIDERS_BY_ID)).toEqual([]);
});

test('catalog v1 content', () => {
  const count = (type) => CARDS.filter((c) => c.type === type).length;
  expect(count('PILOT')).toBe(43);
  expect(count('TECHNIQUE')).toBe(8);
  expect(count('EQUIPMENT')).toBe(8);
  expect(count('REFEREE')).toBe(4);
  CARDS.forEach((c) => expect(c.edition).toBe(EDITION));
  expect(CARDS.some((c) => c.type === 'PILOT' && !c.rarities.includes('L'))).toBe(true);
  const triggers = new Set(CARDS.flatMap((c) => c.effects.map((e) => e.trigger.type)));
  const rewards = new Set(CARDS.flatMap((c) => c.effects.map((e) => e.reward.type)));
  TRIGGERS.forEach((t) => expect(triggers.has(t)).toBe(true));
  REWARDS.forEach((r) => expect(rewards.has(r)).toBe(true));
});

test('balance odds sum to 1', () => {
  const sum = Object.values(BALANCE.pack.odds).reduce((a, b) => a + b, 0);
  expect(sum).toBeCloseTo(1);
});

test('demo player has teams for the 6 finished events', () => {
  expect(Object.keys(DEMO_PLAYER.picks).sort()).toEqual(['2025-r1', '2025-r2', '2025-r3', '2025-r4', '2026-r1', '2026-r2']);
  expect(DEMO_PLAYER.name).toBe('Démo');
});
