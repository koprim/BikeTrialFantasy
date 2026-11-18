const { newPlayer } = require('../supabaseTestKit');

test('a visitor gets an anonymous account', async () => {
  const { userId } = await newPlayer();
  expect(userId).toMatch(/^[0-9a-f-]{36}$/);
});