const fs = require('fs');
const path = require('path');
const { buildSeedSql } = require('./lib/seedSql');
const { LANGUAGES } = require('../src/i18n/languages');

const seed = (name) => require(path.join(__dirname, '..', 'src', 'data', 'seed', `${name}.json`));
const sql = buildSeedSql({
  seasons: seed('seasons'),
  riders: seed('riders'),
  cards: seed('cards'),
  balance: seed('balance'),
  texts: Object.fromEntries(LANGUAGES.map((language) => [language.code, language.game])),
});
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'seed.sql'), sql);
console.log('supabase/seed.sql written');
