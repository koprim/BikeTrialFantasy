const { serviceClient, newPlayer } = require('../supabaseTestKit');

const service = serviceClient();
const INSUFFICIENT_PRIVILEGE = '42501';

test('a new account gets a profile and an empty wallet', async () => {
  const { client, userId } = await newPlayer();
  const { data: profile } = await client.from('profiles').select('display_name').eq('user_id', userId).single();
  const { data: wallet } = await client.from('wallets').select('*').eq('user_id', userId).single();
  expect(profile.display_name).toBe('Joueur');
  expect(wallet).toMatchObject({ fragments: 0, pity_e: 0, pity_l: 0, packs_opened: 0, starter_given: false, version: 0 });
});

test("a player cannot read another player's data", async () => {
  const alice = await newPlayer();
  const bob = await newPlayer();
  for (const table of ['profiles', 'wallets', 'owned_cards', 'pack_openings', 'teams']) {
    const { data } = await alice.client.from(table).select('*').eq('user_id', bob.userId);
    expect({ table, rows: data }).toEqual({ table, rows: [] });
  }
});

test('a player cannot write game state directly', async () => {
  const { client, userId } = await newPlayer();
  const attempts = [
    client.from('wallets').update({ fragments: 9999 }).eq('user_id', userId),
    client.from('owned_cards').insert({ user_id: userId, card_id: 'x', rarity: 'L', count: 1 }),
    client.from('pack_openings').insert({ user_id: userId, kind: 'daily', pack_date: '2026-01-01', cards: [] }),
    client.from('teams').insert({ user_id: userId, competition_id: 'x', team: {} }),
  ];
  for (const { error } of await Promise.all(attempts)) {
    expect(error).not.toBeNull();
    expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  }
  const { data: wallet } = await service.from('wallets').select('fragments').eq('user_id', userId).single();
  expect(wallet.fragments).toBe(0);
});

test('a player can rename only their own profile', async () => {
  const alice = await newPlayer();
  const bob = await newPlayer();
  await alice.client.from('profiles').update({ display_name: 'Alice' }).eq('user_id', alice.userId);
  await alice.client.from('profiles').update({ display_name: 'Pirate' }).eq('user_id', bob.userId);
  const { data } = await service.from('profiles').select('user_id, display_name').in('user_id', [alice.userId, bob.userId]);
  const names = Object.fromEntries(data.map((row) => [row.user_id, row.display_name]));
  expect(names).toEqual({ [alice.userId]: 'Alice', [bob.userId]: 'Joueur' });
});
