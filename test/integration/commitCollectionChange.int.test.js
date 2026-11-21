const { serviceClient, anonClient, newPlayer } = require('../supabaseTestKit');

const service = serviceClient();
const INSUFFICIENT_PRIVILEGE = '42501';
const RAISE_EXCEPTION = 'P0001';
const NO_DATA_FOUND = 'P0002';
const INVALID_PARAMETER = '22023';
const CARD = {
  id: 'test-rpc-card',
  type: 'EQUIPMENT',
  edition: '2026',
  name: { fr: 'Test' },
  subject_id: null,
  rarities: ['C', 'R'],
  effects: [],
};
const WALLET = { fragments: 10, pityE: 1, pityL: 1, packsOpened: 1, lastPackDate: '2026-11-17', starterGiven: true };

beforeAll(async () => {
  const { error } = await service.from('cards').upsert(CARD);
  if (error) throw error;
});

afterAll(async () => {
  const { error: ownedError } = await service.from('owned_cards').delete().eq('card_id', CARD.id);
  if (ownedError) throw ownedError;
  const { error: cardError } = await service.from('cards').delete().eq('id', CARD.id);
  if (cardError) throw cardError;
});

const commit = (userId, overrides = {}) =>
  service.rpc('commit_collection_change', {
    p_user_id: userId,
    p_expected_version: 0,
    p_wallet: WALLET,
    p_owned_deltas: [{ card_id: CARD.id, rarity: 'C', delta: 2 }],
    p_opening: null,
    ...overrides,
  });

async function commitOk(userId, overrides) {
  const { data, error } = await commit(userId, overrides);
  expect(error).toBeNull();
  expect(data).toBe('ok');
}

const ownedCount = async (userId) => {
  const { data, error } = await service
    .from('owned_cards')
    .select('count')
    .eq('user_id', userId)
    .eq('card_id', CARD.id);
  if (error) throw error;
  return data.length ? data[0].count : 0;
};
const wallet = async (userId) => {
  const { data, error } = await service.from('wallets').select('*').eq('user_id', userId).single();
  if (error) throw error;
  return data;
};

test('applies deltas and wallet, and bumps the version', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId);
  expect(await ownedCount(userId)).toBe(2);
  expect(await wallet(userId)).toMatchObject({
    fragments: 10,
    packs_opened: 1,
    last_pack_date: '2026-11-17',
    version: 1,
  });
});

test('refuses a stale version without changing anything', async () => {
  const { userId } = await newPlayer();
  const { data, error } = await commit(userId, { p_expected_version: 5 });
  expect(error).toBeNull();
  expect(data).toBe('conflict');
  expect(await ownedCount(userId)).toBe(0);
  expect((await wallet(userId)).version).toBe(0);
});

test('refuses a second daily pack for the same date', async () => {
  const { userId } = await newPlayer();
  const opening = { kind: 'daily', packDate: '2026-11-17', cards: [] };
  await commitOk(userId, { p_opening: opening });
  const { data, error } = await commit(userId, { p_expected_version: 1, p_opening: opening });
  expect(error).toBeNull();
  expect(data).toBe('duplicate');
  expect(await ownedCount(userId)).toBe(2);
  expect((await wallet(userId)).version).toBe(1);
});

test('refuses a second starter even on another day', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId, { p_opening: { kind: 'starter', packDate: '2026-11-17', cards: [] } });
  const second = await commit(userId, {
    p_expected_version: 1,
    p_opening: { kind: 'starter', packDate: '2026-11-18', cards: [] },
  });
  expect(second.error).toBeNull();
  expect(second.data).toBe('duplicate');
});

test('removes rows that reach zero', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId);
  await commitOk(userId, { p_expected_version: 1, p_owned_deltas: [{ card_id: CARD.id, rarity: 'C', delta: -2 }] });
  const { data } = await service.from('owned_cards').select('count').eq('user_id', userId);
  expect(data).toEqual([]);
});

test('rolls back everything when a count would go below zero', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId);
  const below = await commit(userId, {
    p_expected_version: 1,
    p_wallet: { ...WALLET, fragments: 99 },
    p_owned_deltas: [{ card_id: CARD.id, rarity: 'C', delta: -3 }],
  });
  expect(below.error).toMatchObject({ code: RAISE_EXCEPTION, message: 'insufficient cards' });
  expect(await ownedCount(userId)).toBe(2);
  expect(await wallet(userId)).toMatchObject({ fragments: 10, version: 1 });
});

test('raises when removing a card the player does not own', async () => {
  const { userId } = await newPlayer();
  const { error } = await commit(userId, { p_owned_deltas: [{ card_id: CARD.id, rarity: 'C', delta: -1 }] });
  expect(error).toMatchObject({ code: RAISE_EXCEPTION, message: 'insufficient cards' });
  expect(await ownedCount(userId)).toBe(0);
  expect((await wallet(userId)).version).toBe(0);
});

test('players and anonymous callers cannot call it', async () => {
  const { client, userId } = await newPlayer();
  const args = { p_user_id: userId, p_expected_version: 0, p_wallet: WALLET, p_owned_deltas: [], p_opening: null };
  expect((await client.rpc('commit_collection_change', args)).error.code).toBe(INSUFFICIENT_PRIVILEGE);
  expect((await anonClient().rpc('commit_collection_change', args)).error.code).toBe(INSUFFICIENT_PRIVILEGE);
});

test('refuses a null expected version instead of bypassing the lock', async () => {
  const { userId } = await newPlayer();
  const { data, error } = await commit(userId, { p_expected_version: null });
  expect(error).toBeNull();
  expect(data).toBe('conflict');
  expect(await ownedCount(userId)).toBe(0);
});

test('rejects a wallet missing a key, but allows an explicit null lastPackDate', async () => {
  const { userId } = await newPlayer();
  const { lastPackDate, ...incomplete } = WALLET;
  const missing = await commit(userId, { p_wallet: incomplete });
  expect(missing.error.code).toBe(INVALID_PARAMETER);
  expect((await wallet(userId)).version).toBe(0);
  await commitOk(userId, { p_wallet: { ...WALLET, lastPackDate: null } });
  expect((await wallet(userId)).last_pack_date).toBeNull();
});

test('raises a stable error for an unknown wallet', async () => {
  const { error } = await commit('00000000-0000-0000-0000-000000000000');
  expect(error.code).toBe(NO_DATA_FOUND);
});

test('removes several deltas on the same owned row', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId);
  await commitOk(userId, {
    p_expected_version: 1,
    p_owned_deltas: [
      { card_id: CARD.id, rarity: 'C', delta: -1 },
      { card_id: CARD.id, rarity: 'C', delta: -1 },
    ],
  });
  expect(await ownedCount(userId)).toBe(0);
});

test('nets mixed deltas on the same new row', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId, {
    p_owned_deltas: [
      { card_id: CARD.id, rarity: 'C', delta: 3 },
      { card_id: CARD.id, rarity: 'C', delta: -1 },
    ],
  });
  expect(await ownedCount(userId)).toBe(2);
});

test('adds several positive deltas on the same row', async () => {
  const { userId } = await newPlayer();
  await commitOk(userId, {
    p_owned_deltas: [
      { card_id: CARD.id, rarity: 'C', delta: 1 },
      { card_id: CARD.id, rarity: 'C', delta: 2 },
    ],
  });
  expect(await ownedCount(userId)).toBe(3);
});
