// Simulates players opening one pack a day (recycling duplicates, crafting the cheapest missing card)
// and prints the median day at which each rarity is 50% and 100% complete.
// Usage: npm run sim:economy   (PLAYERS=200 npm run sim:economy for a quicker run)
const cards = require('../src/data/seed/cards.json');
const balance = require('../src/data/seed/balance.json');
const riders = require('../src/data/seed/riders.json');
const { emptyCollection, openPack, openStarter, recycle, craft, countOf } = require('../src/engine/collection');
const { RARITIES } = require('../src/engine/rarity');
const RARITY_LABELS = require('../src/i18n/locales/fr/ui.json').rarity;
const { makeRng } = require('../src/engine/rng');

const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
const PLAYERS = Number(process.env.PLAYERS || 1000);
const DAYS = Number(process.env.DAYS || 365);
const totals = Object.fromEntries(RARITIES.map((r) => [r, cards.filter((c) => c.rarities.includes(r)).length]));

const ownedAt = (col, r) => cards.filter((c) => c.rarities.includes(r) && countOf(col, c.id, r) > 0).length;

function cheapestMissing(col) {
  for (const r of RARITIES) {
    const card = cards.find((c) => c.rarities.includes(r) && countOf(col, c.id, r) === 0);
    if (card) return { card, rarity: r };
  }
  return null;
}

function simulatePlayer(seed) {
  const rng = makeRng(seed);
  let col = openStarter(emptyCollection(), { cards, ridersById }, rng);
  const reached = Object.fromEntries(RARITIES.map((r) => [r, { half: null, full: null }]));
  for (let day = 1; day <= DAYS; day++) {
    col = openPack(col, { cards, balance }, rng);
    col.lastPack.forEach(({ cardId, rarity }) => {
      col = recycle(col, cardId, rarity, balance);
    });
    let target = cheapestMissing(col);
    while (target && col.fragments >= balance.fragments.craftCost[target.rarity]) {
      col = craft(col, target.card, target.rarity, balance);
      target = cheapestMissing(col);
    }
    RARITIES.forEach((r) => {
      const n = ownedAt(col, r);
      if (reached[r].half === null && n >= totals[r] / 2) reached[r].half = day;
      if (reached[r].full === null && n >= totals[r]) reached[r].full = day;
    });
  }
  return reached;
}

function median(values) {
  const sorted = values.map((v) => (v === null ? Infinity : v)).sort((a, b) => a - b);
  const m = sorted[Math.floor(sorted.length / 2)];
  return m === Infinity ? `> ${DAYS}` : String(m);
}

const runs = Array.from({ length: PLAYERS }, (_, i) => simulatePlayer(i + 1));
console.log(`${PLAYERS} joueurs, ${DAYS} jours, 1 pack/jour, ${cards.length} cartes`);
console.log('Rareté      | cartes | 50 % (jours) | 100 % (jours)');
RARITIES.forEach((r) => {
  const half = median(runs.map((x) => x[r].half));
  const full = median(runs.map((x) => x[r].full));
  console.log(
    `${RARITY_LABELS[r].padEnd(11)} | ${String(totals[r]).padStart(6)} | ${half.padStart(12)} | ${full.padStart(13)}`,
  );
});
