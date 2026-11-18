const { serviceClient, newPlayer } = require('../supabaseTestKit');
const {
  makeCatalog,
  makeWallets,
  makeCompetitions,
  makeTeams,
  makeSettings,
  makeAuthenticator,
} = require('../../src/backend/supabase/adapters');
const { buildServer } = require('../../src/backend/server');
const { makeClock } = require('../../src/backend/clock');
const { makeOpenDailyPack } = require('../../src/backend/usecases/packs');
const { makeSaveTeam } = require('../../src/backend/usecases/teams');
const { emptyCollection } = require('../../src/engine/collection');
const cards = require('../../src/data/seed/cards.json');
const demoPlayer = require('../../src/data/seed/demoPlayer.json');

const db = serviceClient();
const wallets = makeWallets(db);
const catalog = makeCatalog(db);
const settings = makeSettings(db);
const clockAt = (iso) => makeClock({ timeZone: 'Europe/Paris', now: () => new Date(iso) });
const SIMULATED_DATE_KEY = 'simulated_date';

let originalSimulatedDate;
beforeAll(async () => {
  originalSimulatedDate = await settings.getSimulatedDate();
});
afterAll(async () => {
  await settings.setSimulatedDate(originalSimulatedDate);
});

test('the catalog is read from Postgres', async () => {
  const loaded = await catalog.load();
  expect(loaded.cards).toHaveLength(cards.length);
  expect(loaded.balance.pack.size).toBe(5);
  expect(Object.keys(loaded.ridersById).length).toBeGreaterThan(0);
});

test('a daily pack is persisted once per day', async () => {
  const { userId } = await newPlayer();
  let seed = 0;
  const openDailyPack = makeOpenDailyPack({
    clock: clockAt('2026-11-17T10:00:00Z'),
    catalog,
    wallets,
    randomSeed: () => (seed += 1),
  });
  const collection = await openDailyPack(userId);
  const { data: owned, error } = await db.from('owned_cards').select('count').eq('user_id', userId);
  expect(error).toBeNull();
  expect(owned.reduce((sum, row) => sum + row.count, 0)).toBe(5);
  expect((await wallets.load(userId)).collection).toMatchObject({
    lastPackDate: '2026-11-17',
    packsOpened: 1,
    owned: collection.owned,
  });
  await expect(openDailyPack(userId)).rejects.toMatchObject({ code: 'ALREADY_OPENED' });
});

test('a valid team is saved for an open competition', async () => {
  const { userId } = await newPlayer();
  const before = (await wallets.load(userId)).collection;
  const outcome = await wallets.commit(userId, {
    expectedVersion: 0,
    before,
    after: { ...emptyCollection(), owned: demoPlayer.collection.owned },
    opening: null,
  });
  expect(outcome).toBe('ok');
  const team = Object.values(demoPlayer.picks)[0];
  const saveTeam = makeSaveTeam({
    clock: clockAt('2026-10-01T10:00:00Z'),
    catalog,
    wallets,
    competitions: makeCompetitions(db),
    teams: makeTeams(db),
  });
  await saveTeam(userId, { competitionId: '2026-r1', team });
  const { data, error } = await db
    .from('teams')
    .select('team')
    .eq('user_id', userId)
    .eq('competition_id', '2026-r1')
    .single();
  expect(error).toBeNull();
  expect(data.team).toEqual(team);
});

test('an unknown competition is null', async () => {
  expect(await makeCompetitions(db).get('nope')).toBeNull();
});

test('an insufficient-cards commit rejects with the Postgres error code', async () => {
  const { userId } = await newPlayer();
  const before = (await wallets.load(userId)).collection;
  const after = { ...before, owned: { [cards[0].id]: { [cards[0].rarities[0]]: -1 } } };
  await expect(wallets.commit(userId, { expectedVersion: 0, before, after, opening: null })).rejects.toMatchObject({
    code: 'P0001',
  });
});

test('the simulated date can be set, read and cleared', async () => {
  const original = await settings.getSimulatedDate();
  try {
    await settings.setSimulatedDate('2026-12-24');
    expect(await settings.getSimulatedDate()).toBe('2026-12-24');
    await settings.setSimulatedDate('2026-12-25');
    expect(await settings.getSimulatedDate()).toBe('2026-12-25');
    await settings.setSimulatedDate(null);
    expect(await settings.getSimulatedDate()).toBeNull();
    const { data, error } = await db.from('app_settings').select('key').eq('key', SIMULATED_DATE_KEY);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  } finally {
    await settings.setSimulatedDate(original);
  }
});

test('buildServer refuses a missing randomSeed', () => {
  expect(() => buildServer({ db, env: { PACK_TIMEZONE: 'Europe/Paris' } })).toThrow(/randomSeed/);
});

test('the authenticator resolves the user from the bearer token', async () => {
  const { userId, accessToken } = await newPlayer();
  const authenticate = makeAuthenticator(db);
  const request = (token) =>
    new Request('http://edge/fn', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
  expect(await authenticate(request(accessToken))).toBe(userId);
  await expect(authenticate(request('bad'))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  await expect(authenticate(request())).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
});

test('buildServer exposes one handler per action without touching the network', () => {
  const server = buildServer({
    db,
    env: { PACK_TIMEZONE: 'Europe/Paris', ALLOW_SIMULATED_DATE: 'false' },
    randomSeed: () => 1,
  });
  expect(Object.keys(server).sort()).toEqual([
    'craft',
    'open-daily-pack',
    'open-starter',
    'recycle',
    'save-team',
    'set-simulated-date',
  ]);
  Object.values(server).forEach((handler) => expect(typeof handler).toBe('function'));
});
