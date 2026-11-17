const { toWalletState, toPicks } = require('../../backend/mappers');
const { isNetworkError } = require('./networkError');
const { createPlayerCache } = require('./playerCache');

const PG_INSUFFICIENT_PRIVILEGE = '42501';
const PG_CHECK_VIOLATION = '23514';

function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

async function invokeFunction(client, name, body) {
  const { data, error } = await client.functions.invoke(name, { body: body || {} });
  if (!error) return { ok: true, data };
  const hasJson = error.context && typeof error.context.json === 'function';
  const payload = hasJson ? await error.context.json().catch(() => null) : null;
  return { ok: false, error: (payload && payload.error) || 'NETWORK', details: payload ? payload.details : undefined };
}

// Reads go straight to Postgres (RLS); the guest session is created on first use.
function createPlayerReader({ client, allowSimulatedDate }) {
  async function currentUser() {
    const { data } = await client.auth.getSession();
    if (data.session) return data.session.user;
    const { data: signedIn, error } = await client.auth.signInAnonymously();
    if (error) throw error;
    return signedIn.user;
  }

  async function fetchPlayerState() {
    const user = await currentUser();
    const byUser = (table, columns) => client.from(table).select(columns).eq('user_id', user.id);
    const [profile, wallet, owned, teams, setting] = await Promise.all([
      byUser('profiles', 'display_name').single().then(unwrap),
      byUser('wallets', '*').single().then(unwrap),
      byUser('owned_cards', 'card_id, rarity, count').then(unwrap),
      byUser('teams', 'competition_id, team').then(unwrap),
      client.from('app_settings').select('value').eq('key', 'simulated_date').maybeSingle().then(unwrap),
    ]);
    return {
      userId: user.id,
      state: {
        player: { name: profile.display_name },
        picks: toPicks(teams),
        collection: toWalletState(wallet, owned).collection,
        simulatedDate: allowSimulatedDate && setting ? setting.value : null,
      },
    };
  }

  return { currentUser, fetchPlayerState };
}

// Only a network failure falls back to the cache; real errors (RLS, missing row, bugs) must surface.
async function loadWithOfflineCache({ fetchPlayerState, cache, localSessionUser }) {
  try {
    const { userId, state } = await fetchPlayerState();
    await cache.write(userId, state);
    return state;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const localUser = await localSessionUser();
    const cached = await cache.readFor(localUser && localUser.id);
    if (cached) return { ...cached, offline: true };
    throw error;
  }
}

// The session lives in local storage, so it is readable offline.
function createLocalSessionUser(client) {
  return async () => {
    try {
      const { data } = await client.auth.getSession();
      return data.session ? data.session.user : null;
    } catch {
      return null;
    }
  };
}

function toWriteFailure(error) {
  if (isNetworkError(error)) return { ok: false, error: 'NETWORK' };
  const notAllowed = error.code === PG_INSUFFICIENT_PRIVILEGE || error.code === PG_CHECK_VIOLATION;
  return { ok: false, error: notAllowed ? 'NOT_ALLOWED' : 'INTERNAL', details: error.message };
}

// Existing saved account on a new browser: magic link; the guest session of this browser is replaced on return.
function createAccountActions(client, emailRedirectTo, localSessionUser) {
  const outcome = (error, code) =>
    error ? { ok: false, error: code, details: error.message } : { ok: true, patch: {} };
  return {
    // Resolves with the server's view of the user; when it cannot be reached, with the locally known session user;
    // null when there is neither. Never rejects.
    async account() {
      const { data, error } = await client.auth.getUser();
      const user = error ? await localSessionUser() : data.user;
      if (!user) return null;
      const { is_anonymous: isAnonymous, email, new_email: pendingEmail } = user;
      return { isAnonymous: Boolean(isAnonymous), email: email || null, pendingEmail: pendingEmail || null };
    },
    async saveAccount(email) {
      const { error } = await client.auth.updateUser({ email }, { emailRedirectTo });
      return outcome(error, 'ACCOUNT_SAVE_FAILED');
    },
    async signIn(email) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo },
      });
      return outcome(error, 'SIGN_IN_FAILED');
    },
  };
}

// Server-backed GameApi: reads go straight to Postgres (RLS), state changes go through Edge Functions.
/** @returns {import('./demoApi').GameApi} */
function createSupabaseApi({ client, storage, allowSimulatedDate = false, emailRedirectTo }) {
  const { currentUser, fetchPlayerState } = createPlayerReader({ client, allowSimulatedDate });
  const cache = createPlayerCache(storage);
  const localSessionUser = createLocalSessionUser(client);

  const collectionAction = (name) => async (body) => {
    const result = await invokeFunction(client, name, body);
    return result.ok ? { ok: true, patch: { collection: result.data.collection } } : result;
  };

  return {
    features: { simulatedDate: allowSimulatedDate, reset: false, account: true },
    load: () => loadWithOfflineCache({ fetchPlayerState, cache, localSessionUser }),
    openStarter: collectionAction('open-starter'),
    openDailyPack: collectionAction('open-daily-pack'),
    recycle: collectionAction('recycle'),
    craft: collectionAction('craft'),
    async saveTeam({ eventId, team }) {
      const result = await invokeFunction(client, 'save-team', { competitionId: eventId, team });
      if (!result.ok) return result;
      return { ok: true, patch: (state) => ({ picks: { ...state.picks, [eventId]: result.data.team } }) };
    },
    async setName(name) {
      try {
        const user = await currentUser();
        const { error } = await client.from('profiles').update({ display_name: name }).eq('user_id', user.id);
        if (error) throw error;
        return { ok: true, patch: { player: { name } } };
      } catch (error) {
        return toWriteFailure(error);
      }
    },
    async setSimulatedDate(date) {
      const result = await invokeFunction(client, 'set-simulated-date', { date });
      if (!result.ok) return result;
      return { ok: true, patch: { simulatedDate: result.data.simulatedDate, collection: result.data.collection } };
    },
    async reset() {
      return { ok: false, error: 'NOT_AVAILABLE' };
    },
    ...createAccountActions(client, emailRedirectTo, localSessionUser),
  };
}

module.exports = { createSupabaseApi };
