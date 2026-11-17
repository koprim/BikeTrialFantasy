const { createSupabaseApi } = require('./supabaseApi');
const { createFakeSupabaseClient, httpError, GUEST_ID } = require('../../../test/fakeSupabaseClient');

const CACHE_KEY = 'sfbt:supabase-cache:v1';

function memoryStorage() {
  const items = {};
  return {
    async getItem(key) {
      return items[key] ?? null;
    },
    async setItem(key, value) {
      items[key] = value;
    },
  };
}

const collection = { fragments: 5 };
const okFunction = (payload) => async () => ({ data: payload, error: null });
const failingFunction = (code, details) => async () => ({ data: null, error: httpError(code, details) });
const build = (clientOptions, apiOptions) => {
  const client = createFakeSupabaseClient(clientOptions);
  const storage = memoryStorage();
  return { client, storage, api: createSupabaseApi({ client, storage, ...apiOptions }) };
};

describe('load', () => {
  test('a first launch signs in anonymously and maps rows to the player state', async () => {
    const { api, client } = build({
      tables: {
        owned_cards: [{ user_id: GUEST_ID, card_id: 'c1', rarity: 'C', count: 2 }],
        teams: [{ user_id: GUEST_ID, competition_id: 'e1', team: { riders: ['r1'] } }],
        app_settings: [{ key: 'simulated_date', value: '2026-01-02' }],
      },
    });
    const state = await api.load();
    expect(client.calls.anonymousSignIns).toBe(1);
    expect(state.player.name).toBe('Joueur');
    expect(state.picks).toEqual({ e1: { riders: ['r1'] } });
    expect(state.collection.owned).toEqual({ c1: { C: 2 } });
    expect(state.collection.starterGiven).toBe(false);
    expect(state.simulatedDate).toBeNull();
  });

  test('exposes the simulated date only when allowed', async () => {
    const tables = { app_settings: [{ key: 'simulated_date', value: '2026-01-02' }] };
    const { api } = build({ tables }, { allowSimulatedDate: true });
    expect((await api.load()).simulatedDate).toBe('2026-01-02');
  });

  test('reuses an existing session', async () => {
    const { api, client } = build({ session: { user: { id: GUEST_ID } } });
    await api.load();
    expect(client.calls.anonymousSignIns).toBe(0);
  });

  test('caches the state and serves it offline when the read fails', async () => {
    const storage = memoryStorage();
    const online = createSupabaseApi({ client: createFakeSupabaseClient(), storage });
    const loaded = await online.load();
    const offlineClient = createFakeSupabaseClient({ failReads: true });
    const offline = await createSupabaseApi({ client: offlineClient, storage }).load();
    expect(offline).toEqual({ ...loaded, offline: true });
  });

  test('throws when the read fails and nothing is cached', async () => {
    const { api } = build({ failReads: true });
    await expect(api.load()).rejects.toThrow('offline');
  });

  test('writes the cache under its versioned key', async () => {
    const { api, storage } = build();
    await api.load();
    expect(JSON.parse(await storage.getItem(CACHE_KEY)).player.name).toBe('Joueur');
  });
});

describe('collection actions', () => {
  test.each([
    ['openStarter', 'open-starter'],
    ['openDailyPack', 'open-daily-pack'],
    ['recycle', 'recycle'],
    ['craft', 'craft'],
  ])('%s returns the collection patch', async (method, functionName) => {
    const { api, client } = build({ functions: { [functionName]: okFunction({ collection }) } });
    expect(await api[method]({ cardId: 'c1', rarity: 'C' })).toEqual({ ok: true, patch: { collection } });
    expect(client.calls.invocations[0].name).toBe(functionName);
  });

  test('a function error maps to its code and details', async () => {
    const { api } = build({ functions: { 'open-starter': failingFunction('STARTER_ALREADY_OPENED', { a: 1 }) } });
    expect(await api.openStarter()).toEqual({ ok: false, error: 'STARTER_ALREADY_OPENED', details: { a: 1 } });
  });

  test('a network error without a JSON body maps to NETWORK', async () => {
    const { api } = build();
    expect(await api.openStarter()).toMatchObject({ ok: false, error: 'NETWORK' });
  });
});

describe('saveTeam', () => {
  test('sends the competition and returns a patch merging into the picks', async () => {
    const team = { riders: ['r1'] };
    const { api, client } = build({ functions: { 'save-team': okFunction({ team }) } });
    const result = await api.saveTeam({ eventId: 'e1', team, now: 'ignored' });
    expect(client.calls.invocations[0].body).toEqual({ competitionId: 'e1', team });
    expect(result.patch({ picks: { e0: { riders: [] } } })).toEqual({ picks: { e0: { riders: [] }, e1: team } });
  });

  test('propagates a function error', async () => {
    const { api } = build({ functions: { 'save-team': failingFunction('LOCKED') } });
    expect(await api.saveTeam({ eventId: 'e1', team: {} })).toMatchObject({ ok: false, error: 'LOCKED' });
  });
});

describe('profile and simulated date', () => {
  test('setName updates the profile', async () => {
    const { api, client } = build({ session: { user: { id: GUEST_ID } } });
    expect(await api.setName('Robin')).toEqual({ ok: true, patch: { player: { name: 'Robin' } } });
    expect(client.calls.updates[0]).toMatchObject({ table: 'profiles', values: { display_name: 'Robin' } });
  });

  test('setName reports a failed update as NETWORK', async () => {
    const { api } = build({ failReads: true });
    expect(await api.setName('Robin')).toEqual({ ok: false, error: 'NETWORK' });
  });

  test('setSimulatedDate returns the date and the collection', async () => {
    const payload = { simulatedDate: '2026-02-01', collection };
    const { api, client } = build({ functions: { 'set-simulated-date': okFunction(payload) } });
    expect(await api.setSimulatedDate('2026-02-01')).toEqual({ ok: true, patch: payload });
    expect(client.calls.invocations[0].body).toEqual({ date: '2026-02-01' });
  });
});

describe('features and unsupported actions', () => {
  test('features follow allowSimulatedDate', () => {
    expect(build({}, { allowSimulatedDate: true }).api.features).toEqual({
      simulatedDate: true,
      reset: false,
      account: true,
    });
  });

  test('reset is not available', async () => {
    expect(await build().api.reset()).toEqual({ ok: false, error: 'NOT_AVAILABLE' });
  });
});

describe('account', () => {
  const user = { id: GUEST_ID, is_anonymous: false, email: 'a@b.c', new_email: 'n@b.c' };

  test('maps the auth user', async () => {
    const { api } = build({ session: { user } });
    expect(await api.account()).toEqual({ isAnonymous: false, email: 'a@b.c', pendingEmail: 'n@b.c' });
  });

  test('is null without a user', async () => {
    expect(await build().api.account()).toBeNull();
  });

  test('saveAccount requests an email update with a redirect', async () => {
    const { api, client } = build({ session: { user } }, { emailRedirectTo: 'https://app' });
    expect(await api.saveAccount('x@y.z')).toEqual({ ok: true, patch: {} });
    expect(client.calls.updateUser[0]).toEqual({
      attributes: { email: 'x@y.z' },
      options: { emailRedirectTo: 'https://app' },
    });
  });

  test('saveAccount maps failures', async () => {
    const { api, client } = build({ session: { user } });
    client.failAuthWith('taken');
    expect(await api.saveAccount('x@y.z')).toEqual({ ok: false, error: 'ACCOUNT_SAVE_FAILED', details: 'taken' });
  });

  test('signIn sends a magic link without creating users', async () => {
    const { api, client } = build({}, { emailRedirectTo: 'https://app' });
    expect(await api.signIn('x@y.z')).toEqual({ ok: true, patch: {} });
    expect(client.calls.signInWithOtp[0]).toEqual({
      email: 'x@y.z',
      options: { shouldCreateUser: false, emailRedirectTo: 'https://app' },
    });
  });

  test('signIn maps failures', async () => {
    const { api, client } = build();
    client.failAuthWith('nope');
    expect(await api.signIn('x@y.z')).toEqual({ ok: false, error: 'SIGN_IN_FAILED', details: 'nope' });
  });
});
