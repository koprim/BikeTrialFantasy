const { buildSeedSql, sqlLiteral } = require('./seedSql');
const { LANGUAGES } = require('../../src/i18n/languages');

const texts = {
  fr: {
    seasons: { 2026: { name: 'Saison 2026' } },
    events: { '2026-r1': { name: 'M1' } },
    cards: { 'pilot-2026-r1': { name: 'Pilote', effects: [] } },
  },
  en: {
    seasons: { 2026: { name: 'Season 2026' } },
    events: {},
    cards: { 'pilot-2026-r1': { name: '', effects: [] } },
  },
};

test('escapes quotes and maps null, numbers and booleans', () => {
  expect(sqlLiteral("L'Ange")).toBe("'L''Ange'");
  expect(sqlLiteral(null)).toBe('null');
  expect(sqlLiteral(undefined)).toBe('null');
  expect(sqlLiteral(1.5)).toBe('1.5');
  expect(sqlLiteral(false)).toBe('false');
});

test('builds one insert per table from the JSON seeds and the texts', () => {
  const sql = buildSeedSql({
    texts,
    seasons: [
      {
        id: '2026',
        name: 'ignored',
        events: [
          {
            id: '2026-r1',
            name: 'ignored',
            venue: 'Les Gets',
            country: 'FRA',
            round: 1,
            dateFrom: '2026-10-18',
            dateTo: '2026-10-19',
            referee: 'M. Durand',
          },
        ],
      },
    ],
    riders: [
      {
        id: 'r1',
        name: 'Pilote',
        country: 'FRA',
        category: 'SENIOR_26',
        brand: 'Torq',
        cote: 1,
        uciRank: 3,
        active: true,
      },
    ],
    cards: [
      {
        id: 'pilot-2026-r1',
        type: 'PILOT',
        edition: '2026',
        name: 'ignored',
        subject: 'r1',
        rarities: ['C', 'R'],
        effects: [],
      },
    ],
    balance: { pack: { size: 5 } },
  });
  expect(sql).toContain(
    `insert into public.seasons (id, name) values\n  ('2026', '{"fr":"Saison 2026","en":"Season 2026"}'::jsonb);`,
  );
  expect(sql).toContain("('r1', 'Pilote', 'FRA', 'SENIOR_26', 'Torq', 1, 3, true)");
  expect(sql).toContain(
    `('2026-r1', '2026', '{"fr":"M1"}'::jsonb, 'Les Gets', 'FRA', 1, '2026-10-18', '2026-10-19', 'M. Durand')`,
  );
  expect(sql).toContain("array['C', 'R']::text[]");
  // the empty English card name is left out
  expect(sql).toContain(`'{"fr":"Pilote"}'::jsonb`);
  expect(sql).toContain(`(1, '{"pack":{"size":5}}'::jsonb)`);
});

describe('fail fast on bad seed values', () => {
  const season = { id: 's', events: [] };
  const rider = { id: 'r1', name: 'P', country: 'FRA', category: 'SENIOR_26', cote: 1, active: true };
  const card = { id: 'c1', type: 'PILOT', edition: '2026', subject: null, rarities: ['C'], effects: [] };
  const frTexts = (effects) => ({
    fr: { seasons: { s: { name: 'S' } }, cards: { c1: { name: 'C', effects } } },
  });
  const build = (overrides) =>
    buildSeedSql({
      seasons: [season],
      riders: [rider],
      cards: [card],
      balance: {},
      texts: frTexts([]),
      ...overrides,
    });

  test('sqlLiteral rejects non-finite numbers', () => {
    expect(() => sqlLiteral(NaN)).toThrow(/finite/);
    expect(() => sqlLiteral(Infinity)).toThrow(/finite/);
  });

  test('a missing NOT NULL value names the table and id', () => {
    expect(() => build({ riders: [{ ...rider, country: undefined }] })).toThrow(/riders r1.*country/);
    expect(() => build({ cards: [{ ...card, rarities: undefined }] })).toThrow(/cards c1.*rarities/);
    expect(() => build({ cards: [{ ...card, effects: undefined }] })).toThrow(/cards c1.*effects/);
  });

  test('a season with no text in any language names the table and id', () => {
    expect(() => build({ texts: { fr: {}, en: {} } })).toThrow(/seasons s.*name/);
  });

  test('effect descriptions are localized, quotes doubled and backslashes kept verbatim', () => {
    const sql = build({
      cards: [{ ...card, effects: [{ trigger: 'x' }] }],
      texts: frTexts(['L\'Ange 26"']),
    });
    expect(sql).toContain(String.raw`"description":{"fr":"L''Ange 26\""}`);
  });
});

test('the committed supabase/seed.sql is up to date with the JSON seeds', () => {
  const seed = (name) => require(`../../src/data/seed/${name}.json`);
  const expected = buildSeedSql({
    seasons: seed('seasons'),
    riders: seed('riders'),
    cards: seed('cards'),
    balance: seed('balance'),
    texts: Object.fromEntries(LANGUAGES.map((language) => [language.code, language.game])),
  });
  const committed = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'supabase', 'seed.sql'),
    'utf8',
  );
  expect(committed).toBe(expected);
});
