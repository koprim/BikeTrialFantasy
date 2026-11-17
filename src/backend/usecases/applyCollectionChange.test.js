const { applyCollectionChange } = require('./applyCollectionChange');
const { GameError } = require('../errors');
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
  await applyCollectionChange(wallets, 'u1', addFragments);
  expect(wallets.commits).toHaveLength(1);
});

test('gives up with BUSY after repeated conflicts', async () => {
  const wallets = fakeWallets();
  wallets.conflictsToSimulate = 10;
  await expect(applyCollectionChange(wallets, 'u1', addFragments)).rejects.toMatchObject({ code: 'BUSY' });
});

test('a null change is a no-op returning the current collection', async () => {
  const wallets = fakeWallets();
  const result = await applyCollectionChange(wallets, 'u1', () => null);
  expect(result).toBe(wallets.state.collection);
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
