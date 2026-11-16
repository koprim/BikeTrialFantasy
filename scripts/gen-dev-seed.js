// Synthesizes a playable dev dataset: 2 yearly seasons (2025 archived, 2026 current around 2026-11-15),
// race stats, a card catalog and a demo player who already played the past events.
const fs = require('fs');
const path = require('path');
const { coteFromRank } = require('../src/engine/cote');
const { CATEGORIES, groupByCategory, cardTeamFromRiders } = require('../src/engine/team');
const { emptyCollection, addCard } = require('../src/engine/collection');
const { generateBotTeam } = require('../src/engine/bots');
const { makeRng } = require('../src/engine/rng');

const EDITION = '2026';
const COUNTRIES = ['FRA', 'GBR', 'ESP', 'GER', 'SUI', 'POL', 'CZE', 'BEL'];
const BRANDS = ['Alpha', 'Torq', 'Grip', 'Volt'];
const VENUES = [['Vic', 'ESP'], ['Andorre', 'AND'], ['Val di Sole', 'ITA'], ['Leogang', 'AUT'],
  ['Les Gets', 'FRA'], ['Châtel', 'FRA'], ['Lenzerheide', 'SUI'], ['Pal Arinsal', 'AND']];
const SEASONS_PLAN = [
  { id: '2025', name: 'Coupe du Monde 2025', dates: ['2025-05-10', '2025-07-05', '2025-08-23', '2025-09-20'] },
  { id: '2026', name: 'Coupe du Monde 2026', dates: ['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20'] },
];
const DEMO_PLAYED_BEFORE = '2026-11-15'; // the demo player has teams for events finished before this date
const CATEGORY_LABELS = {
  SENIOR_26: 'Senior 26"', JUNIOR_26: 'Junior 26"', SENIOR_20: 'Senior 20"', JUNIOR_20: 'Junior 20"', ELITE_WOMEN: 'Elite Femmes',
};
const TECHNIQUES = [['gap', 'Gap'], ['bunny-up', 'Bunny up'], ['side-hop', 'Side hop'], ['pivot', 'Pivot'],
  ['sur-place', 'Sur-place'], ['drop', 'Drop'], ['wheeling', 'Wheeling'], ['nose-turn', 'Nose turn']];
const REFEREES = ['M. Durand', 'Mme Keller', 'M. Rossi', 'Mme Novak'];
const LEGENDS = [
  { id: 'legend-senior-20', name: 'Légende Senior 20"', country: 'FRA', category: 'SENIOR_20' },
  { id: 'legend-senior-26', name: 'Légende Senior 26"', country: 'ESP', category: 'SENIOR_26' },
  { id: 'legend-elite-women', name: 'Légende Elite Femmes', country: 'GBR', category: 'ELITE_WOMEN' },
];

function slug(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildRiders() {
  const riders = [];
  CATEGORIES.forEach((cat, ci) => {
    for (let i = 1; i <= 8; i++) {
      const uciRank = (i - 1) * 7 + 1; // 1,8,15,22,29,36,43,50 → cote spread
      riders.push({
        id: slug(`${cat}-${i}`), name: `${cat.replace('_', ' ')} Pilote ${i}`, country: COUNTRIES[i % COUNTRIES.length],
        category: cat, uciRank, cote: coteFromRank(uciRank), brand: BRANDS[(i + ci) % BRANDS.length], active: true,
      });
    }
  });
  LEGENDS.forEach((l) => riders.push({ ...l, uciRank: null, cote: coteFromRank(null), brand: 'Alpha', active: false }));
  return riders;
}

function shuffledResults(byCat, seed) {
  const rng = makeRng(seed);
  const results = {};
  CATEGORIES.forEach((cat) => {
    const ids = byCat[cat].map((r) => r.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    results[cat] = ids;
  });
  return results;
}

// Per rider: techniques performed and clean sections (better finish → more clean sections).
function buildStats(results, seed) {
  const rng = makeRng(seed);
  const stats = {};
  Object.values(results).forEach((order) => order.forEach((id, idx) => {
    const techniques = TECHNIQUES.filter(() => rng() < 0.4).map(([key]) => key);
    const cleanSections = Math.max(0, Math.min(12, 12 - idx + Math.floor(rng() * 3) - 2));
    stats[id] = { techniques, cleanSections };
  }));
  return stats;
}

function buildSeasons(riders) {
  const byCat = groupByCategory(riders.filter((r) => r.active));
  let venueIdx = 0;
  return SEASONS_PLAN.map((plan, si) => ({
    id: plan.id,
    name: plan.name,
    events: plan.dates.map((dateFrom, i) => {
      const [venue, country] = VENUES[venueIdx++ % VENUES.length];
      const seed = (si + 1) * 100 + (i + 1) * 17;
      const results = shuffledResults(byCat, seed);
      return {
        id: `${plan.id}-r${i + 1}`, name: `${plan.name} — Manche ${i + 1}`, venue, country,
        round: i + 1, dateFrom, dateTo: addDays(dateFrom, 1),
        referee: REFEREES[(si * 4 + i) % REFEREES.length],
        results, stats: buildStats(results, seed + 5000),
      };
    }),
  }));
}

function pilotEffect(index) {
  switch (index % 4) {
    case 1: return { description: "+{value} sur ses points s'il finit dans le top 3", trigger: { type: 'RIDER_TOP_N', n: 3 }, reward: { type: 'RIDER_MULTIPLIER', value: 0.1 } };
    case 2: return { description: "+{value} pts s'il passe au moins 8 zones sans pénalité", trigger: { type: 'RIDER_CLEAN_MIN', min: 8 }, reward: { type: 'FLAT_POINTS', value: 20 } };
    case 3: {
      const [key, label] = TECHNIQUES[index % TECHNIQUES.length];
      return { description: `+{value} pts s'il réussit un ${label}`, trigger: { type: 'RIDER_DID_TECHNIQUE', technique: key }, reward: { type: 'FLAT_POINTS', value: 20 } };
    }
    default: return { description: '+{value} sur ses points', trigger: { type: 'ALWAYS' }, reward: { type: 'RIDER_MULTIPLIER', value: 0.05 } };
  }
}

const REFEREE_EFFECTS = [
  { description: '+{value} pts si un Français finit dans le top 5 Senior 20"', trigger: { type: 'NATION_COUNT_IN_TOP', nation: 'FRA', category: 'SENIOR_20', top: 5, min: 1 }, reward: { type: 'FLAT_POINTS', value: 30 } },
  { description: '+{value} pts si un Espagnol gagne en Senior 26"', trigger: { type: 'CATEGORY_WINNER_NATION', category: 'SENIOR_26', nation: 'ESP' }, reward: { type: 'FLAT_POINTS', value: 30 } },
  { description: '+{value} pts si une outsider (cote 2,0 ou plus) gagne en Elite Femmes', trigger: { type: 'CATEGORY_WINNER_OUTSIDER', category: 'ELITE_WOMEN', minCote: 2.0 }, reward: { type: 'FLAT_POINTS', value: 40 } },
  { description: "+{value} sur toute l'équipe", trigger: { type: 'ALWAYS' }, reward: { type: 'TEAM_MULTIPLIER', value: 0.03 } },
];

function buildCards(riders) {
  const card = (type, key, name, subject, rarities, effect) => ({
    id: `${type.toLowerCase()}-${EDITION}-${key}`, type, edition: EDITION, name, subject, rarities, effects: [effect],
  });
  const cards = [];
  riders.filter((r) => r.active).forEach((r) => {
    const index = Number(r.id.split('-').pop());
    cards.push(card('PILOT', r.id, r.name, r.id, index <= 3 ? ['C', 'R', 'E', 'L'] : ['C', 'R', 'E'], pilotEffect(index)));
  });
  riders.filter((r) => !r.active).forEach((r) => {
    cards.push(card('PILOT', r.id, r.name, r.id, ['R', 'E', 'L'],
      { description: '+{value} pts à chaque manche', trigger: { type: 'ALWAYS' }, reward: { type: 'FLAT_POINTS', value: 30 } }));
  });
  TECHNIQUES.forEach(([key, label], i) => {
    cards.push(card('TECHNIQUE', key, label, key, i < 2 ? ['C', 'R', 'E', 'L'] : ['C', 'R', 'E'],
      { description: `+{value} pts si le pilote réussit un ${label}`, trigger: { type: 'RIDER_DID_TECHNIQUE', technique: key }, reward: { type: 'FLAT_POINTS', value: 25 } }));
  });
  BRANDS.forEach((brand) => {
    cards.push(card('EQUIPMENT', slug(brand), `Kit ${brand}`, brand, ['C', 'R', 'E'],
      { description: `+{value} sur l'équipe si au moins 2 pilotes roulent pour ${brand}`, trigger: { type: 'TEAM_BRAND_COUNT', brand, min: 2 }, reward: { type: 'TEAM_MULTIPLIER', value: 0.05 } }));
  });
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20'].forEach((cat) => {
    cards.push(card('EQUIPMENT', slug(cat), `Pneus ${CATEGORY_LABELS[cat]}`, cat, ['C', 'R', 'E'],
      { description: `+{value} sur les points ${CATEGORY_LABELS[cat]}`, trigger: { type: 'ALWAYS' }, reward: { type: 'CATEGORY_MULTIPLIER', category: cat, value: 0.1 } }));
  });
  REFEREES.forEach((name, i) => cards.push(card('REFEREE', slug(name), name, name, ['C', 'R', 'E', 'L'], REFEREE_EFFECTS[i])));
  return cards;
}

function buildDemoPlayer(seasons, riders) {
  const byCat = groupByCategory(riders.filter((r) => r.active));
  const rng = makeRng(2026);
  const strategies = ['EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'];
  const picks = {};
  const collection = emptyCollection();
  let k = 0;
  seasons.forEach((s) => s.events.forEach((e) => {
    if (e.dateTo >= DEMO_PLAYED_BEFORE) return;
    const team = cardTeamFromRiders(generateBotTeam(strategies[k++ % strategies.length], byCat, rng), EDITION);
    picks[e.id] = team;
    Object.values(team.slots).forEach(({ cardId, rarity }) => {
      if (!(collection.owned[cardId] || {})[rarity]) collection.owned = addCard(collection.owned, cardId, rarity);
    });
  }));
  return { name: 'Démo', picks, collection };
}

const riders = buildRiders();
const seasons = buildSeasons(riders);
const cards = buildCards(riders);
const demoPlayer = buildDemoPlayer(seasons, riders);
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'seasons.json'), JSON.stringify(seasons, null, 2));
fs.writeFileSync(path.join(dir, 'cards.json'), JSON.stringify(cards, null, 2));
fs.writeFileSync(path.join(dir, 'demoPlayer.json'), JSON.stringify(demoPlayer, null, 2));
console.log(`Wrote ${riders.length} riders, ${seasons.length} seasons, ${cards.length} cards, ${Object.keys(demoPlayer.picks).length} demo picks to src/data/seed/`);
