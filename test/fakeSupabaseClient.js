// In-memory stand-in for the supabase-js client: implements only what supabaseApi uses.
const GUEST_ID = 'guest-1';

const DEFAULT_TABLES = {
  profiles: [{ user_id: GUEST_ID, display_name: 'Joueur' }],
  wallets: [
    {
      user_id: GUEST_ID,
      fragments: 0,
      pity_e: 0,
      pity_l: 0,
      packs_opened: 0,
      last_pack_date: null,
      starter_given: false,
      version: 0,
    },
  ],
  owned_cards: [],
  teams: [],
  app_settings: [],
};

// Mimics supabase-js FunctionsHttpError: the HTTP response lives in error.context.
function httpError(code, details) {
  return Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: { json: async () => ({ error: code, details }) },
  });
}

// FunctionsHttpError for a response without the functions' {error} body (gateway 401, boot crash, HTML 502...).
function rawHttpError(status, readBody) {
  return Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: { status, json: readBody },
  });
}

// Mimics supabase-js FunctionsFetchError: the request never reached the server (context is the fetch TypeError).
function fetchError() {
  return Object.assign(new Error('Failed to send a request to the Edge Function'), {
    name: 'FunctionsFetchError',
    context: new TypeError('Failed to fetch'),
  });
}

// Mimics supabase-js auth when the network is down.
function authFetchError() {
  return Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError', status: 0 });
}

// Mimics PostgREST single() when the result is not exactly one row.
function singleRowError(count) {
  return {
    code: 'PGRST116',
    message: 'JSON object requested, multiple (or no) rows returned',
    details: `The result contains ${count} rows`,
    hint: null,
  };
}

function createFakeSupabaseClient({ session = null, tables = {}, functions = {}, offline = false } = {}) {
  const data = { ...DEFAULT_TABLES, ...tables };
  const state = { session, user: session ? session.user : null, authError: null, offline };
  const calls = { anonymousSignIns: 0, invocations: [], updateUser: [], signInWithOtp: [], updates: [] };

  function query(rows) {
    const run = (result, error = null) =>
      state.offline ? { data: null, error: new TypeError('Failed to fetch') } : { data: error ? null : result, error };
    return {
      then: (resolve, reject) => Promise.resolve(run(rows)).then(resolve, reject),
      single: async () => (rows.length === 1 ? run(rows[0]) : run(null, singleRowError(rows.length))),
      maybeSingle: async () => run(rows[0] || null),
    };
  }

  const authResult = (payload) => {
    if (state.offline) return { data: null, error: authFetchError() };
    return state.authError ? { data: null, error: state.authError } : { data: payload, error: null };
  };

  const auth = {
    async getSession() {
      if (state.sessionExpired) return { data: { session: null }, error: authFetchError() };
      return { data: { session: state.session } };
    },
    async signInAnonymously() {
      calls.anonymousSignIns += 1;
      if (state.offline) return { data: { user: null, session: null }, error: authFetchError() };
      state.user = { id: GUEST_ID, is_anonymous: true, email: null };
      state.session = { user: state.user };
      return { data: { user: state.user, session: state.session }, error: null };
    },
    async getUser() {
      if (state.offline) return { data: { user: null }, error: authFetchError() };
      return { data: { user: state.user } };
    },
    async updateUser(attributes, options) {
      calls.updateUser.push({ attributes, options });
      return authResult({ user: state.user });
    },
    async signInWithOtp(credentials) {
      calls.signInWithOtp.push(credentials);
      return authResult({});
    },
  };

  return {
    calls,
    auth,
    goOffline: () => {
      state.offline = true;
    },
    // auth-js getSession() when the access token expired and the refresh could not reach the server.
    expireSessionOffline: () => {
      state.sessionExpired = true;
    },
    failUpdatesWith: (error) => {
      state.updateError = error;
    },
    failAuthWith: (message) => {
      state.authError = new Error(message);
    },
    from(table) {
      const matching = (column, value) => data[table].filter((row) => row[column] === value);
      return {
        select: () => ({ eq: (column, value) => query(matching(column, value)) }),
        update: (values) => ({
          eq: async (column, value) => {
            calls.updates.push({ table, values, column, value });
            matching(column, value).forEach((row) => Object.assign(row, values));
            if (state.offline) return { error: new TypeError('Failed to fetch') };
            return { error: state.updateError || null };
          },
        }),
      };
    },
    functions: {
      async invoke(name, { body }) {
        calls.invocations.push({ name, body });
        const handler = functions[name];
        if (state.offline || !handler) return { data: null, error: fetchError() };
        return handler(body);
      },
    },
  };
}

module.exports = { createFakeSupabaseClient, httpError, rawHttpError, GUEST_ID };
