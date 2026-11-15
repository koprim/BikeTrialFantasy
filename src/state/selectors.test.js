const riders = require('../data/seed/riders.json');
const { groupByCategory } = require('../engine/team');
const { eventOutcome, seasonSummary } = require('./selectors');

const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
const ridersByCategory = groupByCategory(riders);
// Results in seed order: each category's rider #1 (uciRank 1, cote 1.0) finishes 1st.
const results = Object.fromEntries(Object.entries(ridersByCategory).map(([c, rs]) => [c, rs.map((r) => r.id)]));
const event = { id: 'e1', round: 1, dateFrom: '2026-11-08', dateTo: '2026-11-09', results };
const later = { ...event, id: 'e2', dateFrom: '2026-12-20', dateTo: '2026-12-21' };
const team = {
  senior26: ridersByCategory.SENIOR_26[0].id, junior26: ridersByCategory.JUNIOR_26[0].id,
  senior20: ridersByCategory.SENIOR_20[0].id, junior20: ridersByCategory.JUNIOR_20[0].id,
  eliteWomen1: ridersByCategory.ELITE_WOMEN[0].id, eliteWomen2: ridersByCategory.ELITE_WOMEN[1].id,
};
const ctx = (over = {}) => ({ picks: { e1: team }, playerName: 'Me', now: '2026-11-15', ridersById, ridersByCategory, ...over });

test('eventOutcome is null until the event is done', () => {
  expect(eventOutcome({ event, ...ctx({ now: '2026-11-09' }) })).toBeNull();
});

test('eventOutcome scores the saved team once done', () => {
  const o = eventOutcome({ event, ...ctx() });
  // 4 winners × 100 × 1.0 + women P1 100 × 1.0 + P2 80 × 1.3 = 604
  expect(o.player.total).toBe(604);
  expect(o.leaderboard.find((r) => r.isPlayer).name).toBe('Me');
  expect(o.leaderboard).toHaveLength(11);
});

test('eventOutcome scores 0 when no team was saved', () => {
  expect(eventOutcome({ event, ...ctx({ picks: {} }) }).player.total).toBe(0);
});

test('seasonSummary aggregates done events only', () => {
  const s = seasonSummary({ season: { events: [event, later] }, ...ctx() });
  expect(s.played).toBe(1);
  expect(s.score).toBe(604);
  expect(s.rank).toBeGreaterThanOrEqual(1);
  expect(s.standings).toHaveLength(11);
});

test('seasonSummary with nothing done has rank 0 and score 0', () => {
  const s = seasonSummary({ season: { events: [later] }, ...ctx() });
  expect(s).toEqual({ standings: [], rank: 0, score: 0, played: 0 });
});
