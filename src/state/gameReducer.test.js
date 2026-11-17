const { gameReducer, initialState } = require('./GameContext');

test('initial state is the demo player with real time', () => {
  expect(initialState.player).toEqual({ name: 'Démo' });
  expect(Object.keys(initialState.picks)).toHaveLength(6);
  expect(initialState.simulatedDate).toBeNull();
  expect(initialState.collection.starterGiven).toBe(false);
});

const { DEMO_PLAYER } = require('../data/index');
const validTeam = DEMO_PLAYER.picks['2026-r1']; // owned by the demo collection

test('SAVE_TEAM stores an owned, valid team while the event is open', () => {
  const s = gameReducer(initialState, {
    type: 'SAVE_TEAM',
    payload: { eventId: '2026-r3', team: validTeam, now: '2026-11-15' },
  });
  expect(s.picks['2026-r3']).toEqual(validTeam);
});

test('SAVE_TEAM is ignored when locked, unknown or invalid', () => {
  const save = (payload) => gameReducer(initialState, { type: 'SAVE_TEAM', payload });
  expect(save({ eventId: '2026-r3', team: validTeam, now: '2026-11-29' })).toBe(initialState);
  expect(save({ eventId: 'nope', team: validTeam, now: '2026-11-15' })).toBe(initialState);
  expect(save({ eventId: '2026-r3', team: { slots: {}, equipment: [], referee: null }, now: '2026-11-15' })).toBe(
    initialState,
  );
});

test('SET_NAME and SET_SIMULATED_DATE', () => {
  const named = gameReducer(initialState, { type: 'SET_NAME', payload: { name: 'Zoé' } });
  expect(named.player).toEqual({ name: 'Zoé' });
  const dated = gameReducer(named, { type: 'SET_SIMULATED_DATE', payload: { date: '2026-11-30' } });
  expect(dated.simulatedDate).toBe('2026-11-30');
  expect(gameReducer(dated, { type: 'SET_SIMULATED_DATE', payload: { date: null } }).simulatedDate).toBeNull();
});

test('RESET returns to the demo state', () => {
  const dirty = { player: { name: 'X' }, picks: {}, simulatedDate: '2030-01-01' };
  expect(gameReducer(dirty, { type: 'RESET' })).toBe(initialState);
});

test('HYDRATE migrates a saved state but ignores the old linear format', () => {
  const saved = { player: { name: 'Z' }, picks: {}, simulatedDate: '2026-11-15', collection: initialState.collection };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: saved })).toEqual(saved);
  const old = { player: { name: 'Old' }, season: [], currentIndex: 2, picks: {}, outcomes: {} };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: old })).toBe(initialState);
});

const { countOf } = require('../engine/collection');

test('OPEN_STARTER gives 10 Common cards once', () => {
  const s = gameReducer(initialState, { type: 'OPEN_STARTER' });
  expect(s.collection.starterGiven).toBe(true);
  expect(s.collection.lastPack).toHaveLength(10);
  expect(gameReducer(s, { type: 'OPEN_STARTER' })).toBe(s);
});

test('OPEN_DAILY_PACK opens one pack per day', () => {
  const s = gameReducer(initialState, { type: 'OPEN_DAILY_PACK', payload: { now: '2026-11-16' } });
  expect(s.collection.lastPack).toHaveLength(5);
  expect(s.collection.lastPackDate).toBe('2026-11-16');
  expect(gameReducer(s, { type: 'OPEN_DAILY_PACK', payload: { now: '2026-11-16' } })).toBe(s);
});

test('RECYCLE and CRAFT', () => {
  const withDup = {
    ...initialState,
    collection: { ...initialState.collection, owned: { 'technique-2026-gap': { C: 2 } }, fragments: 200 },
  };
  const recycled = gameReducer(withDup, { type: 'RECYCLE', payload: { cardId: 'technique-2026-gap', rarity: 'C' } });
  expect(recycled.collection.owned['technique-2026-gap'].C).toBe(1);
  expect(recycled.collection.fragments).toBe(205);
  const crafted = gameReducer(recycled, { type: 'CRAFT', payload: { cardId: 'technique-2026-gap', rarity: 'R' } });
  expect(countOf(crafted.collection, 'technique-2026-gap', 'R')).toBe(1);
  expect(crafted.collection.fragments).toBe(85);
  expect(gameReducer(crafted, { type: 'CRAFT', payload: { cardId: 'technique-2026-gap', rarity: 'E' } })).toBe(crafted);
});

test('setting the simulated date back lets the daily pack be opened again', () => {
  const opened = gameReducer(initialState, { type: 'OPEN_DAILY_PACK', payload: { now: '2027-03-01' } });
  expect(opened.collection.lastPackDate).toBe('2027-03-01');
  const back = gameReducer(opened, { type: 'SET_SIMULATED_DATE', payload: { date: '2026-11-16' } });
  expect(back.collection.lastPackDate).toBe('2026-11-15');
  const again = gameReducer(back, { type: 'OPEN_DAILY_PACK', payload: { now: '2026-11-16' } });
  expect(again.collection.lastPackDate).toBe('2026-11-16');
  expect(again.collection.packsOpened).toBe(opened.collection.packsOpened + 1);
  // moving forward leaves lastPackDate alone
  expect(
    gameReducer(opened, { type: 'SET_SIMULATED_DATE', payload: { date: '2027-03-05' } }).collection.lastPackDate,
  ).toBe('2027-03-01');
});

test('SAVE_TEAM ignores a missing team', () => {
  expect(
    gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: '2026-r3', team: null, now: '2026-11-15' } }),
  ).toBe(initialState);
});
