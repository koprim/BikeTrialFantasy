const { makeClock } = require('./clock');

const lateEvening = () => new Date('2026-11-16T23:30:00Z');

test("today is the server's calendar day in the configured timezone", async () => {
  const clock = makeClock({ timeZone: 'Europe/Paris', now: lateEvening });
  expect(await clock.today()).toBe('2026-11-17');
  expect(clock.realToday()).toBe('2026-11-17');
});

test('the simulated date is used only when allowed', async () => {
  const readSimulatedDate = async () => '2026-12-01';
  expect(await makeClock({ timeZone: 'Europe/Paris', now: lateEvening, readSimulatedDate }).today()).toBe('2026-11-17');
  expect(
    await makeClock({ timeZone: 'Europe/Paris', now: lateEvening, readSimulatedDate, allowSimulated: true }).today(),
  ).toBe('2026-12-01');
});

test('a timezone is required', () => {
  expect(() => makeClock({})).toThrow('timeZone is required');
});
