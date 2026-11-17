const { anonClient } = require('../supabaseTestKit');
const { createSupabaseApi } = require('../../src/data/api/supabaseApi');

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

test('a first launch creates a guest and loads an empty player state', async () => {
  const api = createSupabaseApi({ client: anonClient(), storage: memoryStorage() });
  const state = await api.load();
  expect(state.player.name).toBe('Joueur');
  expect(state.collection).toMatchObject({ owned: {}, starterGiven: false });
  expect(state.picks).toEqual({});
  expect(await api.account()).toMatchObject({ isAnonymous: true });
});

test('renaming persists', async () => {
  const client = anonClient();
  const api = createSupabaseApi({ client, storage: memoryStorage() });
  await api.load();
  expect(await api.setName('Robin')).toEqual({ ok: true, patch: { player: { name: 'Robin' } } });
  expect((await api.load()).player.name).toBe('Robin');
});

test('the last state stays readable offline', async () => {
  const storage = memoryStorage();
  const client = anonClient();
  const api = createSupabaseApi({ client, storage });
  await api.load();
  const offlineClient = Object.create(client);
  offlineClient.from = () => {
    throw new Error('offline');
  };
  const offline = await createSupabaseApi({ client: offlineClient, storage }).load();
  expect(offline).toMatchObject({ offline: true, player: { name: 'Joueur' } });
});
