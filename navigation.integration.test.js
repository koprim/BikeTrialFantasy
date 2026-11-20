import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import App from './App';
import { inMemoryDemoApi } from './src/testing/inMemoryDemoApi';
import { initialState } from './src/state/gameReducer';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

// Freeze "now" at 2026-11-15: 2025 archived, 2026 rounds 1-2 done, 3-4 open.
const demoState = { ...initialState, simulatedDate: '2026-11-15' };
const renderApp = (api = inMemoryDemoApi(demoState)) => render(<App api={api} />);

test('history: season list -> season detail -> finished round results', async () => {
  renderApp();
  fireEvent.press(await screen.findByLabelText('Onglet Historique'));
  fireEvent.press(await screen.findByText('Coupe du Monde 2025'));
  // The Jouer tab stays mounted and also lists 2026 rounds: the History stack is rendered last.
  const rounds = await screen.findAllByText(/^Manche 1 · /);
  fireEvent.press(rounds[rounds.length - 1]);
  expect((await screen.findAllByText('Effets déclenchés')).length).toBeGreaterThan(0);
});

test('rules: "Sauvegarder mon compte" opens the account screen in the same stack', async () => {
  const api = {
    ...inMemoryDemoApi(demoState),
    features: { simulatedDate: true, reset: true, account: true },
    account: async () => ({ isAnonymous: true, email: null, pendingEmail: null }),
  };
  renderApp(api);
  fireEvent.press(await screen.findByLabelText('Onglet Règles'));
  fireEvent.press(await screen.findByText('Sauvegarder mon compte'));
  expect(await screen.findByLabelText('Adresse e-mail')).toBeTruthy();
});
