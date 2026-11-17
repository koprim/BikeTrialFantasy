const indexById = (items) => Object.fromEntries(items.map((item) => [item.id, item]));

function buildCatalog({ cards, riders, balance }) {
  return { cards, balance, cardsById: indexById(cards), ridersById: indexById(riders) };
}

module.exports = { buildCatalog };
