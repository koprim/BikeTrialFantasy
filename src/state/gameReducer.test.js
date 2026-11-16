const { gameReducer, initialState } = require('./GameContext');

const team = { senior26: 'x' };

test('initial state is the demo player with real time', () => {
  expect(initialState.player).toEqual({ name: 'Démo' });
  expect(Object.keys(initialState.picks)).toHaveLength(6);
  expect(initialState.simulatedDate).toBeNull();
});

test('SAVE_TEAM stores the team while the event is open', () => {
  const s = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: '2026-r3', team, now: '2026-11-15' } });
  expect(s.picks['2026-r3']).toEqual(team);
});

test('SAVE_TEAM is ignored once the event is locked or unknown', () => {
  const locked = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: '2026-r3', team, now: '2026-11-29' } });
  expect(locked).toBe(initialState);
  const unknown = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: 'nope', team, now: '2026-11-15' } });
  expect(unknown).toBe(initialState);
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

test('HYDRATE merges a saved state but ignores the old linear format', () => {
  const saved = { player: { name: 'Z' }, picks: { a: team }, simulatedDate: '2026-11-15' };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: saved })).toEqual(saved);
  const old = { player: { name: 'Old' }, season: [], currentIndex: 2, picks: {}, outcomes: {} };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: old })).toBe(initialState);
});
