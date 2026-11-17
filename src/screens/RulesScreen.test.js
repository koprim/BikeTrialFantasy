import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from '../state/GameContext';
import RulesScreen from './RulesScreen';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';

jest.mock('../ui/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

function renderRules(api = inMemoryDemoApi()) {
  return render(
    <NavigationContainer>
      <GameProvider api={api}>
        <RulesScreen />
      </GameProvider>
    </NavigationContainer>,
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

test('server mode hides the simulated date and reset, and offers to save the account', async () => {
  renderRules({ ...inMemoryDemoApi(), features: { simulatedDate: false, reset: false, account: true } });
  expect(await screen.findByText('Sauvegarder mon compte')).toBeTruthy();
  expect(screen.queryByPlaceholderText('AAAA-MM-JJ')).toBeNull();
  expect(screen.queryByText('Réinitialiser la partie')).toBeNull();
});

test('demo mode has no account button', async () => {
  renderRules();
  expect(await screen.findByPlaceholderText('AAAA-MM-JJ')).toBeTruthy();
  expect(screen.queryByText('Sauvegarder mon compte')).toBeNull();
});

test('a refused rename shows the reason', async () => {
  renderRules({ ...inMemoryDemoApi(), setName: async () => ({ ok: false, error: 'NETWORK' }) });
  fireEvent.changeText(await screen.findByDisplayValue('Démo'), 'Zoé');
  fireEvent.press(screen.getByText('Enregistrer le pseudo'));
  expect(await screen.findByText('Connexion impossible. Vérifie ta connexion.')).toBeTruthy();
  expect(screen.getByText('Pseudo actuel : Démo')).toBeTruthy();
});
