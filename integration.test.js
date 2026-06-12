import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';

// Verifies the core navigation wiring end-to-end (Home -> Briefing -> Compose),
// confirming context state, seed data, and screen-to-screen navigation connect.
test('navigates Home -> Briefing -> Compose and renders the 6 typed slots', async () => {
  render(<App />);

  fireEvent.press(await screen.findByText('Commencer la saison'));
  fireEvent.press(await screen.findByText('Composer mon équipe'));

  expect(await screen.findByText('Senior 26"')).toBeTruthy();
  expect(screen.getByText('Junior 26"')).toBeTruthy();
  expect(screen.getByText('Senior 20"')).toBeTruthy();
  expect(screen.getByText('Junior 20"')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (1)')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (2)')).toBeTruthy();
  expect(screen.getByText("Verrouiller l'équipe")).toBeTruthy();
});
