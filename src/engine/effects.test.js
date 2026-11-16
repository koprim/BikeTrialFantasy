const { TRIGGERS, REWARDS, RIDER_TRIGGERS, evaluateTrigger, scaledValue, describeEffect } = require('./effects');

const balance = { rarityMultiplier: { C: 1, R: 1.5, E: 2, L: 3 } };
const ridersById = {
  a: { id: 'a', category: 'SENIOR_20', country: 'FRA', brand: 'Alpha', cote: 1.0 },
  b: { id: 'b', category: 'SENIOR_20', country: 'FRA', brand: 'Alpha', cote: 2.5 },
  c: { id: 'c', category: 'SENIOR_20', country: 'ESP', brand: 'Torq', cote: 1.3 },
  d: { id: 'd', category: 'ELITE_WOMEN', country: 'GBR', brand: 'Grip', cote: 2.0 },
};
const event = {
  results: { SENIOR_20: ['b', 'a', 'c'], ELITE_WOMEN: ['d'] },
  stats: { a: { techniques: ['gap'], cleanSections: 9 }, b: { techniques: [], cleanSections: 3 } },
};
const ctx = (over = {}) => ({ event, ridersById, riderId: null, teamRiderIds: ['a', 'b', 'c'], ...over });
const on = (trigger, over) => evaluateTrigger(trigger, ctx(over));

test('lists known triggers and rewards', () => {
  expect(TRIGGERS).toHaveLength(8);
  expect(REWARDS).toEqual(['FLAT_POINTS', 'RIDER_MULTIPLIER', 'CATEGORY_MULTIPLIER', 'TEAM_MULTIPLIER']);
  expect(RIDER_TRIGGERS).toEqual(['RIDER_TOP_N', 'RIDER_DID_TECHNIQUE', 'RIDER_CLEAN_MIN']);
});

test('ALWAYS', () => expect(on({ type: 'ALWAYS' })).toBe(true));

test('RIDER_TOP_N', () => {
  expect(on({ type: 'RIDER_TOP_N', n: 2 }, { riderId: 'a' })).toBe(true);
  expect(on({ type: 'RIDER_TOP_N', n: 1 }, { riderId: 'a' })).toBe(false);
  expect(on({ type: 'RIDER_TOP_N', n: 3 }, { riderId: null })).toBe(false);
});

test('RIDER_DID_TECHNIQUE', () => {
  expect(on({ type: 'RIDER_DID_TECHNIQUE', technique: 'gap' }, { riderId: 'a' })).toBe(true);
  expect(on({ type: 'RIDER_DID_TECHNIQUE', technique: 'gap' }, { riderId: 'b' })).toBe(false);
  expect(on({ type: 'RIDER_DID_TECHNIQUE', technique: 'gap' }, { riderId: 'd' })).toBe(false); // no stats
});

test('RIDER_CLEAN_MIN', () => {
  expect(on({ type: 'RIDER_CLEAN_MIN', min: 8 }, { riderId: 'a' })).toBe(true);
  expect(on({ type: 'RIDER_CLEAN_MIN', min: 8 }, { riderId: 'b' })).toBe(false);
});

test('NATION_COUNT_IN_TOP', () => {
  expect(on({ type: 'NATION_COUNT_IN_TOP', nation: 'FRA', category: 'SENIOR_20', top: 2, min: 2 })).toBe(true);
  expect(on({ type: 'NATION_COUNT_IN_TOP', nation: 'FRA', category: 'SENIOR_20', top: 1, min: 2 })).toBe(false);
});

test('CATEGORY_WINNER_NATION', () => {
  expect(on({ type: 'CATEGORY_WINNER_NATION', category: 'SENIOR_20', nation: 'FRA' })).toBe(true);
  expect(on({ type: 'CATEGORY_WINNER_NATION', category: 'SENIOR_20', nation: 'ESP' })).toBe(false);
  expect(on({ type: 'CATEGORY_WINNER_NATION', category: 'JUNIOR_20', nation: 'FRA' })).toBe(false);
});

test('TEAM_BRAND_COUNT', () => {
  expect(on({ type: 'TEAM_BRAND_COUNT', brand: 'Alpha', min: 2 })).toBe(true);
  expect(on({ type: 'TEAM_BRAND_COUNT', brand: 'Torq', min: 2 })).toBe(false);
});

test('CATEGORY_WINNER_OUTSIDER', () => {
  expect(on({ type: 'CATEGORY_WINNER_OUTSIDER', category: 'SENIOR_20', minCote: 2.0 })).toBe(true);
  expect(on({ type: 'CATEGORY_WINNER_OUTSIDER', category: 'ELITE_WOMEN', minCote: 2.5 })).toBe(false);
});

test('unknown trigger never fires', () => expect(on({ type: 'NOPE' })).toBe(false));

test('scaledValue multiplies the reward by the rarity multiplier', () => {
  expect(scaledValue({ type: 'FLAT_POINTS', value: 40 }, 'L', balance)).toBe(120);
  expect(scaledValue({ type: 'RIDER_MULTIPLIER', value: 0.1 }, 'R', balance)).toBeCloseTo(0.15);
});

test('describeEffect fills {value}: points for flat, percent for multipliers', () => {
  const flat = { description: '+{value} pts si un Français gagne', trigger: { type: 'ALWAYS' }, reward: { type: 'FLAT_POINTS', value: 40 } };
  expect(describeEffect(flat, 'C', balance)).toBe('+40 pts si un Français gagne');
  expect(describeEffect(flat, 'L', balance)).toBe('+120 pts si un Français gagne');
  const mult = { description: '+{value} sur ses points', trigger: { type: 'ALWAYS' }, reward: { type: 'RIDER_MULTIPLIER', value: 0.1 } };
  expect(describeEffect(mult, 'R', balance)).toBe('+15 % sur ses points');
  expect(describeEffect(mult, 'L', balance)).toBe('+30 % sur ses points');
});
