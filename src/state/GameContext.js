import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { saveState, loadState } from './persistence';
import { DEMO_PLAYER, EVENTS_BY_ID, RIDERS_BY_ID, RIDERS_BY_CATEGORY, CARDS_BY_ID, BALANCE, EDITION } from '../data/index';
import { eventStatus, today } from '../engine/calendar';

const initialState = {
  player: { name: DEMO_PLAYER.name },
  picks: DEMO_PLAYER.picks,   // { [eventId]: Team }
  simulatedDate: null,        // null = real date, else 'YYYY-MM-DD'
};

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
    case 'RESET':
      return initialState;
    case 'HYDRATE': {
      const saved = action.payload;
      // Saves from the old linear loop (currentIndex/outcomes) are incompatible: start from demo.
      if (!saved || 'currentIndex' in saved || !saved.picks) return state;
      return { ...state, ...saved };
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
