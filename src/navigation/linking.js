import { getStateFromPath as defaultGetStateFromPath } from '@react-navigation/native';
import { CARDS_BY_ID, EVENTS_BY_ID, SEASONS } from '../data/index';

// One address per screen, so a page reload stays on the same screen and the browser Back button
// walks the app history. `initialRouteName` keeps each tab's home under a deep screen after a reload.
const config = {
  screens: {
    PlayTab: {
      initialRouteName: 'SeasonHome',
      screens: {
        SeasonHome: '',
        Briefing: 'manche/:eventId',
        Compose: 'manche/:eventId/equipe',
        EventResult: 'manche/:eventId/resultats',
      },
    },
    CollectionTab: {
      path: 'collection',
      initialRouteName: 'Collection',
      screens: { Collection: '', PackReveal: 'pack', CardDetail: 'carte/:cardId' },
    },
    StandingsTab: { path: 'classement', screens: { Standings: '' } },
    HistoryTab: {
      path: 'historique',
      initialRouteName: 'SeasonList',
      screens: { SeasonList: '', SeasonDetail: 'saison/:seasonId', EventResult: 'manche/:eventId' },
    },
    RulesTab: { path: 'regles', initialRouteName: 'Rules', screens: { Rules: '', Account: 'compte', Infos: 'infos' } },
  },
};

const has = (record, id) => Object.hasOwn(record, id);
const SEASON_IDS = new Set(SEASONS.map((season) => season.id));

// An address typed by hand may name a card, round or season that does not exist: screens assume they do.
const PARAM_CHECKS = {
  eventId: (id) => has(EVENTS_BY_ID, id),
  cardId: (id) => has(CARDS_BY_ID, id),
  seasonId: (id) => SEASON_IDS.has(id),
};

function hasOnlyKnownParams(state) {
  return state.routes.every((route) => {
    const paramsOk = Object.entries(route.params || {}).every(([name, value]) => PARAM_CHECKS[name]?.(value) ?? true);
    return paramsOk && (!route.state || hasOnlyKnownParams(route.state));
  });
}

/** Default path parsing, but an unknown id gives no state, so the app opens on its home screen. */
function getStateFromPath(path, options) {
  const state = defaultGetStateFromPath(path, options);
  return state && hasOnlyKnownParams(state) ? state : undefined;
}

export const linking = { prefixes: [], config, getStateFromPath };
