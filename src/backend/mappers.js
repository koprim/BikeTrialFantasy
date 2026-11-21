const { emptyCollection } = require('../engine/collection');

/**
 * @typedef {object} RiderRow
 * @property {string} id
 * @property {string} name
 * @property {string} nation
 * @property {string} category
 * @property {string} brand
 * @property {string|number} cote numeric column, arrives as a string
 * @property {number|null} uci_rank
 * @property {boolean} active
 */
/**
 * @typedef {object} CardRow
 * @property {string} id
 * @property {string} type
 * @property {string} edition
 * @property {Object<string, string>} name texts per language, not read by the server
 * @property {string} subject_id
 * @property {string[]} rarities
 * @property {object} effects jsonb
 */
/**
 * @typedef {object} CompetitionRow
 * @property {string} id
 * @property {string} season_id
 * @property {Object<string, string>} name texts per language, not read by the server
 * @property {string} venue
 * @property {string} country
 * @property {number} round
 * @property {string} date_from
 * @property {string} date_to
 * @property {string} referee
 */
/**
 * @typedef {object} WalletRow
 * @property {string} user_id
 * @property {number} fragments
 * @property {number} pity_e
 * @property {number} pity_l
 * @property {number} packs_opened
 * @property {string|null} last_pack_date date, null before the first pack
 * @property {boolean} starter_given
 * @property {number} version
 */
/**
 * @typedef {object} OwnedCardRow
 * @property {string} card_id
 * @property {string} rarity
 * @property {number} count
 */
/**
 * @typedef {object} TeamRow
 * @property {string} competition_id
 * @property {object} team jsonb
 */
/** @typedef {Object<string, Object<string, number>>} Owned card id -> rarity -> count */
/** @typedef {{ version: number, collection: object }} WalletState */
/** @typedef {{ card_id: string, rarity: string, delta: number }} OwnedChange */

/** @param {RiderRow} row @returns {object} domain rider */
function toRider(row) {
  return {
    id: row.id,
    name: row.name,
    country: row.nation,
    category: row.category,
    brand: row.brand,
    cote: Number(row.cote),
    uciRank: row.uci_rank,
    active: row.active,
  };
}

/** @param {CardRow} row @returns {object} domain card */
function toCard(row) {
  return {
    id: row.id,
    type: row.type,
    edition: row.edition,
    subject: row.subject_id,
    rarities: row.rarities,
    effects: row.effects,
  };
}

/** @param {CompetitionRow} row @returns {object} domain competition */
function toCompetition(row) {
  return {
    id: row.id,
    seasonId: row.season_id,
    venue: row.venue,
    country: row.country,
    round: row.round,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    referee: row.referee,
  };
}

/** @param {OwnedCardRow[]} ownedRows @returns {Owned} */
function toOwned(ownedRows) {
  const owned = {};
  ownedRows.forEach((row) => {
    owned[row.card_id] = { ...owned[row.card_id], [row.rarity]: row.count };
  });
  return owned;
}

/** @param {WalletRow} walletRow @param {OwnedCardRow[]} ownedRows @returns {WalletState} */
function toWalletState(walletRow, ownedRows) {
  return {
    version: walletRow.version,
    collection: {
      ...emptyCollection(),
      owned: toOwned(ownedRows),
      fragments: walletRow.fragments,
      pity: { E: walletRow.pity_e, L: walletRow.pity_l },
      packsOpened: walletRow.packs_opened,
      lastPackDate: walletRow.last_pack_date,
      starterGiven: walletRow.starter_given,
    },
  };
}

/** @param {object} collection domain collection @returns {object} wallet columns to persist */
function toWalletPayload(collection) {
  return {
    fragments: collection.fragments,
    pityE: collection.pity.E,
    pityL: collection.pity.L,
    packsOpened: collection.packsOpened,
    lastPackDate: collection.lastPackDate,
    starterGiven: collection.starterGiven,
  };
}

const countIn = (owned, cardId, rarity) => (owned[cardId] || {})[rarity] || 0;

/** @param {Owned} before @param {Owned} after @returns {OwnedChange[]} non-zero count changes */
function diffOwned(before, after) {
  const cardIds = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...cardIds].flatMap((cardId) => {
    const rarities = new Set([...Object.keys(before[cardId] || {}), ...Object.keys(after[cardId] || {})]);
    return [...rarities]
      .map((rarity) => ({
        card_id: cardId,
        rarity,
        delta: countIn(after, cardId, rarity) - countIn(before, cardId, rarity),
      }))
      .filter((change) => change.delta !== 0);
  });
}

/** @param {TeamRow[]} teamRows @returns {Object<string, object>} team per competition id */
function toPicks(teamRows) {
  return Object.fromEntries(teamRows.map((row) => [row.competition_id, row.team]));
}

module.exports = { toRider, toCard, toCompetition, toWalletState, toWalletPayload, diffOwned, toPicks };
