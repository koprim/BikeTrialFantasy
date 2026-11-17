const { canRecycle, canCraft, recycle, craft } = require('../../engine/collection');
const { gameError } = require('../errors');
const { applyCollectionChange } = require('./applyCollectionChange');

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function requireCard(cardsById, input) {
  const { cardId, rarity } = input || {};
  if (typeof cardId !== 'string' || typeof rarity !== 'string' || !hasOwn(cardsById, cardId)) {
    throw gameError('INVALID_INPUT');
  }
  const card = cardsById[cardId];
  if (!card.rarities.includes(rarity)) throw gameError('INVALID_INPUT');
  return card;
}

function makeRecycle({ catalog, wallets }) {
  return async (userId, input) => {
    const { cardsById, balance } = await catalog.load();
    const card = requireCard(cardsById, input);
    return applyCollectionChange(wallets, userId, (collection) => {
      if (!canRecycle(collection, card.id, input.rarity)) throw gameError('NOT_ALLOWED');
      return { after: recycle(collection, card.id, input.rarity, balance) };
    });
  };
}

function makeCraft({ catalog, wallets }) {
  return async (userId, input) => {
    const { cardsById, balance } = await catalog.load();
    const card = requireCard(cardsById, input);
    return applyCollectionChange(wallets, userId, (collection) => {
      if (!canCraft(collection, card, input.rarity, balance)) throw gameError('NOT_ALLOWED');
      return { after: craft(collection, card, input.rarity, balance) };
    });
  };
}

module.exports = { makeRecycle, makeCraft };
