import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { GameProvider } from './GameContext';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';

function renderProvider(api) {
  return render(
    <GameProvider api={api}>
      <Text>Contenu du jeu</Text>
    </GameProvider>,
  );
}

test('a failed load shows a connection alert instead of the game', async () => {
  renderProvider({ ...inMemoryDemoApi(), load: async () => Promise.reject(new Error('Failed to fetch')) });
  expect(await screen.findByRole('alert', { name: /Connexion impossible/ })).toBeTruthy();
  expect(screen.queryByText('Contenu du jeu')).toBeNull();
});

test('offline data shows a non-blocking notice above the game', async () => {
  const demo = inMemoryDemoApi();
  renderProvider({ ...demo, load: async () => ({ ...(await demo.load()), offline: true }) });
  expect(await screen.findByText('Contenu du jeu')).toBeTruthy();
  expect(
    screen.getByRole('alert', { name: 'Hors ligne : dernières données connues. Les actions sont indisponibles.' }),
  ).toBeTruthy();
});

test('online data shows no notice', async () => {
  renderProvider(inMemoryDemoApi());
  expect(await screen.findByText('Contenu du jeu')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});
