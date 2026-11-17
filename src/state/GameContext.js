import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { saveState, loadState } from './persistence';
import { RIDERS_BY_ID, RIDERS_BY_CATEGORY, CARDS_BY_ID, BALANCE, EDITION } from '../data/index';
import { today } from '../engine/calendar';
import { gameReducer, initialState } from './gameReducer';

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
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);
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

export { gameReducer, initialState };
