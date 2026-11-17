import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { createApi } from '../data/api';
import { RIDERS_BY_ID, RIDERS_BY_CATEGORY, CARDS_BY_ID, BALANCE, EDITION } from '../data/index';
import { today } from '../engine/calendar';
import { colors, space } from '../ui/theme';

// The GameApi owns the player state and its persistence; the client only mirrors what it returns.
// A patch comes from a successful action, which proves the backend is reachable again: it clears `offline`.
function clientReducer(state, action) {
  switch (action.type) {
    case 'LOADED':
      return action.payload;
    case 'PATCH': {
      const patch = typeof action.payload === 'function' ? action.payload(state) : action.payload;
      return { ...state, ...patch, offline: false };
    }
    default:
      return state;
  }
}

let defaultApi = null;
const getDefaultApi = () => defaultApi || (defaultApi = createApi());

const ACTION_NAMES = [
  'openStarter',
  'openDailyPack',
  'recycle',
  'craft',
  'saveTeam',
  'setName',
  'setSimulatedDate',
  'reset',
  'saveAccount',
  'signIn',
];

/** The ApiResult standing for a call that threw instead of resolving a result (a bug, not a refusal). */
const UNEXPECTED_FAILURE = Object.freeze({ ok: false, error: 'INTERNAL' });

async function resultOf(call, args) {
  try {
    return await call(...args);
  } catch {
    return UNEXPECTED_FAILURE; // reported to the player by the screen like any other failed ApiResult
  }
}

// Each action resolves to the ApiResult, never rejects (screens fire them from button presses);
// a success patches the mirrored state.
function bindActions(api, dispatch) {
  const run =
    (call) =>
    async (...args) => {
      const result = await resultOf(call, args);
      if (result.ok) dispatch({ type: 'PATCH', payload: result.patch });
      return result;
    };
  const actions = Object.fromEntries(ACTION_NAMES.map((name) => [name, run(api[name])]));
  return { ...actions, account: api.account };
}

const GameContext = createContext(null);

/** @param {{ api?: import('../data/api/demoApi').GameApi, children: React.ReactNode }} props */
export function GameProvider({ api: injectedApi, children }) {
  const api = useMemo(() => injectedApi || getDefaultApi(), [injectedApi]);
  const [state, dispatch] = useReducer(clientReducer, null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .load()
      .then((loaded) => active && dispatch({ type: 'LOADED', payload: loaded }))
      .catch(() => active && setLoadFailed(true));
    return () => {
      active = false;
    };
  }, [api]);

  const actions = useMemo(() => bindActions(api, dispatch), [api]);
  const value = useMemo(() => ({ state, actions, features: api.features }), [state, actions, api]);

  if (loadFailed) {
    return (
      <Text accessibilityRole="alert" style={styles.loadError}>
        Connexion impossible. Vérifie ta connexion puis relance l'application.
      </Text>
    );
  }
  if (!state) return null;
  return (
    <GameContext.Provider value={value}>
      {state.offline && (
        <Text accessibilityRole="alert" style={styles.offline}>
          Hors ligne : dernières données connues. Les actions peuvent échouer tant que la connexion n'est pas revenue.
        </Text>
      )}
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within GameProvider');
  return context;
}

export function useNow() {
  const { state } = useGame();
  return state.simulatedDate || today();
}

// Everything the selectors need, in one object.
export function useScoring() {
  const { state } = useGame();
  const now = useNow();
  return {
    picks: state.picks,
    playerName: state.player.name,
    now,
    ridersById: RIDERS_BY_ID,
    ridersByCategory: RIDERS_BY_CATEGORY,
    cardsById: CARDS_BY_ID,
    balance: BALANCE,
    edition: EDITION,
  };
}

const styles = StyleSheet.create({
  loadError: { color: colors.text, padding: space.md, textAlign: 'center' },
  offline: { color: colors.text, backgroundColor: colors.surface, padding: space.xs, textAlign: 'center' },
});
