const { generateBotTeam, createRivals } = require('./bots');
const { makeRng } = require('./rng');
const { validateRiderTeam, groupByCategory } = require('./team');

function mkRiders() {
  const riders = [];
  const cats = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];
  cats.forEach((c) => {
    for (let i = 1; i <= 6; i++) {
      const rank = i * 8;
      riders.push({ id: `${c}-${i}`, name: `${c} ${i}`, country: 'FRA', category: c, uciRank: rank, cote: rank <= 10 ? 1.3 : rank <= 25 ? 1.6 : 2.0 });
    }
  });
  return riders;
}

describe('generateBotTeam', () => {
  const riders = mkRiders();
  const byCat = groupByCategory(riders);
  const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));

  test.each(['FAVORIS', 'EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'])('%s produces a valid team', (strategy) => {
    const team = generateBotTeam(strategy, byCat, makeRng(1));
    expect(validateRiderTeam(team, ridersById).valid).toBe(true);
  });

  test('FAVORIS picks best-ranked per category', () => {
    const team = generateBotTeam('FAVORIS', byCat, makeRng(1));
    expect(ridersById[team.senior26].uciRank).toBe(8);
  });

  test('OUTSIDER picks worst-ranked (highest cote) per category', () => {
    const team = generateBotTeam('OUTSIDER', byCat, makeRng(1));
    expect(ridersById[team.senior26].uciRank).toBe(48);
  });

  test('ALEATOIRE deterministic for a seed', () => {
    const t1 = generateBotTeam('ALEATOIRE', byCat, makeRng(99));
    const t2 = generateBotTeam('ALEATOIRE', byCat, makeRng(99));
    expect(t1).toEqual(t2);
  });
});

describe('createRivals', () => {
  test('returns 10 rivals with valid strategies', () => {
    const rivals = createRivals();
    expect(rivals).toHaveLength(10);
    const strategies = new Set(rivals.map((r) => r.strategy));
    ['FAVORIS', 'EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'].forEach((s) => expect(strategies.has(s)).toBe(true));
    expect(new Set(rivals.map((r) => r.id)).size).toBe(10);
  });
});
