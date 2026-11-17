const { makeSetSimulatedDate } = require('./devDate');
const { emptyCollection } = require('../../engine/collection');
const { fakeClock, fakeSettings, fakeWallets } = require('../../../test/fakes');

function setup({ allowSimulated = true, lastPackDate = '2026-11-20' } = {}) {
  const deps = {
    allowSimulated,
    clock: fakeClock('2026-11-17'),
    settings: fakeSettings(),
    wallets: fakeWallets({ ...emptyCollection(), lastPackDate }),
  };
  return { deps, setSimulatedDate: makeSetSimulatedDate(deps) };
}

test('stores the simulated date and unlocks the daily pack when going back in time', async () => {
  const { deps, setSimulatedDate } = setup();
  const result = await setSimulatedDate('u1', { date: '2026-11-15' });
  expect(deps.settings.simulatedDate).toBe('2026-11-15');
  expect(result).toMatchObject({ simulatedDate: '2026-11-15', collection: { lastPackDate: '2026-11-14' } });
});

test('clearing the date goes back to the real day', async () => {
  const { deps, setSimulatedDate } = setup({ lastPackDate: '2026-11-10' });
  const result = await setSimulatedDate('u1', { date: null });
  expect(deps.settings.simulatedDate).toBeNull();
  expect(result.collection.lastPackDate).toBe('2026-11-10');
});

test('forbidden outside the dev project, and dates are validated', async () => {
  await expect(setup({ allowSimulated: false }).setSimulatedDate('u1', { date: '2026-11-15' })).rejects.toMatchObject({
    code: 'FORBIDDEN',
  });
  await expect(setup().setSimulatedDate('u1', { date: '15/11/2026' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});

test('an impossible calendar date is rejected', async () => {
  const { deps, setSimulatedDate } = setup();
  await expect(setSimulatedDate('u1', { date: '2026-13-45' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  await expect(setSimulatedDate('u1', { date: '2026-02-30' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(deps.settings.simulatedDate).toBeNull();
});
