const RARITIES = ['C', 'R', 'E', 'L'];
const RARITY_LABELS = { C: 'Commune', R: 'Rare', E: 'Épique', L: 'Légendaire' };

function rarityRank(r) {
  return RARITIES.indexOf(r);
}
function atLeast(r, min) {
  return rarityRank(r) >= rarityRank(min);
}

module.exports = { RARITIES, RARITY_LABELS, rarityRank, atLeast };
