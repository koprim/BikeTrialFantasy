const { serviceClient, anonClient, newPlayer } = require('../supabaseTestKit');

const service = serviceClient();
const INSUFFICIENT_PRIVILEGE = '42501';
const OWNED_TABLES = ['profiles', 'wallets', 'owned_cards', 'pack_openings', 'teams'];

const SEASON = { id: 'test-player-season', name: 'Test season' };
const COMPETITION = {
  id: 'test-player-competition',
  season_id: SEASON.id,
  name: 'Test competition',
  date_from: '2026-01-01',
  date_to: '2026-01-02',
};
const CARD = { id: 'test-player-card', type: 'EQUIPMENT', edition: '2026', name: 'Test', subject_id: null, rarities: ['C'], effects: [] };

let bob;

async function mustSucceed(promise) {
  const { error } = await promise;
  if (error) throw error;
}

beforeAll(async () => {
  await mustSucceed(service.from('seasons').upsert(SEASON));
  await mustSucceed(service.from('competitions').upsert(COMPETITION));
  await mustSucceed(service.from('cards').upsert(CARD));
  bob = await newPlayer();
  await mustSucceed(service.from('owned_cards').insert({ user_id: bob.userId, card_id: CARD.id, rarity: 'C', count: 1 }));
  await mustSucceed(service.from('pack_openings').insert({ user_id: bob.userId, kind: 'daily', pack_date: '2026-01-01', cards: [] }));
  await mustSucceed(service.from('teams').insert({ user_id: bob.userId, competition_id: COMPETITION.id, team: {} }));
});

afterAll(async () => {
  await mustSucceed(service.from('teams').delete().eq('user_id', bob.userId));
  await mustSucceed(service.from('pack_openings').delete().eq('user_id', bob.userId));
  await mustSucceed(service.from('owned_cards').delete().eq('user_id', bob.userId));
  await mustSucceed(service.from('competitions').delete().eq('id', COMPETITION.id));
  await mustSucceed(service.from('seasons').delete().eq('id', SEASON.id));
  await mustSucceed(service.from('cards').delete().eq('id', CARD.id));
});

test('a new account gets a profile and an empty wallet', async () => {
  const { client, userId } = await newPlayer();
  const { data: profile } = await client.from('profiles').select('display_name').eq('user_id', userId).single();
  const { data: wallet } = await client.from('wallets').select('*').eq('user_id', userId).single();
  expect(profile.display_name).toBe('Joueur');
  expect(wallet).toMatchObject({ fragments: 0, pity_e: 0, pity_l: 0, packs_opened: 0, starter_given: false, version: 0 });
});

test("a player cannot read another player's data", async () => {
  const alice = await newPlayer();
  for (const table of OWNED_TABLES) {
    const own = await bob.client.from(table).select('*').eq('user_id', bob.userId);
    expect({ table, error: own.error }).toEqual({ table, error: null });
    expect({ table, count: own.data.length }).toEqual({ table, count: 1 });

    const foreign = await alice.client.from(table).select('*').eq('user_id', bob.userId);
    expect({ table, error: foreign.error }).toEqual({ table, error: null });
    expect({ table, rows: foreign.data }).toEqual({ table, rows: [] });
  }
});

test('a player cannot write game state directly', async () => {
  const { client, userId } = await newPlayer();
  const attempts = [
    client.from('wallets').update({ fragments: 9999 }).eq('user_id', userId),
    client.from('wallets').delete().eq('user_id', userId),
    client.from('profiles').update({ created_at: '2000-01-01T00:00:00Z' }).eq('user_id', userId),
    client.from('profiles').delete().eq('user_id', userId),
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
  const { data: profile } = await service.from('profiles').select('user_id').eq('user_id', userId);
  expect(profile).toHaveLength(1);
});

test('a player can rename only their own profile', async () => {
  const alice = await newPlayer();
  const bobPlayer = await newPlayer();
  const rename = await alice.client.from('profiles').update({ display_name: 'Alice' }).eq('user_id', alice.userId);
  expect(rename.error).toBeNull();
  await alice.client.from('profiles').update({ display_name: 'Pirate' }).eq('user_id', bobPlayer.userId);
  const { data } = await service.from('profiles').select('user_id, display_name').in('user_id', [alice.userId, bobPlayer.userId]);
  const names = Object.fromEntries(data.map((row) => [row.user_id, row.display_name]));
  expect(names).toEqual({ [alice.userId]: 'Alice', [bobPlayer.userId]: 'Joueur' });
});

test('a signed-out client cannot read wallets', async () => {
  const { data, error } = await anonClient().from('wallets').select('*');
  expect(error).not.toBeNull();
  expect(error.code).toBe(INSUFFICIENT_PRIVILEGE);
  expect(data).toBeNull();
});
