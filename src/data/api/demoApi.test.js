import { createDemoApi } from './demoApi';
import { DEMO_PLAYER, CARDS, BALANCE } from '../index';
import { countOf } from '../../engine/collection';
import { initialState } from '../../state/gameReducer';

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

const savedState = (overrides = {}) => ({
  ...initialState,
  player: { name: 'Zoé' },
  collection: { ...initialState.collection, lastPackDate: '2026-11-16' },
  ...overrides,
});

describe('actions before load()', () => {
  test('keep the saved data instead of overwriting it with demo state', async () => {
    const storage = memoryStorage(savedState());
    const api = createDemoApi({ storage });
    const result = await api.openDailyPack({ now: '2026-11-17' });
    expect(result.ok).toBe(true);
    expect(storage.saved.player.name).toBe('Zoé');
    expect(storage.saved.collection.lastPackDate).toBe('2026-11-17');
  });

  test('load() after an action returns the updated state instead of reloading', async () => {
    const api = createDemoApi({ storage: memoryStorage(savedState()) });
    await api.setName('Max');
    expect((await api.load()).player.name).toBe('Max');
    expect((await api.load()).player.name).toBe('Max');
  });

  test('reset works without a prior load()', async () => {
    const storage = memoryStorage(savedState());
    const api = createDemoApi({ storage });
    await api.reset();
    expect(storage.saved.player.name).toBe(DEMO_PLAYER.name);
  });
});

describe('a failing initial load', () => {
  test('is retried by the next call instead of being memoized', async () => {
    const storage = memoryStorage(savedState());
    const realLoad = storage.loadState.bind(storage);
    storage.loadState = async () => {
      storage.loadState = realLoad;
      throw new Error('read failed');
    };
    const api = createDemoApi({ storage });
    await expect(api.load()).rejects.toThrow('read failed');
    expect((await api.load()).player.name).toBe('Zoé');
  });
});

describe('storage failures', () => {
  const failingStorage = () => ({
    loadState: async () => null,
    saveState: async () => {
      throw new Error('disk full');
    },
  });

  test('resolve STORAGE_FAILED and leave the in-memory state untouched', async () => {
    const api = createDemoApi({ storage: failingStorage() });
    expect(await api.setName('Max')).toEqual({ ok: false, error: 'STORAGE_FAILED' });
    expect((await api.load()).player.name).toBe(DEMO_PLAYER.name);
  });

  test('reset also resolves STORAGE_FAILED', async () => {
    const api = createDemoApi({ storage: failingStorage() });
    expect(await api.reset()).toEqual({ ok: false, error: 'STORAGE_FAILED' });
  });
});

describe('profile and dev actions', () => {
  test('setName patches and persists the player', async () => {
    const storage = memoryStorage();
    const api = createDemoApi({ storage });
    const result = await api.setName('Max');
    expect(result).toEqual({ ok: true, patch: { player: { name: 'Max' } } });
    expect(storage.saved.player.name).toBe('Max');
  });

  test('setSimulatedDate patches the date and the collection', async () => {
    const api = createDemoApi({ storage: memoryStorage() });
    const result = await api.setSimulatedDate('2026-11-30');
    expect(result.ok).toBe(true);
    expect(result.patch.simulatedDate).toBe('2026-11-30');
    expect(result.patch.collection).toBeDefined();
    expect((await api.setSimulatedDate(null)).patch.simulatedDate).toBeNull();
  });

  test('reset returns the full initial state and persists it', async () => {
    const storage = memoryStorage(savedState());
    const api = createDemoApi({ storage });
    await api.setName('Max');
    const result = await api.reset();
    expect(result).toEqual({ ok: true, patch: initialState });
    expect(storage.saved).toEqual(initialState);
  });

  test('load hydrates a saved state, migrating legacy saves', async () => {
    const legacy = { player: { name: 'Old' }, picks: { '2026-27-e1': null }, simulatedDate: null };
    const api = createDemoApi({ storage: memoryStorage(legacy) });
    const state = await api.load();
    expect(state.player.name).toBe('Old');
    expect(state.collection).toBeDefined();
  });

  test('load ignores an unusable save', async () => {
    const api = createDemoApi({ storage: memoryStorage({ currentIndex: 3 }) });
    expect((await api.load()).player.name).toBe(DEMO_PLAYER.name);
  });
});

describe('concurrent actions', () => {
  const WRITE_LATENCY_TICKS = 10;

  // A device storage whose writes take several ticks, so both actions start before the first is persisted.
  function slowStorage(saved = null) {
    const storage = memoryStorage(saved);
    const write = storage.saveState.bind(storage);
    storage.saveState = async (state) => {
      for (let tick = 0; tick < WRITE_LATENCY_TICKS; tick++) await Promise.resolve();
      return write(state);
    };
    return storage;
  }

  test('open the daily pack only once', async () => {
    const api = createDemoApi({ storage: slowStorage() });
    const [first, second] = await Promise.all([
      api.openDailyPack({ now: '2026-11-17' }),
      api.openDailyPack({ now: '2026-11-17' }),
    ]);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: 'ALREADY_OPENED' });
  });

  test('apply each recycle on top of the previous one', async () => {
    const [card] = CARDS;
    const [rarity] = card.rarities;
    const collection = { ...initialState.collection, owned: { [card.id]: { [rarity]: 3 } }, fragments: 0 };
    const storage = slowStorage(savedState({ collection }));
    const api = createDemoApi({ storage });
    await Promise.all([api.recycle({ cardId: card.id, rarity }), api.recycle({ cardId: card.id, rarity })]);
    const expected = { count: 1, fragments: 2 * BALANCE.fragments.perDuplicate[rarity] };
    const { collection: final } = await api.load();
    expect({ count: countOf(final, card.id, rarity), fragments: final.fragments }).toEqual(expected);
    expect(countOf(storage.saved.collection, card.id, rarity)).toBe(1);
  });
});
