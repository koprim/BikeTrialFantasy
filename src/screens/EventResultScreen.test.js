import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { GameProvider } from '../state/GameContext';
import EventResultScreen from './EventResultScreen';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';
import { initialState } from '../state/gameReducer';
import { DEMO_PLAYER } from '../data/index';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

// Round 3 runs 2026-11-29 to 2026-11-30: on the 29th it is live, so the locked team is shown without results.
const liveGame = {
  ...initialState,
  simulatedDate: '2026-11-29',
  picks: { ...initialState.picks, '2026-r3': DEMO_PLAYER.picks['2026-r1'] },
};

test('a live round lists the locked team as "card · rarity" labels', async () => {
  render(
    <GameProvider api={inMemoryDemoApi(liveGame)}>
      <EventResultScreen route={{ params: { eventId: '2026-r3' } }} />
    </GameProvider>,
  );
  expect((await screen.findAllByText(/^.+ · Commune$/)).length).toBeGreaterThan(0);
  expect(screen.getByText(/^Résultats après le /)).toBeTruthy();
});
