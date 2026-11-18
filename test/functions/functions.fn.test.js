const { newPlayer } = require('../supabaseTestKit');

const errorCode = async (error) => (await error.context.json()).error;

test('starter then daily pack through the deployed functions', async () => {
  const { client } = await newPlayer();
  const starter = await client.functions.invoke('open-starter', { body: {} });
  expect(starter.error).toBeNull();
  expect(starter.data.collection.starterGiven).toBe(true);
  const again = await client.functions.invoke('open-starter', { body: {} });
  expect(await errorCode(again.error)).toBe('STARTER_ALREADY_OPENED');
  const daily = await client.functions.invoke('open-daily-pack', { body: {} });
  expect(daily.data.collection.lastPack).toHaveLength(5);
});

test('functions reject anonymous callers without a session', async () => {
  const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/open-daily-pack`, { method: 'POST' });
  expect(response.status).toBe(401);
});
