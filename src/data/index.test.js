const { SEASONS, EVENTS_BY_ID, DEMO_PLAYER, RIDERS_BY_ID, ridersByCategory } = require('./index');
const { validateTeam } = require('../engine/team');

test('seed loads riders for all 5 categories', () => {
  const byCat = ridersByCategory();
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].forEach((c) => {
    expect(byCat[c].length).toBeGreaterThanOrEqual(2);
  });
});

test('seed has the 2025 archived season and the 2026-27 current season', () => {
  expect(SEASONS.map((s) => s.id)).toEqual(['2025', '2026-27']);
  SEASONS.forEach((s) => expect(s.events).toHaveLength(4));
  expect(SEASONS[1].events.map((e) => e.dateFrom)).toEqual(['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20']);
  expect(SEASONS[1].events[0].dateTo).toBe('2026-10-19');
});

test('every event result id resolves to a known rider', () => {
  Object.values(EVENTS_BY_ID).forEach((ev) => {
    Object.values(ev.results).forEach((order) => {
      order.forEach((id) => expect(RIDERS_BY_ID[id]).toBeDefined());
    });
  });
});

test('demo player has valid teams for the 6 past events only', () => {
  const ids = Object.keys(DEMO_PLAYER.picks).sort();
  expect(ids).toEqual(['2025-r1', '2025-r2', '2025-r3', '2025-r4', '2026-27-r1', '2026-27-r2']);
  ids.forEach((id) => expect(validateTeam(DEMO_PLAYER.picks[id], RIDERS_BY_ID).valid).toBe(true));
  expect(DEMO_PLAYER.name).toBe('Démo');
});
