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

beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState, simulatedDate: '2026-11-15' }));
});

test('collection tab: open the daily pack once, see 5 revealed cards', async () => {
  render(<App />);
  fireEvent.press(await screen.findByLabelText('Onglet Collection'));
  expect(await screen.findByText(/^Fragments : 0$/)).toBeTruthy();
  fireEvent.press(screen.getByText('Ouvrir le pack du jour'));
  expect(await screen.findByText('Pack du jour')).toBeTruthy();
  expect(screen.getAllByLabelText(/^Carte révélée/)).toHaveLength(5);
  fireEvent.press(screen.getByText('Voir ma collection'));
  expect(await screen.findByText('Prochain pack demain')).toBeTruthy();
});

test('collection tab: the starter pack gives 10 cards', async () => {
  render(<App />);
  fireEvent.press(await screen.findByLabelText('Onglet Collection'));
  fireEvent.press(await screen.findByText('Ouvrir le pack de départ'));
  expect(await screen.findByText('Pack de départ')).toBeTruthy();
  expect(screen.getAllByLabelText(/^Carte révélée/)).toHaveLength(10);
});

test('card detail shows each rarity with its effect; crafting needs fragments', async () => {
  render(<App />);
  fireEvent.press(await screen.findByLabelText('Onglet Collection'));
  fireEvent.press(await screen.findByText('Techniques'));
  fireEvent.press((await screen.findAllByLabelText('Gap Commune'))[0]);
  expect(await screen.findByText('+25 pts si le pilote réussit un Gap')).toBeTruthy();   // Commune
  expect(screen.getByText('+75 pts si le pilote réussit un Gap')).toBeTruthy();          // Légendaire
  expect(screen.getAllByText(/^Fabriquer · \d+ fragments$/).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(/^Fabriquer .* indisponible$/).length).toBe(4);        // 0 fragments
});
