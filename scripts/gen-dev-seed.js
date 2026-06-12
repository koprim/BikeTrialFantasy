// Synthesizes a fully playable dev season so the app runs before real CSVs exist.
// Replace by running `npm run build:seed` once real data/dev CSVs are filled.
const fs = require('fs');
const path = require('path');
const { coteFromRank } = require('../src/engine/cote');
const { CATEGORIES } = require('../src/engine/team');
const { makeRng } = require('../src/engine/rng');

const competitions = require('../data/competitions-2026.json');
const COUNTRIES = ['FRA', 'GBR', 'ESP', 'GER', 'SUI', 'POL', 'CZE', 'BEL'];

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

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

function buildSeason(riders) {
  const byCat = {};
  CATEGORIES.forEach((c) => { byCat[c] = riders.filter((r) => r.category === c); });
  const playable = competitions.competitions.filter((c) => c.playable && c.class === 'CDM');
  return playable.map((c, idx) => {
    const rng = makeRng((c.round || idx + 1) * 17);
    const results = {};
    CATEGORIES.forEach((cat) => {
      const ids = byCat[cat].map((r) => r.id);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      results[cat] = ids;
    });
    return { id: c.id, name: c.name, venue: c.venue, country: c.country, dateFrom: c.dateFrom, round: c.round || idx + 1, results };
  });
}

const riders = buildRiders();
const season = buildSeason(riders);
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'season.json'), JSON.stringify(season, null, 2));
console.log(`Wrote ${riders.length} riders and ${season.length} events to src/data/seed/`);
