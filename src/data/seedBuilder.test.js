const { parseCsv, buildRiders, buildSeason } = require('./seedBuilder');

const rankingsCsv = `category,uci_rank,name,country,points
SENIOR_26,1,Jack CARTHY,GBR,1250
SENIOR_26,40,Outsider GUY,FRA,300
ELITE_WOMEN,2,Top WOMAN,ESP,900`;

const resultsCsv = `event_id,category,position,name,country
tri-2026-wc-dole,SENIOR_26,1,Outsider GUY,FRA
tri-2026-wc-dole,SENIOR_26,2,Jack CARTHY,GBR
tri-2026-wc-dole,ELITE_WOMEN,1,Top WOMAN,ESP`;

const competitions = { competitions: [
  { id: 'tri-2026-wc-dole', name: 'UCI Trials World Cup', venue: 'Dole', country: 'FRA', dateFrom: '2026-05-08', round: 1, playable: true },
] };

test('parseCsv yields row objects', () => {
  const rows = parseCsv(rankingsCsv);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({ category: 'SENIOR_26', uci_rank: '1', name: 'Jack CARTHY', country: 'GBR' });
});

test('buildRiders derives ids and cotes', () => {
  const riders = buildRiders(parseCsv(rankingsCsv));
  const carthy = riders.find((r) => r.name === 'Jack CARTHY');
  expect(carthy).toMatchObject({ id: 'jack-carthy', category: 'SENIOR_26', uciRank: 1, cote: 1.0 });
  expect(riders.find((r) => r.name === 'Outsider GUY').cote).toBe(2.0);
});

test('buildSeason attaches ordered results to events', () => {
  const riders = buildRiders(parseCsv(rankingsCsv));
  const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
  const competitionsById = Object.fromEntries(competitions.competitions.map((c) => [c.id, c]));
  const season = buildSeason(parseCsv(resultsCsv), ridersById, competitionsById);
  expect(season).toHaveLength(1);
  expect(season[0].id).toBe('tri-2026-wc-dole');
  expect(season[0].results.SENIOR_26).toEqual(['outsider-guy', 'jack-carthy']);
  expect(season[0].results.ELITE_WOMEN).toEqual(['top-woman']);
});
