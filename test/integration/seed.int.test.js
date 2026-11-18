const cards = require('../../src/data/seed/cards.json');
const riders = require('../../src/data/seed/riders.json');
const balance = require('../../src/data/seed/balance.json');
const { newPlayer } = require('../supabaseTestKit');
const { BALANCE_VERSION } = require('../../scripts/lib/seedSql');

// Integration suites run serially (maxWorkers: 1) and clean up their 'test-' fixtures,
// so exact seed counts are stable.
test('the dev database is seeded from the JSON seeds', async () => {
  const { client } = await newPlayer();
  const count = async (table) => {
    const { count: rows, error } = await client.from(table).select('*', { count: 'exact', head: true });
    expect(error).toBeNull();
    return rows;
  };
  expect(await count('cards')).toBe(cards.length);
  expect(await count('riders')).toBe(riders.length);
  const { data, error } = await client.from('balance').select('data').eq('version', BALANCE_VERSION).single();
  expect(error).toBeNull();
  expect(data.data.pack.size).toBe(balance.pack.size);
});
