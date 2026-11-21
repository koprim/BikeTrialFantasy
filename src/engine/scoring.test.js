const { pointsForPosition, positionOf, riderEventScore, teamEventScore } = require('./scoring');

describe('pointsForPosition', () => {
  test('podium values', () => {
    expect(pointsForPosition(1)).toBe(100);
    expect(pointsForPosition(2)).toBe(80);
    expect(pointsForPosition(3)).toBe(65);
    expect(pointsForPosition(10)).toBe(12);
  });
  test('beyond 10 decays by 2, floor 4', () => {
    expect(pointsForPosition(11)).toBe(10);
    expect(pointsForPosition(13)).toBe(6);
    expect(pointsForPosition(20)).toBe(4);
  });
});

describe('positionOf', () => {
  const results = { SENIOR_26: ['a', 'b', 'c'] };
  test('1-based position', () => expect(positionOf('b', 'SENIOR_26', results)).toBe(2));
  test('absent rider → null', () => expect(positionOf('z', 'SENIOR_26', results)).toBeNull());
  test('missing category → null', () => expect(positionOf('a', 'JUNIOR_20', results)).toBeNull());
});

describe('riderEventScore', () => {
  test('points × cote', () => {
    expect(riderEventScore({ cote: 2.5 }, 3)).toBe(162.5);
  });
  test('null position → 0', () => expect(riderEventScore({ cote: 2.5 }, null)).toBe(0));
});

describe('teamEventScore', () => {
  const balance = { rarityMultiplier: { C: 1, R: 1.5, E: 2, L: 3 } };
  const ridersById = {
    r1: { id: 'r1', name: 'R1', category: 'SENIOR_26', cote: 1.0 },
    r2: { id: 'r2', name: 'R2', category: 'JUNIOR_26', cote: 1.3 },
    r3: { id: 'r3', name: 'R3', category: 'SENIOR_20', cote: 1.6 },
    r4: { id: 'r4', name: 'R4', category: 'JUNIOR_20', cote: 2.0 },
    r5: { id: 'r5', name: 'R5', category: 'ELITE_WOMEN', cote: 2.5 },
    r6: { id: 'r6', name: 'R6', category: 'ELITE_WOMEN', cote: 1.0 },
    leg: { id: 'leg', name: 'Legend', category: 'SENIOR_26', cote: 2.5, active: false },
  };
  const always = (reward, description = 'x') => ({ description, trigger: { type: 'ALWAYS' }, reward });
  const pilot = (id, effects = []) => ({
    id: `p-${id}`,
    type: 'PILOT',
    name: id,
    subject: id,
    rarities: ['C'],
    effects,
  });
  const cardsById = Object.fromEntries(
    [
      pilot('r1', [always({ type: 'RIDER_MULTIPLIER', value: 0.1 })]),
      pilot('r2', [
        { description: 'top 1', trigger: { type: 'RIDER_TOP_N', n: 1 }, reward: { type: 'FLAT_POINTS', value: 99 } },
      ]),
      pilot('r3'),
      pilot('r4'),
      pilot('r5'),
      pilot('r6'),
      pilot('leg', [always({ type: 'FLAT_POINTS', value: 30 }, '+{value} pts')]),
      {
        id: 'tech-gap',
        type: 'TECHNIQUE',
        name: 'Gap',
        subject: 'gap',
        rarities: ['C', 'R'],
        effects: [
          {
            description: '+{value} pts',
            trigger: { type: 'RIDER_DID_TECHNIQUE', technique: 'gap' },
            reward: { type: 'FLAT_POINTS', value: 20 },
          },
        ],
      },
      {
        id: 'eq-s26',
        type: 'EQUIPMENT',
        name: 'Pneus',
        subject: 'SENIOR_26',
        rarities: ['C'],
        effects: [always({ type: 'CATEGORY_MULTIPLIER', category: 'SENIOR_26', value: 0.1 })],
      },
      {
        id: 'ref',
        type: 'REFEREE',
        name: 'Arbitre',
        subject: 'Arbitre',
        rarities: ['C'],
        effects: [always({ type: 'TEAM_MULTIPLIER', value: 0.1 })],
      },
    ].map((c) => [c.id, c]),
  );
  const deps = { ridersById, cardsById, balance };
  const slot = (id, techniques = []) => ({ cardId: `p-${id}`, rarity: 'C', techniques });
  const plain = {
    slots: {
      senior26: slot('r1'),
      junior26: slot('r2'),
      senior20: slot('r3'),
      junior20: slot('r4'),
      eliteWomen1: slot('r5'),
      eliteWomen2: slot('r6'),
    },
    equipment: [],
    referee: null,
  };
  const event = {
    results: {
      SENIOR_26: ['r1'],
      JUNIOR_26: ['x', 'r2'],
      SENIOR_20: ['r3'],
      JUNIOR_20: ['x', 'x', 'r4'],
      ELITE_WOMEN: ['r5', 'r6'],
    },
    stats: { r3: { techniques: ['gap'], cleanSections: 5 } },
  };

  test('base score: points × cote over six slots (r1 effect adds 10)', () => {
    const out = teamEventScore(plain, event, deps);
    // 100 + 104 + 160 + 130 + 250 + 80 = 824 base, r1's ALWAYS ×0.1 adds 10
    expect(out.total).toBeCloseTo(834);
    expect(out.breakdown).toHaveLength(6);
    expect(out.breakdown[0]).toMatchObject({
      slotId: 'senior26',
      riderId: 'r1',
      cardId: 'p-r1',
      rarity: 'C',
      position: 1,
    });
    expect(out.effects.map((e) => e.cardId)).toEqual(['p-r1']); // r2 is P2, its top-1 effect does not fire
  });

  test('effects apply in order: rider ×, category ×, team ×, then flat', () => {
    const team = {
      ...plain,
      slots: { ...plain.slots, senior20: slot('r3', [{ cardId: 'tech-gap', rarity: 'R' }]) },
      equipment: [{ cardId: 'eq-s26', rarity: 'C' }],
      referee: { cardId: 'ref', rarity: 'C' },
    };
    const out = teamEventScore(team, event, deps);
    // rider ×: r1 100 → 110 (+10) · category ×: SENIOR_26 110 → 121 (+11) · subtotal 845
    // team ×: +84.5 · flat: Gap at Rare 20 × 1.5 = +30 → 959.5
    expect(out.total).toBeCloseTo(959.5);
    expect(out.effects.map((e) => [e.cardId, Math.round(e.points * 10) / 10])).toEqual([
      ['p-r1', 10],
      ['eq-s26', 11],
      ['ref', 84.5],
      ['tech-gap', 30],
    ]);
    expect(out.effects[3]).toMatchObject({ cardId: 'tech-gap', effectIndex: 0, rarity: 'R', value: '30' });
  });

  test('a legend scores no ranking points but its effect still fires', () => {
    const team = { ...plain, slots: { ...plain.slots, senior26: slot('leg') } };
    const out = teamEventScore(team, event, deps);
    expect(out.breakdown[0]).toMatchObject({ riderId: 'leg', position: null, points: 0 });
    expect(out.effects).toEqual([{ cardId: 'p-leg', effectIndex: 0, rarity: 'C', value: '30', points: 30 }]);
    expect(out.total).toBeCloseTo(724 + 30);
  });

  test('team multipliers of one step add up instead of compounding', () => {
    const cards = { ...cardsById, ref2: { ...cardsById.ref, id: 'ref2' } };
    const team = { ...plain, equipment: [{ cardId: 'ref2', rarity: 'C' }], referee: { cardId: 'ref', rarity: 'C' } };
    const out = teamEventScore(team, event, { ...deps, cardsById: cards });
    const subtotal = 834; // 824 base + r1's rider multiplier
    const gains = out.effects.filter((e) => e.cardId === 'ref' || e.cardId === 'ref2').map((e) => e.points);
    expect(gains).toHaveLength(2);
    gains.forEach((g) => expect(g).toBeCloseTo(subtotal * 0.1));
    expect(out.total).toBeCloseTo(subtotal * 1.2);
  });

  test('an empty team scores 0', () => {
    expect(teamEventScore({ slots: {}, equipment: [], referee: null }, event, deps)).toMatchObject({
      total: 0,
      effects: [],
    });
  });
});
