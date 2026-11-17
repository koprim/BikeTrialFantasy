import { gameReducer, initialState } from '../../state/gameReducer';
import { loadState, saveState } from '../../state/persistence';

/**
 * @typedef {{ player: { name: string }, picks: Object, collection: Object, simulatedDate: (string|null) }} PlayerState
 * @typedef {{ ok: true, patch: (Partial<PlayerState>|function(PlayerState): Partial<PlayerState>) }} ApiSuccess
 * @typedef {{ ok: false, error: string, details?: * }} ApiFailure
 * @typedef {ApiSuccess|ApiFailure} ApiResult
 *
 * Contract shared by the demo (local) and Supabase backends. Every action resolves to an ApiResult.
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
 * @property {function(): Promise<(Object|null)>} account
 * @property {function(string): Promise<ApiResult>} saveAccount
 * @property {function(string): Promise<ApiResult>} signIn
 */

const collectionPatch = (state) => ({ collection: state.collection });

// Offline demo backend: the local reducer is the authority and the device storage is the database.
/** @returns {GameApi} */
export function createDemoApi({ storage = { loadState, saveState } } = {}) {
  let state = initialState;

  // The reducer returns the same reference when it refuses an action.
  async function apply(action, toPatch, refusal = 'NOT_ALLOWED') {
    const next = gameReducer(state, action);
    if (next === state) return { ok: false, error: refusal };
    state = next;
    await storage.saveState(state);
    return { ok: true, patch: toPatch(state) };
  }

  return {
    features: { simulatedDate: true, reset: true, account: false },
    async load() {
      const saved = await storage.loadState();
      state = saved ? gameReducer(initialState, { type: 'HYDRATE', payload: saved }) : initialState;
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
      state = initialState;
      await storage.saveState(state);
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
