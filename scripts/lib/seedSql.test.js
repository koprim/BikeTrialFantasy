const { buildSeedSql, sqlLiteral } = require('./seedSql');

test('escapes quotes and maps null, numbers and booleans', () => {
  expect(sqlLiteral("L'Ange")).toBe("'L''Ange'");
  expect(sqlLiteral(null)).toBe('null');
  expect(sqlLiteral(undefined)).toBe('null');
  expect(sqlLiteral(1.5)).toBe('1.5');
  expect(sqlLiteral(false)).toBe('false');
});

test('builds one insert per table from the JSON seeds', () => {
  const sql = buildSeedSql({
    seasons: [
      {
        id: '2026',
        name: 'Saison 2026',
        events: [
          {
            id: '2026-r1',
            name: 'M1',
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
        name: 'Pilote',
        subject: 'r1',
        rarities: ['C', 'R'],
        effects: [],
      },
    ],
    balance: { pack: { size: 5 } },
  });
  expect(sql).toContain("insert into public.seasons (id, name) values\n  ('2026', 'Saison 2026');");
  expect(sql).toContain("('r1', 'Pilote', 'FRA', 'SENIOR_26', 'Torq', 1, 3, true)");
  expect(sql).toContain("('2026-r1', '2026', 'M1', 'Les Gets', 'FRA', 1, '2026-10-18', '2026-10-19', 'M. Durand')");
  expect(sql).toContain("array['C', 'R']::text[]");
  expect(sql).toContain(`(1, '{"pack":{"size":5}}'::jsonb)`);
});

describe('fail fast on bad seed values', () => {
  const season = { id: 's', name: 'S', events: [] };
  const rider = { id: 'r1', name: 'P', country: 'FRA', category: 'SENIOR_26', cote: 1, active: true };
  const card = { id: 'c1', type: 'PILOT', edition: '2026', name: 'C', subject: null, rarities: ['C'], effects: [] };
  const build = (overrides) =>
    buildSeedSql({ seasons: [season], riders: [rider], cards: [card], balance: {}, ...overrides });

  test('sqlLiteral rejects non-finite numbers', () => {
    expect(() => sqlLiteral(NaN)).toThrow(/finite/);
    expect(() => sqlLiteral(Infinity)).toThrow(/finite/);
  });

  test('a missing NOT NULL value names the table and id', () => {
    expect(() => build({ riders: [{ ...rider, country: undefined }] })).toThrow(/riders r1.*country/);
    expect(() => build({ cards: [{ ...card, rarities: undefined }] })).toThrow(/cards c1.*rarities/);
    expect(() => build({ cards: [{ ...card, effects: undefined }] })).toThrow(/cards c1.*effects/);
    expect(() => build({ seasons: [{ ...season, name: null }] })).toThrow(/seasons s.*name/);
  });

  test('jsonLiteral doubles quotes and keeps backslashes verbatim', () => {
    const sql = build({ cards: [{ ...card, effects: [{ description: 'L\'Ange 26"' }] }] });
    expect(sql).toContain(String.raw`'[{"description":"L''Ange 26\""}]'::jsonb`);
  });
});

test('the committed supabase/seed.sql is up to date with the JSON seeds', () => {
  const seed = (name) => require(`../../src/data/seed/${name}.json`);
  const expected = buildSeedSql({
    seasons: seed('seasons'),
    riders: seed('riders'),
    cards: seed('cards'),
    balance: seed('balance'),
  });
  const committed = require('fs').readFileSync(
    require('path').join(__dirname, '..', '..', 'supabase', 'seed.sql'),
    'utf8',
  );
  expect(committed).toBe(expected);
});
