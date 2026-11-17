import React from 'react';
import { Text, Pressable } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { GameProvider, useGame } from './GameContext';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';

const OFFLINE_NOTICE =
  "Hors ligne : dernières données connues. Les actions peuvent échouer tant que la connexion n'est pas revenue.";

function renderProvider(api, children = <Text>Contenu du jeu</Text>) {
  return render(<GameProvider api={api}>{children}</GameProvider>);
}

function offlineApi(overrides = {}) {
  const demo = inMemoryDemoApi();
  return { ...demo, load: async () => ({ ...(await demo.load()), offline: true }), ...overrides };
}

function RenameButton() {
  const { actions } = useGame();
  return (
    <Pressable accessibilityRole="button" onPress={() => actions.setName('Robin')}>
      <Text>Renommer</Text>
    </Pressable>
  );
}

test('a failed load shows a connection alert instead of the game', async () => {
  renderProvider({ ...inMemoryDemoApi(), load: async () => Promise.reject(new Error('Failed to fetch')) });
  expect(await screen.findByRole('alert', { name: /Connexion impossible/ })).toBeTruthy();
  expect(screen.queryByText('Contenu du jeu')).toBeNull();
});

test('offline data shows a non-blocking notice above the game', async () => {
  renderProvider(offlineApi());
  expect(await screen.findByText('Contenu du jeu')).toBeTruthy();
  expect(screen.getByRole('alert', { name: OFFLINE_NOTICE })).toBeTruthy();
});

test('online data shows no notice', async () => {
  renderProvider(inMemoryDemoApi());
  expect(await screen.findByText('Contenu du jeu')).toBeTruthy();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('a successful action clears the offline notice', async () => {
  renderProvider(offlineApi(), <RenameButton />);
  const button = await screen.findByRole('button', { name: 'Renommer' });
  expect(screen.getByRole('alert', { name: OFFLINE_NOTICE })).toBeTruthy();
  await act(async () => fireEvent.press(button));
  expect(screen.queryByRole('alert')).toBeNull();
});

test('a refused action keeps the offline notice', async () => {
  renderProvider(offlineApi({ setName: async () => ({ ok: false, error: 'NETWORK' }) }), <RenameButton />);
  const button = await screen.findByRole('button', { name: 'Renommer' });
  await act(async () => fireEvent.press(button));
  expect(screen.getByRole('alert', { name: OFFLINE_NOTICE })).toBeTruthy();
});
