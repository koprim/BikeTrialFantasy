const { applyCollectionChange } = require('./applyCollectionChange');
const { GameError, gameError } = require('../errors');
const { emptyCollection } = require('../../engine/collection');
const { fakeWallets } = require('../../../test/fakes');

const addFragments = (collection) => ({ after: { ...collection, fragments: collection.fragments + 5 } });

test('commits the computed collection and returns it', async () => {
  const wallets = fakeWallets();
  const result = await applyCollectionChange(wallets, 'u1', addFragments);
  expect(result.fragments).toBe(5);
  expect(wallets.state.version).toBe(1);
});

test('retries on a concurrent change, recomputing from fresh data', async () => {
  const wallets = fakeWallets();
  wallets.conflictsToSimulate = 2;
  const seen = [];
  const compute = jest.fn((collection) => {
    seen.push(collection);
    return addFragments(collection);
  });
  await applyCollectionChange(wallets, 'u1', compute);
  expect(compute).toHaveBeenCalledTimes(3);
  expect(seen[0].fragments).toBe(0);
  expect(seen[2].fragments).toBe(2);
  expect(wallets.commits).toHaveLength(1);
  expect(wallets.commits[0].expectedVersion).toBe(2);
  expect(wallets.state.collection.fragments).toBe(7);
});

test('gives up with BUSY after repeated conflicts', async () => {
  const wallets = fakeWallets();
  wallets.conflictsToSimulate = 10;
  await expect(applyCollectionChange(wallets, 'u1', addFragments)).rejects.toMatchObject({ code: 'BUSY' });
});

test('a null change is a no-op returning the current collection', async () => {
  const wallets = fakeWallets();
  const result = await applyCollectionChange(wallets, 'u1', () => null);
  expect(result).toEqual(wallets.state.collection);
  expect(wallets.commits).toHaveLength(0);
});

test('a duplicate opening raises the given error', async () => {
  const wallets = fakeWallets();
  wallets.openings.add('daily|2026-11-17');
  const compute = (collection) => ({
    after: collection,
    opening: { kind: 'daily', packDate: '2026-11-17', cards: [] },
  });
  const error = await applyCollectionChange(wallets, 'u1', compute, { duplicateError: 'ALREADY_OPENED' }).catch(
    (e) => e,
  );
  expect(error).toBeInstanceOf(GameError);
  expect(error.code).toBe('ALREADY_OPENED');
});

test('a GameError thrown by compute propagates without retry or commit', async () => {
  const wallets = fakeWallets();
  const compute = jest.fn(() => {
    throw gameError('NOT_ALLOWED');
  });
  await expect(applyCollectionChange(wallets, 'u1', compute)).rejects.toMatchObject({
    code: 'NOT_ALLOWED',
  });
  expect(compute).toHaveBeenCalledTimes(1);
  expect(wallets.commits).toHaveLength(0);
});

test('an unknown commit outcome is an error', async () => {
  const wallets = { load: async () => ({ collection: emptyCollection(), version: 0 }), commit: async () => 'weird' };
  await expect(applyCollectionChange(wallets, 'u1', addFragments)).rejects.toThrow('Unexpected commit outcome: weird');
});

test('the opening defaults to null in the committed change', async () => {
  const wallets = fakeWallets();
  await applyCollectionChange(wallets, 'u1', addFragments);
  expect(wallets.commits[0].opening).toBeNull();
});

test('the returned collection keeps lastPack, which the database does not store', async () => {
  const wallets = fakeWallets();
  const compute = (collection) => ({ after: { ...collection, lastPack: [{ cardId: 'c1', rarity: 'C' }] } });
  const result = await applyCollectionChange(wallets, 'u1', compute);
  expect(result.lastPack).toHaveLength(1);
  expect((await wallets.load('u1')).collection.lastPack).toEqual([]);
});

test('mutating a loaded collection does not alter the stored state', async () => {
  const wallets = fakeWallets();
  const { collection } = await wallets.load('u1');
  collection.owned.c1 = { C: 1 };
  collection.pity.E = 9;
  expect(wallets.state.collection.owned).toEqual({});
  expect(wallets.state.collection.pity.E).toBe(0);
});

test.each([
  ['an owned count', (collection) => ({ ...collection, owned: { c1: { C: -1 } } })],
  ['fragments', (collection) => ({ ...collection, fragments: -1 })],
])('a commit driving %s negative is rejected like the RPC, leaving state untouched', async (_name, mutate) => {
  const wallets = fakeWallets();
  const compute = (collection) => ({ after: mutate(collection) });
  await expect(applyCollectionChange(wallets, 'u1', compute)).rejects.toThrow('commit_collection_change: negative');
  expect(wallets.state.version).toBe(0);
  expect(wallets.commits).toHaveLength(0);
});
