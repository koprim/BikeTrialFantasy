import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import App from './App';
import { STORAGE_KEY } from './src/state/persistence';
import { initialState } from './src/state/GameContext';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

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
  expect(await screen.findByText('+25 pts si le pilote réussit un Gap')).toBeTruthy(); // Commune
  expect(screen.getByText('+75 pts si le pilote réussit un Gap')).toBeTruthy(); // Légendaire
  expect(screen.getAllByText(/^Fabriquer · \d+ fragments$/).length).toBeGreaterThan(0);
  expect(screen.getAllByLabelText(/^Fabriquer .* indisponible$/).length).toBe(4); // 0 fragments
});

test('compose: pick an owned pilot card; team section has equipment and referee', async () => {
  render(<App />);
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  expect(await screen.findByText('Équipements (0/2)')).toBeTruthy();
  expect(screen.getByText('Choisir un arbitre…')).toBeTruthy();
  fireEvent.press(screen.getByText('Senior 26"'));
  const options = await screen.findAllByLabelText(/^Choisir .* Commune$/);
  fireEvent.press(options[0]);
  expect(await screen.findByText(/^\+ Technique \(0\/1\)$/)).toBeTruthy();
});

test('a finished event lists the triggered effects', async () => {
  render(<App />);
  fireEvent.press(await screen.findByText(/^Manche 1 · /));
  expect(await screen.findByText('Effets déclenchés')).toBeTruthy();
});

test('flow: open the daily pack, then its cards are offered when composing a team', async () => {
  const { CARDS } = require('./src/data/index');
  const byName = Object.fromEntries(CARDS.map((c) => [c.name, c]));
  render(<App />);
  fireEvent.press(await screen.findByLabelText('Onglet Collection'));
  fireEvent.press(await screen.findByText('Ouvrir le pack du jour'));
  expect(await screen.findByText('Pack du jour')).toBeTruthy();
  const revealed = screen.getAllByLabelText(/^Carte révélée/).map((n) => {
    const label = n.props.accessibilityLabel.replace(/^Carte révélée /, '');
    const rarity = label.split(' ').pop();
    return {
      name: label.slice(0, label.length - rarity.length - 1),
      rarity,
      type: byName[label.slice(0, label.length - rarity.length - 1)].type,
    };
  });
  fireEvent.press(screen.getByText('Voir ma collection'));

  fireEvent.press(await screen.findByLabelText('Onglet Jouer'));
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  await screen.findByText('Équipements (0/2)');

  // Open the picker that matches a card of the pack (equipment, referee, technique, else pilot).
  const target = ['EQUIPMENT', 'REFEREE', 'TECHNIQUE', 'PILOT']
    .map((t) => revealed.find((c) => c.type === t))
    .find(Boolean);
  if (target.type === 'EQUIPMENT') fireEvent.press(screen.getByText('+ Équipement'));
  else if (target.type === 'REFEREE') fireEvent.press(screen.getByText('Choisir un arbitre…'));
  else if (target.type === 'TECHNIQUE') {
    fireEvent.press(screen.getByText('Senior 26"'));
    fireEvent.press((await screen.findAllByLabelText(/^Choisir .* Commune$/))[0]);
    fireEvent.press(await screen.findByText(/^\+ Technique \(0\//));
  } else {
    const { RIDERS_BY_ID } = require('./src/data/index');
    const slot =
      { SENIOR_26: 'Senior 26"', JUNIOR_26: 'Junior 26"', SENIOR_20: 'Senior 20"', JUNIOR_20: 'Junior 20"' }[
        RIDERS_BY_ID[byName[target.name].subject].category
      ] || 'Elite Women 1';
    fireEvent.press(screen.getByText(slot));
  }
  expect((await screen.findAllByLabelText(`Choisir ${target.name} ${target.rarity}`)).length).toBeGreaterThan(0);
});
