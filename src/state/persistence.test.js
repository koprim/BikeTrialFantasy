jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return {
    setItem: jest.fn((k, v) => {
      store[k] = v;
      return Promise.resolve();
    }),
    getItem: jest.fn((k) => Promise.resolve(store[k] ?? null)),
    removeItem: jest.fn((k) => {
      delete store[k];
      return Promise.resolve();
    }),
  };
});
const { saveState, loadState, STORAGE_KEY } = require('./persistence');

test('round-trips state through storage', async () => {
  const state = { player: { name: 'Me' }, currentIndex: 2 };
  await saveState(state);
  expect(await loadState()).toEqual(state);
  expect(STORAGE_KEY).toBeTruthy();
});
