const { serviceClient, newPlayer } = require('../supabaseTestKit');

const service = serviceClient();
const CARD = { id: 'test-ref-card', type: 'EQUIPMENT', edition: '2026', name: 'Test', subject_id: null, rarities: ['C'], effects: [] };

beforeAll(async () => {
  const { error } = await service.from('cards').upsert(CARD);
  if (error) throw error;
});
afterAll(() => service.from('cards').delete().eq('id', CARD.id));

test('players can read the catalog', async () => {
  const { client } = await newPlayer();
  const { data, error } = await client.from('cards').select('id').eq('id', CARD.id);
  expect(error).toBeNull();
  expect(data).toEqual([{ id: CARD.id }]);
});

test.each(['seasons', 'riders', 'competitions', 'cards', 'balance', 'app_settings'])(
  'players cannot write %s',
  async (table) => {
    const { client } = await newPlayer();
    const { error } = await client.from(table).insert({});
    expect(error).not.toBeNull();
    expect(error.code).toBe('42501');
  },
);
