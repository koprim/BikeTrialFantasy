const { canOpenDaily, openDailyPack, openStarter } = require('../../engine/collection');
const { makeRng } = require('../../engine/rng');
const { gameError } = require('../errors');
const { applyCollectionChange } = require('./applyCollectionChange');

function makeOpenDailyPack({ clock, catalog, wallets }) {
  return async (userId) => {
    const packDate = await clock.today();
    const { cards, balance } = await catalog.load();
    return applyCollectionChange(wallets, userId, (collection) => {
      if (!canOpenDaily(collection, packDate)) throw gameError('ALREADY_OPENED');
      const after = openDailyPack(collection, packDate, { cards, balance });
      return { after, opening: { kind: 'daily', packDate, cards: after.lastPack } };
    });
  };
}

function makeOpenStarter({ clock, catalog, wallets, randomSeed }) {
  return async (userId) => {
    const packDate = await clock.today();
    const { cards, ridersById } = await catalog.load();
    return applyCollectionChange(
      wallets,
      userId,
      (collection) => {
        if (collection.starterGiven) throw gameError('STARTER_ALREADY_OPENED');
        const after = openStarter(collection, { cards, ridersById }, makeRng(randomSeed()));
        return { after, opening: { kind: 'starter', packDate, cards: after.lastPack } };
      },
      { duplicateError: 'STARTER_ALREADY_OPENED' },
    );
  };
}

module.exports = { makeOpenDailyPack, makeOpenStarter };
