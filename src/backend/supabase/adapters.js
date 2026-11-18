const { toCard, toRider, toCompetition, toWalletState, toWalletPayload, diffOwned } = require('../mappers');
const { buildCatalog } = require('../catalog');
const { gameError } = require('../errors');

// Throws on a Supabase error, keeping the Postgres error code (e.g. P0001), details and hint reachable.
function unwrap({ data, error }) {
  if (error) throw Object.assign(new Error(error.message), { code: error.code, details: error.details, hint: error.hint });
  return data;
}

/** @returns {import('../ports').CatalogReader} */
function makeCatalog(db) {
  return {
    async load() {
      const [cardRows, riderRows, balanceRows] = await Promise.all([
        db.from('cards').select('*').then(unwrap),
        db.from('riders').select('*').then(unwrap),
        db.from('balance').select('data').order('version', { ascending: false }).limit(1).then(unwrap),
      ]);
      if (!balanceRows.length) throw new Error('No balance configured');
      return buildCatalog({ cards: cardRows.map(toCard), riders: riderRows.map(toRider), balance: balanceRows[0].data });
    },
  };
}

/** @returns {import('../ports').WalletRepository} */
function makeWallets(db) {
  return {
    async load(userId) {
      const [walletRow, ownedRows] = await Promise.all([
        db.from('wallets').select('*').eq('user_id', userId).single().then(unwrap),
        db.from('owned_cards').select('card_id, rarity, count').eq('user_id', userId).then(unwrap),
      ]);
      return toWalletState(walletRow, ownedRows);
    },
    async commit(userId, { expectedVersion, before, after, opening }) {
      return unwrap(
        await db.rpc('commit_collection_change', {
          p_user_id: userId,
          p_expected_version: expectedVersion,
          p_wallet: toWalletPayload(after),
          p_owned_deltas: diffOwned(before.owned, after.owned),
          p_opening: opening,
        }),
      );
    },
  };
}

/** @returns {import('../ports').CompetitionReader} */
function makeCompetitions(db) {
  return {
    async get(competitionId) {
      const row = unwrap(await db.from('competitions').select('*').eq('id', competitionId).maybeSingle());
      return row && toCompetition(row);
    },
  };
}

/** @returns {import('../ports').TeamRepository} */
function makeTeams(db) {
  return {
    async save(userId, competitionId, team) {
      unwrap(await db.from('teams').upsert({ user_id: userId, competition_id: competitionId, team, updated_at: new Date().toISOString() }));
    },
  };
}

const SIMULATED_DATE_KEY = 'simulated_date';

/** @returns {import('../ports').SettingsRepository} */
function makeSettings(db) {
  return {
    async getSimulatedDate() {
      const row = unwrap(await db.from('app_settings').select('value').eq('key', SIMULATED_DATE_KEY).maybeSingle());
      return row ? row.value : null;
    },
    async setSimulatedDate(date) {
      if (date) unwrap(await db.from('app_settings').upsert({ key: SIMULATED_DATE_KEY, value: date }));
      else unwrap(await db.from('app_settings').delete().eq('key', SIMULATED_DATE_KEY));
    },
  };
}

const BEARER_PATTERN = /^Bearer\s+(\S+)$/i;
const TOKEN_REJECTED_STATUSES = [400, 401, 403];

/** @returns {(request: Request) => Promise<string>} resolves the user id from the bearer token */
function makeAuthenticator(db) {
  return async (request) => {
    const match = BEARER_PATTERN.exec(request.headers.get('Authorization') || '');
    if (!match) throw gameError('UNAUTHENTICATED');
    const { data, error } = await db.auth.getUser(match[1]);
    // Only a genuine token rejection is UNAUTHENTICATED: during an auth outage clients must not drop their session.
    if (error && !TOKEN_REJECTED_STATUSES.includes(error.status)) throw new Error(`Auth lookup failed: ${error.message}`);
    if (error || !data.user) throw gameError('UNAUTHENTICATED');
    return data.user.id;
  };
}

module.exports = { makeCatalog, makeWallets, makeCompetitions, makeTeams, makeSettings, makeAuthenticator };
