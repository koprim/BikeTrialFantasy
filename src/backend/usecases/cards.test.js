const { makeRecycle, makeCraft } = require('./cards');
const { emptyCollection } = require('../../engine/collection');
const { fakeCatalog, fakeWallets, seedCatalog } = require('../../../test/fakes');

const { cards, balance } = seedCatalog();
const card = cards.find((c) => c.rarities.includes('C'));

function setup(collection) {
  const deps = { catalog: fakeCatalog(), wallets: fakeWallets({ ...emptyCollection(), ...collection }) };
  return { deps, recycle: makeRecycle(deps), craft: makeCraft(deps) };
}

test('recycling a duplicate gives fragments', async () => {
  const { recycle } = setup({ owned: { [card.id]: { C: 2 } } });
  const collection = await recycle('u1', { cardId: card.id, rarity: 'C' });
  expect(collection.owned[card.id].C).toBe(1);
  expect(collection.fragments).toBe(balance.fragments.perDuplicate.C);
});

test('the last copy cannot be recycled', async () => {
  const { recycle } = setup({ owned: { [card.id]: { C: 1 } } });
  await expect(recycle('u1', { cardId: card.id, rarity: 'C' })).rejects.toMatchObject({ code: 'NOT_ALLOWED' });
});

test('crafting spends fragments', async () => {
  const { craft } = setup({ fragments: balance.fragments.craftCost.C });
  const collection = await craft('u1', { cardId: card.id, rarity: 'C' });
  expect(collection.owned[card.id].C).toBe(1);
  expect(collection.fragments).toBe(0);
});

test('crafting without enough fragments is refused', async () => {
  const { craft } = setup({ fragments: 0 });
  await expect(craft('u1', { cardId: card.id, rarity: 'C' })).rejects.toMatchObject({ code: 'NOT_ALLOWED' });
});

test.each([[{ cardId: 'nope', rarity: 'C' }], [{ cardId: card.id, rarity: 'X' }], [undefined]])(
  'invalid input %p is rejected',
  async (input) => {
    const { recycle } = setup({});
    await expect(recycle('u1', input)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  },
);
