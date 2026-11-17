import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import App from '../../App';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';
import { initialState } from '../state/gameReducer';
import { DEMO_PLAYER } from '../data/index';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

// "Now" is 2026-11-15 (round 3 open) and round 3 already holds a valid, owned team, so saving is enabled.
const savedGame = {
  ...initialState,
  simulatedDate: '2026-11-15',
  picks: { ...initialState.picks, '2026-r3': DEMO_PLAYER.picks['2026-r1'] },
};

test('a refused save shows the reason and stays on the compose screen', async () => {
  const api = { ...inMemoryDemoApi(savedGame), saveTeam: async () => ({ ok: false, error: 'TEAM_LOCKED' }) };
  render(<App api={api} />);
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  fireEvent.press(await screen.findByRole('button', { name: /Enregistrer/ }));
  expect(await screen.findByText('La manche a commencé : équipe verrouillée.')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', { name: /Enregistrer/ })).toBeTruthy());
});

test('an accepted save returns to the season home', async () => {
  render(<App api={inMemoryDemoApi(savedGame)} />);
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  fireEvent.press(await screen.findByRole('button', { name: /Enregistrer/ }));
  expect(await screen.findByText('Coupe du Monde 2026')).toBeTruthy();
});
