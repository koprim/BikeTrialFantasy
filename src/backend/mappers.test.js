const { toCard, toRider, toCompetition, toWalletState, toWalletPayload, diffOwned, toPicks } = require('./mappers');

const walletRow = {
  user_id: 'u1',
  fragments: 7,
  pity_e: 3,
  pity_l: 9,
  packs_opened: 4,
  last_pack_date: '2026-11-16',
  starter_given: true,
  version: 2,
};

test('wallet and owned rows become a collection plus its version', () => {
  const ownedRows = [
    { card_id: 'a', rarity: 'C', count: 2 },
    { card_id: 'a', rarity: 'R', count: 1 },
  ];
  expect(toWalletState(walletRow, ownedRows)).toEqual({
    version: 2,
    collection: {
      owned: { a: { C: 2, R: 1 } },
      fragments: 7,
      pity: { E: 3, L: 9 },
      packsOpened: 4,
      lastPackDate: '2026-11-16',
      starterGiven: true,
      lastPack: [],
    },
  });
});

test('a collection becomes the RPC wallet payload', () => {
  const { collection } = toWalletState(walletRow, []);
  expect(toWalletPayload(collection)).toEqual({
    fragments: 7,
    pityE: 3,
    pityL: 9,
    packsOpened: 4,
    lastPackDate: '2026-11-16',
    starterGiven: true,
  });
});

test('diffOwned lists gains and losses per card and rarity', () => {
  const before = { a: { C: 2 }, b: { R: 1 } };
  const after = { a: { C: 1, E: 1 }, b: { R: 1 }, c: { C: 3 } };
  expect(diffOwned(before, after)).toEqual([
    { card_id: 'a', rarity: 'C', delta: -1 },
    { card_id: 'a', rarity: 'E', delta: 1 },
    { card_id: 'c', rarity: 'C', delta: 3 },
  ]);
});

test('catalog and competition rows use the engine field names', () => {
  expect(
    toCard({ id: 'p', type: 'PILOT', edition: '2026', name: 'N', subject_id: 'r1', rarities: ['C'], effects: [] })
      .subject,
  ).toBe('r1');
  expect(
    toRider({
      id: 'r1',
      name: 'N',
      nation: 'FRA',
      category: 'SENIOR_26',
      brand: 'Torq',
      cote: '1.5',
      uci_rank: 2,
      active: true,
    }),
  ).toEqual({
    id: 'r1',
    name: 'N',
    country: 'FRA',
    category: 'SENIOR_26',
    brand: 'Torq',
    cote: 1.5,
    uciRank: 2,
    active: true,
  });
  expect(
    toCompetition({
      id: '2026-r1',
      season_id: '2026',
      name: 'M1',
      venue: 'V',
      country: 'FRA',
      round: 1,
      date_from: '2026-10-18',
      date_to: '2026-10-19',
      referee: 'R',
    }),
  ).toEqual({
    id: '2026-r1',
    seasonId: '2026',
    name: 'M1',
    venue: 'V',
    country: 'FRA',
    round: 1,
    dateFrom: '2026-10-18',
    dateTo: '2026-10-19',
    referee: 'R',
  });
});

test('team rows become picks keyed by competition', () => {
  expect(toPicks([{ competition_id: '2026-r1', team: { slots: {} } }])).toEqual({ '2026-r1': { slots: {} } });
});

test('a wallet without owned rows nor pack date maps to an empty collection', () => {
  const { collection } = toWalletState({ ...walletRow, last_pack_date: null }, []);
  expect(collection.owned).toEqual({});
  expect(collection.lastPackDate).toBeNull();
});
