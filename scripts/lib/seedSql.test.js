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
    seasons: [{ id: '2026', name: 'Saison 2026', events: [{ id: '2026-r1', name: 'M1', venue: 'Les Gets', country: 'FRA', round: 1, dateFrom: '2026-10-18', dateTo: '2026-10-19', referee: 'M. Durand' }] }],
    riders: [{ id: 'r1', name: 'Pilote', country: 'FRA', category: 'SENIOR_26', brand: 'Torq', cote: 1, uciRank: 3, active: true }],
    cards: [{ id: 'pilot-2026-r1', type: 'PILOT', edition: '2026', name: 'Pilote', subject: 'r1', rarities: ['C', 'R'], effects: [] }],
    balance: { pack: { size: 5 } },
  });
  expect(sql).toContain("insert into public.seasons (id, name) values\n  ('2026', 'Saison 2026');");
  expect(sql).toContain("('r1', 'Pilote', 'FRA', 'SENIOR_26', 'Torq', 1, 3, true)");
  expect(sql).toContain("('2026-r1', '2026', 'M1', 'Les Gets', 'FRA', 1, '2026-10-18', '2026-10-19', 'M. Durand')");
  expect(sql).toContain("array['C', 'R']::text[]");
  expect(sql).toContain(`(1, '{"pack":{"size":5}}'::jsonb)`);
});
