const { CARD_TYPES, validateCatalog } = require('./catalog');

const ridersById = { r1: { id: 'r1' } };
const effect = { description: '+{value} pts', trigger: { type: 'ALWAYS' }, reward: { type: 'FLAT_POINTS', value: 10 } };
const pilot = {
  id: 'p1',
  type: 'PILOT',
  edition: '2026',
  name: 'P1',
  subject: 'r1',
  rarities: ['C', 'R'],
  effects: [effect],
};

test('card types', () => expect(CARD_TYPES).toEqual(['PILOT', 'TECHNIQUE', 'EQUIPMENT', 'REFEREE']));

test('a valid catalog has no errors', () => {
  expect(validateCatalog([pilot], ridersById)).toEqual([]);
});

test.each([
  ['duplicate id', [pilot, pilot], /double/],
  ['unknown type', [{ ...pilot, type: 'X' }], /type inconnu/],
  ['unordered rarities', [{ ...pilot, rarities: ['R', 'C'] }], /raretés/],
  ['empty rarities', [{ ...pilot, rarities: [] }], /raretés/],
  ['unknown rider', [{ ...pilot, subject: 'zz' }], /pilote inconnu/],
  ['missing description', [{ ...pilot, effects: [{ ...effect, description: '' }] }], /description/],
  ['unknown trigger', [{ ...pilot, effects: [{ ...effect, trigger: { type: 'NOPE' } }] }], /déclencheur inconnu/],
  [
    'unknown reward',
    [{ ...pilot, effects: [{ ...effect, reward: { type: 'NOPE', value: 1 } }] }],
    /récompense inconnue/,
  ],
  [
    'rider trigger on equipment',
    [{ ...pilot, id: 'e1', type: 'EQUIPMENT', effects: [{ ...effect, trigger: { type: 'RIDER_TOP_N', n: 3 } }] }],
    /déclencheur pilote/,
  ],
  [
    'rider multiplier on referee',
    [
      {
        ...pilot,
        id: 'f1',
        type: 'REFEREE',
        effects: [{ ...effect, reward: { type: 'RIDER_MULTIPLIER', value: 0.1 } }],
      },
    ],
    /multiplicateur pilote/,
  ],
])('%s is reported', (_, cards, pattern) => {
  expect(validateCatalog(cards, ridersById).join('\n')).toMatch(pattern);
});
