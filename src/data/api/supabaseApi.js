const { toWalletState, toPicks } = require('../../backend/mappers');

const CACHE_KEY = 'sfbt:supabase-cache:v1';

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
      player: { name: profile.display_name },
      picks: toPicks(teams),
      collection: toWalletState(wallet, owned).collection,
      simulatedDate: allowSimulatedDate && setting ? setting.value : null,
    };
  }

  return { currentUser, fetchPlayerState };
}

async function loadWithOfflineCache(fetchPlayerState, storage) {
  try {
    const state = await fetchPlayerState();
    await storage.setItem(CACHE_KEY, JSON.stringify(state));
    return state;
  } catch (error) {
    const cached = await storage.getItem(CACHE_KEY);
    if (cached) return { ...JSON.parse(cached), offline: true };
    throw error;
  }
}

// Existing saved account on a new browser: magic link; the guest session of this browser is replaced on return.
function createAccountActions(client, emailRedirectTo) {
  const outcome = (error, code) =>
    error ? { ok: false, error: code, details: error.message } : { ok: true, patch: {} };
  return {
    async account() {
      const { data } = await client.auth.getUser();
      if (!data.user) return null;
      const { is_anonymous: isAnonymous, email, new_email: pendingEmail } = data.user;
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

  const collectionAction = (name) => async (body) => {
    const result = await invokeFunction(client, name, body);
    return result.ok ? { ok: true, patch: { collection: result.data.collection } } : result;
  };

  return {
    features: { simulatedDate: allowSimulatedDate, reset: false, account: true },
    load: () => loadWithOfflineCache(fetchPlayerState, storage),
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
      const user = await currentUser();
      const { error } = await client.from('profiles').update({ display_name: name }).eq('user_id', user.id);
      return error ? { ok: false, error: 'NETWORK' } : { ok: true, patch: { player: { name } } };
    },
    async setSimulatedDate(date) {
      const result = await invokeFunction(client, 'set-simulated-date', { date });
      if (!result.ok) return result;
      return { ok: true, patch: { simulatedDate: result.data.simulatedDate, collection: result.data.collection } };
    },
    async reset() {
      return { ok: false, error: 'NOT_AVAILABLE' };
    },
    ...createAccountActions(client, emailRedirectTo),
  };
}

module.exports = { createSupabaseApi };
