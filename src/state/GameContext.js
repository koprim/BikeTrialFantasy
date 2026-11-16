import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { saveState, loadState } from './persistence';
import { DEMO_PLAYER, EVENTS_BY_ID, RIDERS_BY_ID, RIDERS_BY_CATEGORY, CARDS, CARDS_BY_ID, BALANCE, EDITION } from '../data/index';
import { eventStatus, today } from '../engine/calendar';
import { openStarter, openDailyPack, recycle, craft } from '../engine/collection';
import { makeRng, hashString } from '../engine/rng';
import { migrateSave } from './migrate';

const initialState = {
  player: { name: DEMO_PLAYER.name },
  picks: DEMO_PLAYER.picks,           // { [eventId]: card Team }
  simulatedDate: null,                // null = real date, else 'YYYY-MM-DD'
  collection: DEMO_PLAYER.collection, // see src/engine/collection.js
};

// Returns the same state object when the collection did not change, so no-op actions do not re-render.
function withCollection(state, collection) {
  return collection === state.collection ? state : { ...state, collection };
}

function gameReducer(state, action) {
  switch (action.type) {
    case 'SAVE_TEAM': {
      const { eventId, team, now } = action.payload;
      const event = EVENTS_BY_ID[eventId];
      if (!event || eventStatus(event, now) !== 'open') return state;
      return { ...state, picks: { ...state.picks, [eventId]: team } };
    }
    case 'SET_NAME':
      return { ...state, player: { name: action.payload.name } };
    case 'SET_SIMULATED_DATE':
      return { ...state, simulatedDate: action.payload.date };
    case 'OPEN_STARTER':
      return withCollection(state, openStarter(state.collection, { cards: CARDS, ridersById: RIDERS_BY_ID },
        makeRng(hashString(`starter#${state.player.name}`))));
    case 'OPEN_DAILY_PACK':
      return withCollection(state, openDailyPack(state.collection, action.payload.now, { cards: CARDS, balance: BALANCE }));
    case 'RECYCLE':
      return withCollection(state, recycle(state.collection, action.payload.cardId, action.payload.rarity, BALANCE));
    case 'CRAFT':
      return withCollection(state, craft(state.collection, CARDS_BY_ID[action.payload.cardId], action.payload.rarity, BALANCE));
    case 'RESET':
      return initialState;
    case 'HYDRATE': {
      const migrated = migrateSave(action.payload, { edition: EDITION, demoCollection: DEMO_PLAYER.collection });
      return migrated ? { ...state, ...migrated } : state;
    }
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    loadState().then((saved) => {
      if (saved) dispatch({ type: 'HYDRATE', payload: saved });
      setHydrated(true);
    });
  }, []);
  // Save only after hydration so the initial demo state never overwrites a real save.
  useEffect(() => { if (hydrated) saveState(state); }, [state, hydrated]);
  if (!hydrated) return null;
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
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
    picks: state.picks, playerName: state.player.name, now,
    ridersById: RIDERS_BY_ID, ridersByCategory: RIDERS_BY_CATEGORY, cardsById: CARDS_BY_ID, balance: BALANCE, edition: EDITION,
  };
}

export { gameReducer, initialState };
