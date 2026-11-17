import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider } from '../state/GameContext';
import RulesScreen from './RulesScreen';

jest.mock('../ui/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

beforeEach(() => AsyncStorage.clear());

function renderRules() {
  return render(
    <GameProvider>
      <RulesScreen />
    </GameProvider>,
  );
}

test('applies and clears a simulated date', async () => {
  renderRules();
  fireEvent.changeText(await screen.findByPlaceholderText('AAAA-MM-JJ'), '2026-11-30');
  fireEvent.press(screen.getByText('Appliquer'));
  expect(await screen.findByText('Date du jeu : 2026-11-30 (simulée)')).toBeTruthy();
  fireEvent.press(screen.getByText("Revenir à aujourd'hui"));
  expect(await screen.findByText(/^Date du jeu : \d{4}-\d{2}-\d{2}$/)).toBeTruthy();
});

test('renames the player and resets after confirmation', async () => {
  renderRules();
  fireEvent.changeText(await screen.findByDisplayValue('Démo'), 'Zoé');
  fireEvent.press(screen.getByText('Enregistrer le pseudo'));
  expect(await screen.findByText('Pseudo actuel : Zoé')).toBeTruthy();
  fireEvent.press(screen.getByText('Réinitialiser la partie'));
  expect(await screen.findByText('Pseudo actuel : Démo')).toBeTruthy();
});

test('rules explain cards, rarities and packs', async () => {
  renderRules();
  expect(await screen.findByText('Cartes et collection')).toBeTruthy();
  expect(screen.getByText(/Une Épique est garantie au moins tous les 10 packs/)).toBeTruthy();
});
