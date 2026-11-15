// Synthesizes a playable dev dataset: 2 seasons (2025 archived, 2026-27 current around 2026-11-15)
// plus a demo player who already played the past events. Replace riders/seasons with
// `npm run build:seed` once real data/dev CSVs are filled.
const fs = require('fs');
const path = require('path');
const { coteFromRank } = require('../src/engine/cote');
const { CATEGORIES, groupByCategory } = require('../src/engine/team');
const { generateBotTeam } = require('../src/engine/bots');
const { makeRng } = require('../src/engine/rng');

const COUNTRIES = ['FRA', 'GBR', 'ESP', 'GER', 'SUI', 'POL', 'CZE', 'BEL'];
const VENUES = [['Vic', 'ESP'], ['Andorre', 'AND'], ['Val di Sole', 'ITA'], ['Leogang', 'AUT'],
  ['Les Gets', 'FRA'], ['Châtel', 'FRA'], ['Lenzerheide', 'SUI'], ['Pal Arinsal', 'AND']];
const SEASONS_PLAN = [
  { id: '2025', name: 'Coupe du Monde 2025', dates: ['2025-05-10', '2025-07-05', '2025-08-23', '2025-09-20'] },
  { id: '2026-27', name: 'Coupe du Monde 2026-27', dates: ['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20'] },
];
const DEMO_PLAYED_BEFORE = '2026-11-15'; // the demo player has teams for events finished before this date

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildRiders() {
  const riders = [];
  CATEGORIES.forEach((cat) => {
    for (let i = 1; i <= 8; i++) {
      const uciRank = (i - 1) * 7 + 1; // 1,8,15,22,29,36,43,50 → cote spread
      const name = `${cat.replace('_', ' ')} Pilote ${i}`;
      riders.push({ id: slug(`${cat}-${i}`), name, country: COUNTRIES[i % COUNTRIES.length], category: cat, uciRank, cote: coteFromRank(uciRank) });
    }
  });
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

function buildSeasons(riders) {
  const byCat = groupByCategory(riders);
  let venueIdx = 0;
  return SEASONS_PLAN.map((plan, si) => ({
    id: plan.id,
    name: plan.name,
    events: plan.dates.map((dateFrom, i) => {
      const [venue, country] = VENUES[venueIdx++ % VENUES.length];
      return {
        id: `${plan.id}-r${i + 1}`, name: `${plan.name} — Manche ${i + 1}`, venue, country,
        round: i + 1, dateFrom, dateTo: addDays(dateFrom, 1),
        results: shuffledResults(byCat, (si + 1) * 100 + (i + 1) * 17),
      };
    }),
  }));
}

function buildDemoPlayer(seasons, riders) {
  const byCat = groupByCategory(riders);
  const rng = makeRng(2026);
  const strategies = ['EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'];
  const picks = {};
  let k = 0;
  seasons.forEach((s) => s.events.forEach((e) => {
    if (e.dateTo < DEMO_PLAYED_BEFORE) picks[e.id] = generateBotTeam(strategies[k++ % strategies.length], byCat, rng);
  }));
  return { name: 'Démo', picks };
}

const riders = buildRiders();
const seasons = buildSeasons(riders);
const demoPlayer = buildDemoPlayer(seasons, riders);
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'seasons.json'), JSON.stringify(seasons, null, 2));
fs.writeFileSync(path.join(dir, 'demoPlayer.json'), JSON.stringify(demoPlayer, null, 2));
console.log(`Wrote ${riders.length} riders, ${seasons.length} seasons, ${Object.keys(demoPlayer.picks).length} demo picks to src/data/seed/`);
