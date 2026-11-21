// Real pipeline: reads CSVs (default: data/dev/*.csv) → src/data/seed/*.json.
// Usage: node scripts/build-seed.js [rankingsCsvPath] [resultsCsvPath]
const fs = require('fs');
const path = require('path');
const { parseCsv, buildRiders, buildSeason } = require('../src/data/seedBuilder');
const competitions = require('../data/competitions-2026.json');
const { splitGameTexts, writeFrenchGameTexts } = require('./lib/gameTexts');

const rankingsPath = process.argv[2] || path.join(__dirname, '..', 'data', 'dev', 'rankings.csv');
const resultsPath = process.argv[3] || path.join(__dirname, '..', 'data', 'dev', 'results.csv');

const riders = buildRiders(parseCsv(fs.readFileSync(rankingsPath, 'utf8')));
const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
const competitionsById = Object.fromEntries(competitions.competitions.map((c) => [c.id, c]));
const season = buildSeason(parseCsv(fs.readFileSync(resultsPath, 'utf8')), ridersById, competitionsById);

const seasons = [{ id: String(competitions.season), name: `Coupe du Monde ${competitions.season}`, events: season }];
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'seasons.json'), JSON.stringify(seasons, null, 2));
writeFrenchGameTexts(splitGameTexts({ seasons }).texts);
const demoPath = path.join(dir, 'demoPlayer.json');
if (!fs.existsSync(demoPath)) fs.writeFileSync(demoPath, JSON.stringify({ name: 'Démo', picks: {} }, null, 2));
console.log(`Built ${riders.length} riders and ${season.length} events from CSV.`);
