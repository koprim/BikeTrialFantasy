const {
  pointsForPosition, positionOf, riderEventScore, teamEventScore,
} = require('./scoring');

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
  const ridersById = {
    r1: { id: 'r1', name: 'R1', category: 'SENIOR_26', cote: 1.0 },
    r2: { id: 'r2', name: 'R2', category: 'JUNIOR_26', cote: 1.3 },
    r3: { id: 'r3', name: 'R3', category: 'SENIOR_20', cote: 1.6 },
    r4: { id: 'r4', name: 'R4', category: 'JUNIOR_20', cote: 2.0 },
    r5: { id: 'r5', name: 'R5', category: 'ELITE_WOMEN', cote: 2.5 },
    r6: { id: 'r6', name: 'R6', category: 'ELITE_WOMEN', cote: 1.0 },
  };
  const team = { senior26: 'r1', junior26: 'r2', senior20: 'r3', junior20: 'r4', eliteWomen1: 'r5', eliteWomen2: 'r6' };
  const event = { results: {
    SENIOR_26: ['r1'], JUNIOR_26: ['x', 'r2'], SENIOR_20: ['r3'],
    JUNIOR_20: ['x', 'x', 'r4'], ELITE_WOMEN: ['r5', 'r6'],
  } };
  test('sums all six slots', () => {
    const out = teamEventScore(team, ridersById, event);
    expect(out.total).toBe(824);
    expect(out.breakdown).toHaveLength(6);
    expect(out.breakdown[0]).toMatchObject({ slotId: 'senior26', position: 1, points: 100 });
  });
});
