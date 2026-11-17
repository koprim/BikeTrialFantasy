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

const missingRarity = ['C', 'R', 'E', 'L'].find((rarity) => !card.rarities.includes(rarity));
const invalidInputs = [
  [{ cardId: 'nope', rarity: 'C' }],
  [{ cardId: card.id, rarity: 'X' }],
  [{ cardId: 'constructor', rarity: 'C' }],
  [{ cardId: '__proto__', rarity: 'C' }],
  [{ cardId: card.id, rarity: 'constructor' }],
  [{ cardId: { toString: () => card.id }, rarity: 'C' }],
  [undefined],
  [null],
  ['text'],
  ...(missingRarity ? [[{ cardId: card.id, rarity: missingRarity }]] : []),
];

describe.each([['recycle'], ['craft']])('%s', (name) => {
  test.each(invalidInputs)('invalid input %p is rejected', async (input) => {
    const useCase = setup({ fragments: 99999 })[name];
    await expect(useCase('u1', input)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });
});
