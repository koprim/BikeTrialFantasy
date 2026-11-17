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
  return { context: { json: async () => ({ error: code, details }) } };
}

function createFakeSupabaseClient({ session = null, tables = {}, functions = {}, failReads = false } = {}) {
  const data = { ...DEFAULT_TABLES, ...tables };
  const state = { session, user: session ? session.user : null, authError: null };
  const calls = { anonymousSignIns: 0, invocations: [], updateUser: [], signInWithOtp: [], updates: [] };

  function query(rows) {
    const run = (result) => (failReads ? { data: null, error: new Error('offline') } : { data: result, error: null });
    return {
      then: (resolve, reject) => Promise.resolve(run(rows)).then(resolve, reject),
      single: async () => run(rows[0] || null),
      maybeSingle: async () => run(rows[0] || null),
    };
  }

  const authResult = (payload) =>
    state.authError ? { data: null, error: state.authError } : { data: payload, error: null };

  const auth = {
    async getSession() {
      return { data: { session: state.session } };
    },
    async signInAnonymously() {
      calls.anonymousSignIns += 1;
      state.user = { id: GUEST_ID, is_anonymous: true, email: null };
      state.session = { user: state.user };
      return { data: { user: state.user, session: state.session }, error: null };
    },
    async getUser() {
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
            return { error: failReads ? new Error('offline') : null };
          },
        }),
      };
    },
    functions: {
      async invoke(name, { body }) {
        calls.invocations.push({ name, body });
        const handler = functions[name];
        if (!handler) return { data: null, error: new Error('Failed to send a request to the Edge Function') };
        return handler(body);
      },
    },
  };
}

module.exports = { createFakeSupabaseClient, httpError, GUEST_ID };
