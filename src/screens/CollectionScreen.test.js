import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { GameProvider } from '../state/GameContext';
import CollectionScreen from './CollectionScreen';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';
import { deferredCall } from '../testing/deferredCall';

test('a double press on the daily pack opens it once', async () => {
  const { call: openDailyPack, settle } = deferredCall();
  const navigation = { navigate: jest.fn() };
  render(
    <GameProvider api={{ ...inMemoryDemoApi(), openDailyPack }}>
      <CollectionScreen navigation={navigation} />
    </GameProvider>,
  );
  const button = await screen.findByRole('button', { name: 'Ouvrir le pack du jour' });
  fireEvent.press(button);
  fireEvent.press(button);
  expect(screen.getByRole('button', { name: 'Ouvrir le pack du jour', busy: true, disabled: true })).toBeTruthy();
  await act(async () => settle({ ok: true, patch: {} }));
  expect(openDailyPack).toHaveBeenCalledTimes(1);
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
});
