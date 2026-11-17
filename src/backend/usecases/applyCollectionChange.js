const { gameError } = require('../errors');

const MAX_ATTEMPTS = 3;

/**
 * Loads the player's collection, computes the change and commits it atomically.
 * compute(collection) returns { after, opening? }, or null when there is nothing to change; it throws a GameError to refuse.
 * A concurrent change (version conflict) triggers a fresh load and recompute.
 */
async function applyCollectionChange(wallets, userId, compute, { duplicateError = 'ALREADY_OPENED' } = {}) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { collection, version } = await wallets.load(userId);
    const change = compute(collection);
    if (!change) return collection;
    const outcome = await wallets.commit(userId, {
      expectedVersion: version,
      before: collection,
      after: change.after,
      opening: change.opening || null,
    });
    if (outcome === 'ok') return change.after;
    if (outcome === 'duplicate') throw gameError(duplicateError);
    if (outcome !== 'conflict') throw new Error(`Unexpected commit outcome: ${outcome}`);
  }
  throw gameError('BUSY');
}

module.exports = { applyCollectionChange };
