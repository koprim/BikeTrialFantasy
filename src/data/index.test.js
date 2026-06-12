const { RIDERS, SEASON, RIDERS_BY_ID, ridersByCategory } = require('./index');

test('seed loads riders for all 5 categories', () => {
  const byCat = ridersByCategory();
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].forEach((c) => {
    expect(byCat[c].length).toBeGreaterThanOrEqual(2);
  });
});
test('every event result id resolves to a known rider', () => {
  SEASON.forEach((ev) => {
    Object.values(ev.results).forEach((order) => {
      order.forEach((id) => expect(RIDERS_BY_ID[id]).toBeDefined());
    });
  });
});
test('season has at least one event', () => expect(SEASON.length).toBeGreaterThan(0));
