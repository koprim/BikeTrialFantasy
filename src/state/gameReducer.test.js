const { gameReducer, initialState } = require('./GameContext');

test('START_SEASON sets player, season, rivals, index 0', () => {
  const season = [{ id: 'e1' }, { id: 'e2' }];
  const rivals = [{ id: 'rival-1' }];
  const s = gameReducer(initialState, { type: 'START_SEASON', payload: { name: 'Me', season, rivals } });
  expect(s.player).toEqual({ name: 'Me' });
  expect(s.season).toHaveLength(2);
  expect(s.currentIndex).toBe(0);
  expect(s.rivals).toEqual(rivals);
});

test('LOCK_TEAM stores pick + outcome for an event', () => {
  const base = { ...initialState, player: { name: 'Me' }, season: [{ id: 'e1' }], currentIndex: 0 };
  const team = { senior26: 'r1' };
  const outcome = { player: { total: 100, breakdown: [] }, leaderboard: [] };
  const s = gameReducer(base, { type: 'LOCK_TEAM', payload: { eventId: 'e1', team, outcome } });
  expect(s.picks.e1).toEqual(team);
  expect(s.outcomes.e1).toEqual(outcome);
});

test('ADVANCE increments currentIndex', () => {
  const base = { ...initialState, season: [{ id: 'e1' }, { id: 'e2' }], currentIndex: 0 };
  expect(gameReducer(base, { type: 'ADVANCE' }).currentIndex).toBe(1);
});

test('RESET returns to initial', () => {
  const base = { ...initialState, player: { name: 'X' }, currentIndex: 5 };
  expect(gameReducer(base, { type: 'RESET' })).toEqual(initialState);
});
