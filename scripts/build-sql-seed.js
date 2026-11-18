const fs = require('fs');
const path = require('path');
const { buildSeedSql } = require('./lib/seedSql');

const seed = (name) => require(path.join(__dirname, '..', 'src', 'data', 'seed', `${name}.json`));
const sql = buildSeedSql({ seasons: seed('seasons'), riders: seed('riders'), cards: seed('cards'), balance: seed('balance') });
fs.writeFileSync(path.join(__dirname, '..', 'supabase', 'seed.sql'), sql);
console.log('supabase/seed.sql written');
