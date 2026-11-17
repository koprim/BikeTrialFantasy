const { makeOpenDailyPack, makeOpenStarter } = require('./packs');
const { fakeCatalog, fakeClock, fakeWallets } = require('../../../test/fakes');

function setup() {
  const deps = { clock: fakeClock('2026-11-17'), catalog: fakeCatalog(), wallets: fakeWallets(), randomSeed: () => 42 };
  return { deps, openDailyPack: makeOpenDailyPack(deps), openStarter: makeOpenStarter(deps) };
}

describe('daily pack', () => {
  test('draws five cards dated with the server day and records the opening', async () => {
    const { deps, openDailyPack } = setup();
    const collection = await openDailyPack('u1');
    expect(collection.lastPack).toHaveLength(5);
    expect(collection.lastPackDate).toBe('2026-11-17');
    expect(deps.wallets.commits[0].opening).toEqual({
      kind: 'daily',
      packDate: '2026-11-17',
      cards: collection.lastPack,
    });
  });

  test('refuses a second pack the same day', async () => {
    const { deps, openDailyPack } = setup();
    await openDailyPack('u1');
    await expect(openDailyPack('u1')).rejects.toMatchObject({ code: 'ALREADY_OPENED' });
    expect(deps.wallets.commits).toHaveLength(1);
  });

  test('allows a new pack the next day', async () => {
    const { deps, openDailyPack } = setup();
    await openDailyPack('u1');
    deps.clock.day = '2026-11-18';
    expect((await openDailyPack('u1')).lastPack).toHaveLength(5);
  });

  test('reports a pack opened concurrently by another request', async () => {
    const { deps, openDailyPack } = setup();
    deps.wallets.openings.add('daily|2026-11-17');
    await expect(openDailyPack('u1')).rejects.toMatchObject({ code: 'ALREADY_OPENED' });
  });
});

describe('starter pack', () => {
  test('gives the starter commons once', async () => {
    const { openStarter } = setup();
    const collection = await openStarter('u1');
    expect(collection.starterGiven).toBe(true);
    expect(collection.lastPack.length).toBeGreaterThan(0);
    expect(collection.lastPack.every((card) => card.rarity === 'C')).toBe(true);
    await expect(openStarter('u1')).rejects.toMatchObject({ code: 'STARTER_ALREADY_OPENED' });
  });
});
