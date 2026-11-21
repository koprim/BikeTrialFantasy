const RARITIES = ['C', 'R', 'E', 'L'];

function rarityRank(r) {
  return RARITIES.indexOf(r);
}
function atLeast(r, min) {
  return rarityRank(r) >= rarityRank(min);
}

module.exports = { RARITIES, rarityRank, atLeast };
