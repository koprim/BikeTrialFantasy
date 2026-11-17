const { computeEventOutcome, aggregateStandings } = require('./season');
const { groupByCategory } = require('./team');
const { createRivals } = require('./bots');

function mkRiders() {
  const riders = [];
  const cats = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];
  cats.forEach((c) => {
    for (let i = 1; i <= 6; i++) {
      const rank = i * 8;
      riders.push({
        id: `${c}-${i}`,
        name: `${c} ${i}`,
        category: c,
        uciRank: rank,
        cote: rank <= 10 ? 1.3 : rank <= 25 ? 1.6 : 2.0,
      });
    }
  });
  return riders;
}

const RIDERS = mkRiders();
const ridersById = Object.fromEntries(RIDERS.map((r) => [r.id, r]));
const byCat = groupByCategory(RIDERS);
const event = {
  id: 'e1',
  round: 1,
  results: Object.fromEntries(
    ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].map((c) => [c, byCat[c].map((r) => r.id)]),
  ),
};
const playerTeam = {
  senior26: 'SENIOR_26-1',
  junior26: 'JUNIOR_26-1',
  senior20: 'SENIOR_20-1',
  junior20: 'JUNIOR_20-1',
  eliteWomen1: 'ELITE_WOMEN-1',
  eliteWomen2: 'ELITE_WOMEN-2',
};
const cardsById = Object.fromEntries(
  RIDERS.map((r) => [
    `pilot-2026-${r.id}`,
    { id: `pilot-2026-${r.id}`, type: 'PILOT', name: r.name, subject: r.id, rarities: ['C'], effects: [] },
  ]),
);
const balance = { rarityMultiplier: { C: 1, R: 1.5, E: 2, L: 3 } };

test('computeEventOutcome returns player + sorted leaderboard with player row', () => {
  const rivals = createRivals();
  const out = computeEventOutcome({
    event,
    playerName: 'Me',
    playerTeam,
    rivals,
    ridersById,
    ridersByCategory: byCat,
    cardsById,
    balance,
    edition: '2026',
    seed: event.round,
  });
  expect(out.player.total).toBeGreaterThan(0);
  expect(out.leaderboard).toHaveLength(rivals.length + 1);
  for (let i = 1; i < out.leaderboard.length; i++) {
    expect(out.leaderboard[i - 1].score).toBeGreaterThanOrEqual(out.leaderboard[i].score);
  }
  expect(out.leaderboard.some((s) => s.isPlayer && s.name === 'Me')).toBe(true);
});

test('aggregateStandings sums scores across events by entrant', () => {
  const outcomes = [
    {
      leaderboard: [
        { entrantId: 'player', name: 'Me', isPlayer: true, score: 100 },
        { entrantId: 'rival-1', name: 'Bot', isPlayer: false, score: 80 },
      ],
    },
    {
      leaderboard: [
        { entrantId: 'player', name: 'Me', isPlayer: true, score: 50 },
        { entrantId: 'rival-1', name: 'Bot', isPlayer: false, score: 120 },
      ],
    },
  ];
  const table = aggregateStandings(outcomes);
  expect(table[0]).toMatchObject({ entrantId: 'rival-1', score: 200 });
  expect(table.find((t) => t.entrantId === 'player').score).toBe(150);
});
