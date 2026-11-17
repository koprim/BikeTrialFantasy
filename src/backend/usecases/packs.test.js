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

  test('increments the pack count', async () => {
    const { openDailyPack } = setup();
    expect((await openDailyPack('u1')).packsOpened).toBe(1);
  });

  test('draws with the injected randomness: same seed, same pack; another seed, another pack', async () => {
    const packFor = async (seed) => {
      const { deps } = setup();
      return makeOpenDailyPack({ ...deps, randomSeed: () => seed })('u1').then((collection) => collection.lastPack);
    };
    expect(await packFor(1)).toEqual(await packFor(1));
    expect(await packFor(1)).not.toEqual(await packFor(2));
  });

  test('retries after a version conflict and still opens the pack', async () => {
    const { deps, openDailyPack } = setup();
    deps.wallets.conflictsToSimulate = 1;
    const collection = await openDailyPack('u1');
    expect(collection.lastPack).toHaveLength(5);
    expect(deps.wallets.commits).toHaveLength(1);
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

  test('records an opening of kind starter with the server day', async () => {
    const { deps, openStarter } = setup();
    await openStarter('u1');
    expect(deps.wallets.commits[0].opening).toMatchObject({ kind: 'starter', packDate: '2026-11-17' });
  });

  test('refuses when a starter opening was recorded concurrently', async () => {
    const { deps, openStarter } = setup();
    deps.wallets.openings.add('starter');
    await expect(openStarter('u1')).rejects.toMatchObject({ code: 'STARTER_ALREADY_OPENED' });
    expect(deps.wallets.commits).toHaveLength(0);
  });
});
