const { RARITIES } = require('../../engine/rarity');
const { countOf, recycle, craft } = require('../../engine/collection');
const { gameError } = require('../errors');
const { applyCollectionChange } = require('./applyCollectionChange');

function requireCard(cardsById, input) {
  const { cardId, rarity } = input || {};
  const card = cardsById[cardId];
  if (!card || !RARITIES.includes(rarity) || !card.rarities.includes(rarity)) throw gameError('INVALID_INPUT');
  return card;
}

function makeRecycle({ catalog, wallets }) {
  return async (userId, input) => {
    const { cardsById, balance } = await catalog.load();
    const card = requireCard(cardsById, input);
    return applyCollectionChange(wallets, userId, (collection) => {
      if (countOf(collection, card.id, input.rarity) < 2) throw gameError('NOT_ALLOWED');
      return { after: recycle(collection, card.id, input.rarity, balance) };
    });
  };
}

function makeCraft({ catalog, wallets }) {
  return async (userId, input) => {
    const { cardsById, balance } = await catalog.load();
    const card = requireCard(cardsById, input);
    return applyCollectionChange(wallets, userId, (collection) => {
      if (collection.fragments < balance.fragments.craftCost[input.rarity]) throw gameError('NOT_ALLOWED');
      return { after: craft(collection, card, input.rarity, balance) };
    });
  };
}

module.exports = { makeRecycle, makeCraft };
