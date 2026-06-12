import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { saveState, loadState } from './persistence';

const initialState = {
  player: null,        // { name }
  season: [],          // Event[]
  rivals: [],          // Rival[]
  currentIndex: 0,
  picks: {},           // { [eventId]: Team }
  outcomes: {},        // { [eventId]: EventOutcome }
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_SEASON':
      return { ...state, player: { name: action.payload.name }, season: action.payload.season, rivals: action.payload.rivals, currentIndex: 0, picks: {}, outcomes: {} };
    case 'LOCK_TEAM':
      return { ...state, picks: { ...state.picks, [action.payload.eventId]: action.payload.team }, outcomes: { ...state.outcomes, [action.payload.eventId]: action.payload.outcome } };
    case 'ADVANCE':
      return { ...state, currentIndex: state.currentIndex + 1 };
    case 'RESET':
      return initialState;
    case 'HYDRATE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  useEffect(() => { loadState().then((saved) => { if (saved) dispatch({ type: 'HYDRATE', payload: saved }); }); }, []);
  useEffect(() => { saveState(state); }, [state]);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { gameReducer, initialState };
