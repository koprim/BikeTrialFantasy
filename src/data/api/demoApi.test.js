import { createDemoApi } from './demoApi';
import { DEMO_PLAYER } from '../index';

function memoryStorage(saved = null) {
  return {
    saved,
    async loadState() {
      return this.saved;
    },
    async saveState(state) {
      this.saved = state;
    },
  };
}

test('loads the demo player when nothing is saved', async () => {
  const api = createDemoApi({ storage: memoryStorage() });
  const state = await api.load();
  expect(state.player.name).toBe(DEMO_PLAYER.name);
});

test('opens the daily pack once per day and persists it', async () => {
  const storage = memoryStorage();
  const api = createDemoApi({ storage });
  await api.load();
  const first = await api.openDailyPack({ now: '2026-11-17' });
  expect(first.ok).toBe(true);
  expect(first.patch.collection.lastPack).toHaveLength(5);
  expect(storage.saved.collection.lastPackDate).toBe('2026-11-17');
  expect(await api.openDailyPack({ now: '2026-11-17' })).toEqual({ ok: false, error: 'ALREADY_OPENED' });
});

test('a refused team is reported, not silently dropped', async () => {
  const api = createDemoApi({ storage: memoryStorage() });
  await api.load();
  expect(await api.saveTeam({ eventId: 'nope', team: { slots: {} }, now: '2026-11-17' })).toEqual({
    ok: false,
    error: 'NOT_ALLOWED',
  });
});

test('demo mode exposes the dev features but no account', async () => {
  const api = createDemoApi({ storage: memoryStorage() });
  expect(api.features).toEqual({ simulatedDate: true, reset: true, account: false });
  expect(await api.saveAccount('a@b.c')).toEqual({ ok: false, error: 'NOT_AVAILABLE' });
});
