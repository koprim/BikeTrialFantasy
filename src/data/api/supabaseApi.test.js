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

  describe('offline cache', () => {
    const session = { user: { id: GUEST_ID } };

    async function cacheFrom(onlineClient) {
      const storage = memoryStorage();
      const loaded = await createSupabaseApi({ client: onlineClient, storage }).load();
      return { storage, loaded };
    }
    const offlineApi = (storage, clientOptions = { session }) =>
      createSupabaseApi({ client: createFakeSupabaseClient({ ...clientOptions, offline: true }), storage });

    test('serves the cached state of the same user when the network is down', async () => {
      const { storage, loaded } = await cacheFrom(createFakeSupabaseClient());
      expect(await offlineApi(storage).load()).toEqual({ ...loaded, offline: true });
    });

    test('does not serve the cache of another user', async () => {
      const { storage } = await cacheFrom(createFakeSupabaseClient());
      const otherUser = { session: { user: { id: 'someone-else' } } };
      await expect(offlineApi(storage, otherUser).load()).rejects.toThrow('Failed to fetch');
    });

    test('does not serve the cache without a local session', async () => {
      const { storage } = await cacheFrom(createFakeSupabaseClient());
      await expect(offlineApi(storage, {}).load()).rejects.toThrow();
    });

    test('serves the cache when the expired session could not be refreshed offline', async () => {
      const { storage, loaded } = await cacheFrom(createFakeSupabaseClient());
      const client = createFakeSupabaseClient({ session, offline: true });
      client.expireSessionOffline();
      expect(await createSupabaseApi({ client, storage }).load()).toEqual({ ...loaded, offline: true });
    });

    test('a signed-out device (no session, no error) never serves the cache', async () => {
      const { storage } = await cacheFrom(createFakeSupabaseClient());
      await expect(offlineApi(storage, {}).load()).rejects.toThrow('Failed to fetch');
    });

    test('account() resolves null when the expired session cannot be refreshed offline', async () => {
      const client = createFakeSupabaseClient({ session, offline: true });
      client.expireSessionOffline();
      expect(await createSupabaseApi({ client, storage: memoryStorage() }).account()).toBeNull();
    });

    test('throws the network error when nothing is cached', async () => {
      await expect(offlineApi(memoryStorage()).load()).rejects.toThrow('Failed to fetch');
    });

    test('treats a corrupt cache as no cache', async () => {
      const storage = memoryStorage();
      await storage.setItem(CACHE_KEY, '{not json');
      await expect(offlineApi(storage).load()).rejects.toThrow('Failed to fetch');
    });

    test('ignores a cache written without a user id', async () => {
      const storage = memoryStorage();
      await storage.setItem(CACHE_KEY, JSON.stringify({ player: { name: 'Old' } }));
      await expect(offlineApi(storage).load()).rejects.toThrow('Failed to fetch');
    });

    test('a real read error propagates instead of serving the cache', async () => {
      const { storage } = await cacheFrom(createFakeSupabaseClient());
      const missingProfile = createFakeSupabaseClient({ session, tables: { profiles: [] } });
      await expect(createSupabaseApi({ client: missingProfile, storage }).load()).rejects.toMatchObject({
        code: 'PGRST116',
      });
    });

    test('a mapping failure propagates instead of serving the cache', async () => {
      const { storage } = await cacheFrom(createFakeSupabaseClient());
      const brokenRow = createFakeSupabaseClient({ session, tables: { profiles: [{ user_id: GUEST_ID }] } });
      brokenRow.from = () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }),
      });
      await expect(createSupabaseApi({ client: brokenRow, storage }).load()).rejects.toThrow(TypeError);
    });

    test('a failing cache write does not discard fresh data', async () => {
      const storage = memoryStorage();
      storage.setItem = async () => {
        throw new Error('quota exceeded');
      };
      const state = await createSupabaseApi({ client: createFakeSupabaseClient(), storage }).load();
      expect(state.player.name).toBe('Joueur');
      expect(state.offline).toBeUndefined();
    });
  });

  test('throws when the read fails and nothing is cached', async () => {
    const { api } = build({ offline: true });
    await expect(api.load()).rejects.toThrow();
  });

  test('writes the cache under its versioned key', async () => {
    const { api, storage } = build();
    await api.load();
    const cached = JSON.parse(await storage.getItem(CACHE_KEY));
    expect(cached.userId).toBe(GUEST_ID);
    expect(cached.state.player.name).toBe('Joueur');
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
    const { api } = build({ offline: true, functions: { 'open-starter': okFunction({ collection }) } });
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

  test('setName reports a network failure as NETWORK', async () => {
    const { api } = build({ session: { user: { id: GUEST_ID } }, offline: true });
    expect(await api.setName('Robin')).toEqual({ ok: false, error: 'NETWORK' });
  });

  test('setName resolves NETWORK when the guest sign-in cannot reach the server', async () => {
    const { api } = build({ offline: true });
    expect(await api.setName('Robin')).toEqual({ ok: false, error: 'NETWORK' });
  });

  test.each([
    ['row level security', '42501'],
    ['a check violation', '23514'],
  ])('setName maps %s to NOT_ALLOWED', async (_label, code) => {
    const { api, client } = build({ session: { user: { id: GUEST_ID } } });
    client.failUpdatesWith({ code, message: 'rejected' });
    expect(await api.setName('Robin')).toEqual({ ok: false, error: 'NOT_ALLOWED', details: 'rejected' });
  });

  test('setName maps other errors to INTERNAL with details', async () => {
    const { api, client } = build({ session: { user: { id: GUEST_ID } } });
    client.failUpdatesWith({ code: 'XX000', message: 'boom' });
    expect(await api.setName('Robin')).toEqual({ ok: false, error: 'INTERNAL', details: 'boom' });
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

  test('falls back to the local session user when the server is unreachable', async () => {
    const { api } = build({ session: { user }, offline: true });
    expect(await api.account()).toEqual({ isAnonymous: false, email: 'a@b.c', pendingEmail: 'n@b.c' });
  });

  test('is null when the server is unreachable and there is no local session', async () => {
    expect(await build({ offline: true }).api.account()).toBeNull();
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
