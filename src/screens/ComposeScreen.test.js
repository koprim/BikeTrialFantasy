import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import App from '../../App';
import { GameProvider } from '../state/GameContext';
import ComposeScreen from './ComposeScreen';
import { deferredCall } from '../testing/deferredCall';
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

test('the pilot picker leaves out a rider already placed in another slot', async () => {
  render(
    <GameProvider api={inMemoryDemoApi(savedGame)}>
      <ComposeScreen navigation={{ popToTop: jest.fn() }} route={{ params: { eventId: '2026-r3' } }} />
    </GameProvider>,
  );
  // Round 3 holds Pilote 8 in Elite Femme (1) and Pilote 7 in Elite Femme (2).
  fireEvent.press(await screen.findByText('Elite Femme 20" (2)'));
  expect(await screen.findByRole('button', { name: 'Choisir ELITE WOMEN Pilote 5 Commune' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Choisir ELITE WOMEN Pilote 7 Commune' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Choisir ELITE WOMEN Pilote 8 Commune' })).toBeNull();
});

test('a double press on save sends the team once and leaves once', async () => {
  const { call: saveTeam, settle } = deferredCall();
  const navigation = { popToTop: jest.fn() };
  render(
    <GameProvider api={{ ...inMemoryDemoApi(savedGame), saveTeam }}>
      <ComposeScreen navigation={navigation} route={{ params: { eventId: '2026-r3' } }} />
    </GameProvider>,
  );
  const save = await screen.findByRole('button', { name: /Enregistrer/ });
  fireEvent.press(save);
  fireEvent.press(save);
  expect(screen.getByRole('button', { name: /Enregistrer/, busy: true, disabled: true })).toBeTruthy();
  await act(async () => settle({ ok: true, patch: {} }));
  expect(saveTeam).toHaveBeenCalledTimes(1);
  expect(navigation.popToTop).toHaveBeenCalledTimes(1);
});
