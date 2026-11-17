import { DEMO_PLAYER, EVENTS_BY_ID, RIDERS_BY_ID, CARDS, CARDS_BY_ID, BALANCE, EDITION } from '../data/index';
import { eventStatus, today, dayBefore } from '../engine/calendar';
import { openStarter, openDailyPack, recycle, craft } from '../engine/collection';
import { makeRng, hashString } from '../engine/rng';
import { migrateSave } from './migrate';
import { validateCardTeam } from '../engine/team';

export const initialState = {
  player: { name: DEMO_PLAYER.name },
  picks: DEMO_PLAYER.picks, // { [eventId]: card Team }
  simulatedDate: null, // null = real date, else 'YYYY-MM-DD'
  collection: DEMO_PLAYER.collection, // see src/engine/collection.js
};

// Returns the same state object when the collection did not change, so no-op actions do not re-render.
function withCollection(state, collection) {
  return collection === state.collection ? state : { ...state, collection };
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SAVE_TEAM': {
      const { eventId, team, now } = action.payload;
      const event = EVENTS_BY_ID[eventId];
      if (!team) return state;
      if (!event || eventStatus(event, now) !== 'open') return state;
      const check = validateCardTeam(team, {
        cardsById: CARDS_BY_ID,
        ridersById: RIDERS_BY_ID,
        owned: state.collection.owned,
        balance: BALANCE,
      });
      if (!check.valid) return state;
      return { ...state, picks: { ...state.picks, [eventId]: team } };
    }
    case 'SET_NAME':
      return { ...state, player: { name: action.payload.name } };
    case 'SET_SIMULATED_DATE': {
      const date = action.payload.date;
      const effective = date || today();
      const last = state.collection.lastPackDate;
      // Going back in time must not lock the daily pack behind a future date.
      const collection =
        last && effective <= last ? { ...state.collection, lastPackDate: dayBefore(effective) } : state.collection;
      return { ...state, simulatedDate: date, collection };
    }
    case 'OPEN_STARTER':
      return withCollection(
        state,
        openStarter(
          state.collection,
          { cards: CARDS, ridersById: RIDERS_BY_ID },
          makeRng(hashString(`starter#${state.player.name}`)),
        ),
      );
    case 'OPEN_DAILY_PACK':
      return withCollection(
        state,
        openDailyPack(state.collection, action.payload.now, { cards: CARDS, balance: BALANCE }),
      );
    case 'RECYCLE':
      return withCollection(state, recycle(state.collection, action.payload.cardId, action.payload.rarity, BALANCE));
    case 'CRAFT':
      return withCollection(
        state,
        craft(state.collection, CARDS_BY_ID[action.payload.cardId], action.payload.rarity, BALANCE),
      );
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
