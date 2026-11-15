import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';
import { STORAGE_KEY } from './src/state/persistence';
import { initialState } from './src/state/GameContext';

// Freeze "now" at 2026-11-15: 2025 archived, 2026-27 rounds 1-2 done, 3-4 open.
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState, simulatedDate: '2026-11-15' }));
});

test('season home shows date-driven statuses', async () => {
  render(<App />);
  expect(await screen.findByText('Coupe du Monde 2026-27')).toBeTruthy();
  expect(screen.getAllByText(/^Terminée · \d+ pts$/)).toHaveLength(2);
  expect(screen.getAllByText('Ouverte · à composer')).toHaveLength(2);
});

test('open event: Briefing -> Compose shows the 6 typed slots', async () => {
  render(<App />);
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  expect(await screen.findByText('Senior 26"')).toBeTruthy();
  expect(screen.getByText('Junior 26"')).toBeTruthy();
  expect(screen.getByText('Senior 20"')).toBeTruthy();
  expect(screen.getByText('Junior 20"')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (1)')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (2)')).toBeTruthy();
  expect(screen.getByText("Enregistrer l'équipe")).toBeTruthy();
});

test('4 tabs; history lists the archived 2025 season', async () => {
  render(<App />);
  expect(await screen.findByLabelText('Onglet Jouer')).toBeTruthy();
  ['Onglet Classement', 'Onglet Historique', 'Onglet Règles'].forEach((label) => {
    expect(screen.getByLabelText(label)).toBeTruthy();
  });
  fireEvent.press(screen.getByLabelText('Onglet Historique'));
  expect(await screen.findByText('Coupe du Monde 2025')).toBeTruthy();
  expect(screen.getByText(/^Archivée · /)).toBeTruthy();
});
