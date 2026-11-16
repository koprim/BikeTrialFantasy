const { CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateRiderTeam } = require('./team');

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

describe('validateRiderTeam', () => {
  const ridersById = {
    r1: { id: 'r1', category: 'SENIOR_26' }, r2: { id: 'r2', category: 'JUNIOR_26' },
    r3: { id: 'r3', category: 'SENIOR_20' }, r4: { id: 'r4', category: 'JUNIOR_20' },
    r5: { id: 'r5', category: 'ELITE_WOMEN' }, r6: { id: 'r6', category: 'ELITE_WOMEN' },
  };
  const full = { senior26: 'r1', junior26: 'r2', senior20: 'r3', junior20: 'r4', eliteWomen1: 'r5', eliteWomen2: 'r6' };

  test('complete + valid team', () => {
    expect(isTeamComplete(full)).toBe(true);
    expect(validateRiderTeam(full, ridersById)).toEqual({ valid: true, errors: [] });
  });
  test('incomplete team', () => {
    const t = { ...full, eliteWomen2: null };
    expect(isTeamComplete(t)).toBe(false);
    expect(validateRiderTeam(t, ridersById).valid).toBe(false);
  });
  test('duplicate elite women rejected', () => {
    const t = { ...full, eliteWomen2: 'r5' };
    const res = validateRiderTeam(t, ridersById);
    expect(res.valid).toBe(false);
    expect(res.errors.join()).toMatch(/distinct/i);
  });
  test('wrong category in slot rejected', () => {
    const t = { ...full, senior26: 'r2' };
    expect(validateRiderTeam(t, ridersById).valid).toBe(false);
  });
});

const {
  pilotCardId, emptyTeam, cardTeamFromRiders, normalizeTeam, teamRiderIds, validateCardTeam,
} = require('./team');
const { CARDS_BY_ID, RIDERS_BY_ID, BALANCE, EDITION, ridersByCategory } = require('../data/index');

describe('card teams', () => {
  const byCat = ridersByCategory();
  const riderTeam = {
    senior26: byCat.SENIOR_26[0].id, junior26: byCat.JUNIOR_26[0].id, senior20: byCat.SENIOR_20[0].id,
    junior20: byCat.JUNIOR_20[0].id, eliteWomen1: byCat.ELITE_WOMEN[0].id, eliteWomen2: byCat.ELITE_WOMEN[1].id,
  };
  const base = cardTeamFromRiders(riderTeam, EDITION);
  const ownAll = (team) => {
    const owned = {};
    const add = (r) => { owned[r.cardId] = { ...(owned[r.cardId] || {}), [r.rarity]: 1 }; };
    Object.values(team.slots).forEach((e) => { add(e); e.techniques.forEach(add); });
    team.equipment.forEach(add);
    if (team.referee) add(team.referee);
    return owned;
  };
  const check = (team, owned = ownAll(team)) => validateCardTeam(team, { cardsById: CARDS_BY_ID, ridersById: RIDERS_BY_ID, owned, balance: BALANCE });
  const withSlot = (team, slotId, patch) => ({ ...team, slots: { ...team.slots, [slotId]: { ...team.slots[slotId], ...patch } } });

  test('cardTeamFromRiders gives Common pilot cards; normalizeTeam keeps card teams', () => {
    expect(base.slots.senior26).toEqual({ cardId: pilotCardId(EDITION, riderTeam.senior26), rarity: 'C', techniques: [] });
    expect(base.equipment).toEqual([]);
    expect(base.referee).toBeNull();
    expect(normalizeTeam(base, EDITION)).toBe(base);
    expect(normalizeTeam(riderTeam, EDITION)).toEqual(base);
    expect(normalizeTeam(undefined, EDITION)).toBeNull();
    expect(emptyTeam()).toEqual({ slots: {}, equipment: [], referee: null });
  });

  test('teamRiderIds lists the riders behind the pilot cards', () => {
    expect(teamRiderIds(base, CARDS_BY_ID)).toEqual(Object.values(riderTeam));
  });

  test('a full owned team with equipment and referee is valid', () => {
    const team = { ...base, equipment: [{ cardId: 'equipment-2026-alpha', rarity: 'C' }], referee: { cardId: 'referee-2026-m-durand', rarity: 'R' } };
    expect(check(team)).toEqual({ valid: true, errors: [] });
  });

  test('an empty slot is rejected', () => {
    const { senior26, ...rest } = base.slots;
    expect(check({ ...base, slots: rest }).valid).toBe(false);
  });

  test('a card that is not owned is rejected', () => {
    expect(check(base, {}).errors.join()).toMatch(/non possédée/);
  });

  test('a pilot of the wrong category is rejected', () => {
    const team = withSlot(base, 'junior26', { cardId: base.slots.senior26.cardId });
    expect(check(team).errors.join()).toMatch(/mauvaise catégorie/);
  });

  test('the same rider twice is rejected, even at two rarities', () => {
    const team = withSlot(base, 'eliteWomen2', { cardId: base.slots.eliteWomen1.cardId, rarity: 'R' });
    expect(check(team).errors.join()).toMatch(/déjà dans l'équipe/);
  });

  test('technique count is limited by the pilot rarity', () => {
    const two = [{ cardId: 'technique-2026-gap', rarity: 'C' }, { cardId: 'technique-2026-drop', rarity: 'C' }];
    expect(check(withSlot(base, 'senior26', { techniques: two })).errors.join()).toMatch(/trop de techniques/);
    // senior-26-1 has an Épique version: 2 techniques allowed
    expect(check(withSlot(base, 'senior26', { rarity: 'E', techniques: two })).valid).toBe(true);
  });

  test('the same card cannot be used twice in a team', () => {
    const gap = { cardId: 'technique-2026-gap', rarity: 'C' };
    const team = withSlot(withSlot(base, 'senior26', { techniques: [gap] }), 'junior26', { techniques: [gap] });
    expect(check(team).errors.join()).toMatch(/déjà utilisée/);
  });

  test('at most 2 equipment cards', () => {
    const equipment = ['alpha', 'torq', 'grip'].map((b) => ({ cardId: `equipment-2026-${b}`, rarity: 'C' }));
    expect(check({ ...base, equipment }).errors.join()).toMatch(/équipements/);
  });

  test('a rarity the card does not have is rejected', () => {
    const team = withSlot(base, 'senior26', { cardId: pilotCardId(EDITION, byCat.SENIOR_26[7].id), rarity: 'L' });
    expect(check(team).errors.join()).toMatch(/rareté indisponible/);
  });
});
