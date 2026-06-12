const { CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateTeam } = require('./team');

test('five categories, six slots', () => {
  expect(CATEGORIES).toHaveLength(5);
  expect(SLOTS).toHaveLength(6);
  expect(SLOTS.filter((s) => s.category === 'ELITE_WOMEN')).toHaveLength(2);
});

test('groupByCategory buckets riders', () => {
  const riders = [
    { id: 'a', category: 'SENIOR_26' },
    { id: 'b', category: 'SENIOR_26' },
    { id: 'c', category: 'ELITE_WOMEN' },
  ];
  const g = groupByCategory(riders);
  expect(g.SENIOR_26.map((r) => r.id)).toEqual(['a', 'b']);
  expect(g.ELITE_WOMEN).toHaveLength(1);
});

describe('validateTeam', () => {
  const ridersById = {
    r1: { id: 'r1', category: 'SENIOR_26' }, r2: { id: 'r2', category: 'JUNIOR_26' },
    r3: { id: 'r3', category: 'SENIOR_20' }, r4: { id: 'r4', category: 'JUNIOR_20' },
    r5: { id: 'r5', category: 'ELITE_WOMEN' }, r6: { id: 'r6', category: 'ELITE_WOMEN' },
  };
  const full = { senior26: 'r1', junior26: 'r2', senior20: 'r3', junior20: 'r4', eliteWomen1: 'r5', eliteWomen2: 'r6' };

  test('complete + valid team', () => {
    expect(isTeamComplete(full)).toBe(true);
    expect(validateTeam(full, ridersById)).toEqual({ valid: true, errors: [] });
  });
  test('incomplete team', () => {
    const t = { ...full, eliteWomen2: null };
    expect(isTeamComplete(t)).toBe(false);
    expect(validateTeam(t, ridersById).valid).toBe(false);
  });
  test('duplicate elite women rejected', () => {
    const t = { ...full, eliteWomen2: 'r5' };
    const res = validateTeam(t, ridersById);
    expect(res.valid).toBe(false);
    expect(res.errors.join()).toMatch(/distinct/i);
  });
  test('wrong category in slot rejected', () => {
    const t = { ...full, senior26: 'r2' };
    expect(validateTeam(t, ridersById).valid).toBe(false);
  });
});
