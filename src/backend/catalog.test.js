const { buildCatalog } = require('./catalog');

test('the catalog indexes cards and riders by id and passes cards and balance through', () => {
  const cards = [{ id: 'c1' }, { id: 'c2' }];
  const riders = [{ id: 'r1', name: 'Rider One' }];
  const balance = { packSize: 5 };

  const catalog = buildCatalog({ cards, riders, balance });

  expect(catalog.cards).toBe(cards);
  expect(catalog.balance).toBe(balance);
  expect(catalog.cardsById).toEqual({ c1: cards[0], c2: cards[1] });
  expect(catalog.ridersById).toEqual({ r1: riders[0] });
});
