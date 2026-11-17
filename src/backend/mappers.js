const { emptyCollection } = require('../engine/collection');

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

function toCard(row) {
  return {
    id: row.id,
    type: row.type,
    edition: row.edition,
    name: row.name,
    subject: row.subject_id,
    rarities: row.rarities,
    effects: row.effects,
  };
}

function toCompetition(row) {
  return {
    id: row.id,
    seasonId: row.season_id,
    name: row.name,
    venue: row.venue,
    country: row.country,
    round: row.round,
    dateFrom: row.date_from,
    dateTo: row.date_to,
    referee: row.referee,
  };
}

function toOwned(ownedRows) {
  return ownedRows.reduce(
    (owned, row) => ({ ...owned, [row.card_id]: { ...owned[row.card_id], [row.rarity]: row.count } }),
    {},
  );
}

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

function toPicks(teamRows) {
  return Object.fromEntries(teamRows.map((row) => [row.competition_id, row.team]));
}

module.exports = { toRider, toCard, toCompetition, toWalletState, toWalletPayload, diffOwned, toPicks };
