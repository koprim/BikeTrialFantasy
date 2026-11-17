import { gameReducer, initialState } from '../../state/gameReducer';
import { loadState, saveState } from '../../state/persistence';

/**
 * @typedef {{ player: { name: string }, picks: Object, collection: Object, simulatedDate: (string|null) }} PlayerState
 * @typedef {{ ok: true, patch: (Partial<PlayerState>|function(PlayerState): Partial<PlayerState>) }} ApiSuccess
 * @typedef {{ ok: false, error: ApiErrorCode, details?: * }} ApiFailure
 * @typedef {ApiSuccess|ApiFailure} ApiResult
 *
 * Error codes. Demo: NOT_ALLOWED, ALREADY_OPENED, STARTER_ALREADY_OPENED, NOT_AVAILABLE, STORAGE_FAILED.
 * Server: INVALID_INPUT, INVALID_TEAM, TEAM_LOCKED, NOT_FOUND, FORBIDDEN, BUSY, UNAUTHENTICATED, INTERNAL,
 * NETWORK, ACCOUNT_SAVE_FAILED, SIGN_IN_FAILED.
 * @typedef {string} ApiErrorCode
 *
 * @typedef {{ isAnonymous: boolean, email: (string|null), pendingEmail: (string|null) }} AccountInfo
 *
 * Contract shared by the demo (local) and Supabase backends. Every action resolves to an ApiResult.
 * load() hydrates the player state (the demo backend also self-loads on the first action).
 * reset()'s patch is a full PlayerState; other patches are partial. account() is null without an account.
 * @typedef {Object} GameApi
 * @property {{ simulatedDate: boolean, reset: boolean, account: boolean }} features
 * @property {function(): Promise<PlayerState>} load
 * @property {function(): Promise<ApiResult>} openStarter
 * @property {function({ now: string }): Promise<ApiResult>} openDailyPack
 * @property {function({ cardId: string, rarity: string }): Promise<ApiResult>} recycle
 * @property {function({ cardId: string, rarity: string }): Promise<ApiResult>} craft
 * @property {function({ eventId: string, team: Object, now: string }): Promise<ApiResult>} saveTeam
 * @property {function(string): Promise<ApiResult>} setName
 * @property {function((string|null)): Promise<ApiResult>} setSimulatedDate
 * @property {function(): Promise<ApiResult>} reset
 * @property {function(): Promise<(AccountInfo|null)>} account
 * @property {function(string): Promise<ApiResult>} saveAccount
 * @property {function(string): Promise<ApiResult>} signIn
 */

const collectionPatch = (state) => ({ collection: state.collection });

/**
 * Offline demo backend: the local reducer is the authority and the device storage is the database.
 * @returns {GameApi}
 */
export function createDemoApi({ storage = { loadState, saveState } } = {}) {
  let state = initialState;
  let loading = null;

  // Hydrates once; every action waits for it so initial demo state never overwrites a real save.
  function ensureLoaded() {
    loading ||= storage
      .loadState()
      .then((saved) => {
        state = saved ? gameReducer(initialState, { type: 'HYDRATE', payload: saved }) : initialState;
      })
      .catch((error) => {
        loading = null; // a failed read must not poison later calls
        throw error;
      });
    return loading;
  }

  // The new state is committed in memory only once it is persisted.
  async function commit(next) {
    try {
      await storage.saveState(next);
    } catch {
      return false;
    }
    state = next;
    return true;
  }

  // The reducer returns the same reference when it refuses an action.
  async function apply(action, toPatch, refusal = 'NOT_ALLOWED') {
    await ensureLoaded();
    const next = gameReducer(state, action);
    if (next === state) return { ok: false, error: refusal };
    if (!(await commit(next))) return { ok: false, error: 'STORAGE_FAILED' };
    return { ok: true, patch: toPatch(state) };
  }

  return {
    features: { simulatedDate: true, reset: true, account: false },
    async load() {
      await ensureLoaded();
      return state;
    },
    openStarter: () => apply({ type: 'OPEN_STARTER' }, collectionPatch, 'STARTER_ALREADY_OPENED'),
    openDailyPack: ({ now }) => apply({ type: 'OPEN_DAILY_PACK', payload: { now } }, collectionPatch, 'ALREADY_OPENED'),
    recycle: (cardRef) => apply({ type: 'RECYCLE', payload: cardRef }, collectionPatch),
    craft: (cardRef) => apply({ type: 'CRAFT', payload: cardRef }, collectionPatch),
    saveTeam: ({ eventId, team, now }) =>
      apply({ type: 'SAVE_TEAM', payload: { eventId, team, now } }, (current) => ({ picks: current.picks })),
    setName: (name) => apply({ type: 'SET_NAME', payload: { name } }, (current) => ({ player: current.player })),
    setSimulatedDate: (date) =>
      apply({ type: 'SET_SIMULATED_DATE', payload: { date } }, (current) => ({
        simulatedDate: current.simulatedDate,
        collection: current.collection,
      })),
    async reset() {
      await ensureLoaded();
      if (!(await commit(initialState))) return { ok: false, error: 'STORAGE_FAILED' };
      return { ok: true, patch: state };
    },
    async account() {
      return null;
    },
    async saveAccount() {
      return { ok: false, error: 'NOT_AVAILABLE' };
    },
    async signIn() {
      return { ok: false, error: 'NOT_AVAILABLE' };
    },
  };
}
