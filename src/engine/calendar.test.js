const { today, eventStatus, seasonStatus, currentSeason } = require('./calendar');

const ev = { dateFrom: '2026-11-29', dateTo: '2026-11-30' };

test('eventStatus: open before dateFrom, live through dateTo, done after', () => {
  expect(eventStatus(ev, '2026-11-28')).toBe('open');
  expect(eventStatus(ev, '2026-11-29')).toBe('live');
  expect(eventStatus(ev, '2026-11-30')).toBe('live');
  expect(eventStatus(ev, '2026-12-01')).toBe('done');
});

test('eventStatus falls back to dateFrom when dateTo is missing', () => {
  expect(eventStatus({ dateFrom: '2026-05-08' }, '2026-05-08')).toBe('live');
  expect(eventStatus({ dateFrom: '2026-05-08' }, '2026-05-09')).toBe('done');
});

const s2025 = { id: '2025', events: [{ dateFrom: '2025-05-10', dateTo: '2025-05-11' }, { dateFrom: '2025-09-20', dateTo: '2025-09-21' }] };
const s2026 = { id: '2026-27', events: [{ dateFrom: '2026-10-18', dateTo: '2026-10-19' }, { dateFrom: '2026-12-20', dateTo: '2026-12-21' }] };
const s2027 = { id: '2027', events: [{ dateFrom: '2027-05-01', dateTo: '2027-05-02' }] };

test('seasonStatus', () => {
  expect(seasonStatus(s2025, '2026-11-15')).toBe('archived');
  expect(seasonStatus(s2026, '2026-11-15')).toBe('current');
  expect(seasonStatus(s2026, '2026-12-21')).toBe('current');
  expect(seasonStatus(s2026, '2026-12-22')).toBe('archived');
  expect(seasonStatus(s2027, '2026-11-15')).toBe('upcoming');
});

test('currentSeason: current, else next upcoming, else most recent', () => {
  expect(currentSeason([s2025, s2026, s2027], '2026-11-15').id).toBe('2026-27');
  expect(currentSeason([s2025, s2026, s2027], '2027-01-10').id).toBe('2027');
  expect(currentSeason([s2025, s2026], '2027-01-10').id).toBe('2026-27');
});

test('today formats a local date as YYYY-MM-DD', () => {
  expect(today(new Date(2026, 10, 5))).toBe('2026-11-05');
});
