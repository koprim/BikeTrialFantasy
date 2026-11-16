const { rarityRank, atLeast } = require('./rarity');
const { makeRng, hashString } = require('./rng');

function emptyCollection() {
  return { owned: {}, fragments: 0, pity: { E: 0, L: 0 }, packsOpened: 0, lastPackDate: null, starterGiven: false, lastPack: [] };
}

function countOf(collection, cardId, rarity) {
  return (collection.owned[cardId] || {})[rarity] || 0;
}

function addCard(owned, cardId, rarity) {
  const cur = owned[cardId] || {};
  return { ...owned, [cardId]: { ...cur, [rarity]: (cur[rarity] || 0) + 1 } };
}

function pickWeighted(weights, rng) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let x = rng() * total;
  for (const [key, w] of entries) { x -= w; if (x < 0) return key; }
  return entries[entries.length - 1][0];
}

// type null = any type. Prefers cards that exist at this rarity; else the closest lower rarity.
function drawCard(cards, type, rarity, rng) {
  const pool = type ? cards.filter((c) => c.type === type) : cards;
  const exact = pool.filter((c) => c.rarities.includes(rarity));
  if (exact.length) return { card: exact[Math.floor(rng() * exact.length)], rarity };
  const card = pool[Math.floor(rng() * pool.length)];
  const lower = card.rarities.filter((r) => rarityRank(r) <= rarityRank(rarity));
  return { card, rarity: lower.length ? lower[lower.length - 1] : card.rarities[0] };
}

function receive(collection, drawn) {
  let owned = collection.owned;
  const lastPack = drawn.map(({ card, rarity }) => {
    const isNew = !((owned[card.id] || {})[rarity]);
    owned = addCard(owned, card.id, rarity);
    return { cardId: card.id, rarity, isNew };
  });
  return { owned, lastPack };
}

function openPack(collection, { cards, balance }, rng) {
  const { size, guaranteedMinRarity, odds, typeWeights } = balance.pack;
  const needL = collection.pity.L + 1 >= balance.pity.L;
  const needE = collection.pity.E + 1 >= balance.pity.E;
  const drawn = [];
  for (let i = 0; i < size; i++) {
    const guaranteed = i === size - 1;
    let rarity = pickWeighted(odds, rng);
    if (guaranteed && !atLeast(rarity, guaranteedMinRarity)) rarity = guaranteedMinRarity;
    let forced = false;
    if (guaranteed && needL) { rarity = 'L'; forced = true; } else if (guaranteed && needE && !atLeast(rarity, 'E')) { rarity = 'E'; forced = true; }
    drawn.push(drawCard(cards, forced ? null : pickWeighted(typeWeights, rng), rarity, rng));
  }
  const { owned, lastPack } = receive(collection, drawn);
  const gotE = drawn.some((d) => atLeast(d.rarity, 'E'));
  const gotL = drawn.some((d) => d.rarity === 'L');
  return {
    ...collection, owned, lastPack, packsOpened: collection.packsOpened + 1,
    pity: { E: gotE ? 0 : collection.pity.E + 1, L: gotL ? 0 : collection.pity.L + 1 },
  };
}

function canOpenDaily(collection, now) {
  return !collection.lastPackDate || collection.lastPackDate < now;
}

// Packs do not pile up: one per calendar day, seeded by the date and the pack count.
function openDailyPack(collection, now, deps) {
  if (!canOpenDaily(collection, now)) return collection;
  const rng = makeRng(hashString(`${now}#${collection.packsOpened}`));
  return { ...openPack(collection, deps, rng), lastPackDate: now };
}

function openStarter(collection, { cards, ridersById }, rng) {
  if (collection.starterGiven) return collection;
  const take = (list, n) => {
    const pool = [...list];
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  };
  const commons = cards.filter((c) => c.rarities.includes('C'));
  const pilotsOf = (cat) => commons.filter((c) => c.type === 'PILOT' && ridersById[c.subject]
    && ridersById[c.subject].active !== false && ridersById[c.subject].category === cat);
  const chosen = [
    ...['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20'].flatMap((cat) => take(pilotsOf(cat), 1)),
    ...take(pilotsOf('ELITE_WOMEN'), 2),
    ...take(commons.filter((c) => c.type === 'TECHNIQUE'), 3),
    ...take(commons.filter((c) => c.type === 'EQUIPMENT'), 1),
  ];
  const { owned, lastPack } = receive(collection, chosen.map((card) => ({ card, rarity: 'C' })));
  return { ...collection, owned, lastPack, starterGiven: true };
}

function recycle(collection, cardId, rarity, balance) {
  const n = countOf(collection, cardId, rarity);
  if (n < 2) return collection;
  return {
    ...collection,
    owned: { ...collection.owned, [cardId]: { ...collection.owned[cardId], [rarity]: n - 1 } },
    fragments: collection.fragments + balance.fragments.perDuplicate[rarity],
  };
}

function craft(collection, card, rarity, balance) {
  const cost = balance.fragments.craftCost[rarity];
  if (!card || !card.rarities.includes(rarity) || collection.fragments < cost) return collection;
  return { ...collection, owned: addCard(collection.owned, card.id, rarity), fragments: collection.fragments - cost };
}

function ownedRefs(collection, cards, filter) {
  return cards.filter(filter).flatMap((card) => card.rarities
    .filter((r) => countOf(collection, card.id, r) > 0)
    .map((r) => ({ cardId: card.id, rarity: r, card, count: countOf(collection, card.id, r) })));
}

module.exports = {
  emptyCollection, countOf, addCard, openPack, canOpenDaily, openDailyPack, openStarter, recycle, craft, ownedRefs,
};
