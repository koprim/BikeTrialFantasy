import { getPathFromState } from '@react-navigation/native';
import { linking } from './linking';

const stateFor = (path) => linking.getStateFromPath(path, linking.config);

// The tab and the stack of screens under it, by name, e.g. ['CollectionTab', 'Collection', 'CardDetail'].
function routeNames(state) {
  const tabRoute = state.routes[state.routes.length - 1];
  return [tabRoute.name, ...tabRoute.state.routes.map((route) => route.name)];
}
const topParams = (state) => state.routes[state.routes.length - 1].state.routes.at(-1).params;

test('each tab has its own address', () => {
  expect(routeNames(stateFor('/'))).toEqual(['PlayTab', 'SeasonHome']);
  expect(routeNames(stateFor('/collection'))).toEqual(['CollectionTab', 'Collection']);
  expect(routeNames(stateFor('/classement'))).toEqual(['StandingsTab', 'Standings']);
  expect(routeNames(stateFor('/historique'))).toEqual(['HistoryTab', 'SeasonList']);
  expect(routeNames(stateFor('/regles'))).toEqual(['RulesTab', 'Rules']);
});

test('a deep address keeps the tab home under it, so the header back arrow works after a reload', () => {
  const state = stateFor('/collection/carte/technique-2026-drop');
  expect(routeNames(state)).toEqual(['CollectionTab', 'Collection', 'CardDetail']);
  expect(topParams(state)).toEqual({ cardId: 'technique-2026-drop' });
  expect(routeNames(stateFor('/manche/2026-r3/equipe'))).toEqual(['PlayTab', 'SeasonHome', 'Compose']);
  expect(routeNames(stateFor('/historique/saison/2025'))).toEqual(['HistoryTab', 'SeasonList', 'SeasonDetail']);
  expect(routeNames(stateFor('/regles/compte'))).toEqual(['RulesTab', 'Rules', 'Account']);
});

test('an unknown card, round or season falls back to the home screen', () => {
  expect(stateFor('/collection/carte/inconnue')).toBeUndefined();
  expect(stateFor('/manche/constructor')).toBeUndefined();
  expect(stateFor('/historique/saison/1999')).toBeUndefined();
});

test('a screen gives back the address it was reached from', () => {
  const path = '/historique/manche/2025-r1';
  expect(getPathFromState(stateFor(path), linking.config)).toBe(path);
});
