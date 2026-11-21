import React from 'react';
import { render, screen } from '@testing-library/react-native';
import InfosScreen from './InfosScreen';

test('says the game is in development and shows each language progress', () => {
  render(<InfosScreen />);
  expect(screen.getByText('Le jeu est en développement et mis à jour régulièrement.')).toBeTruthy();
  expect(screen.getByLabelText('Français : 100 % traduit')).toBeTruthy();
  expect(screen.getByText('English')).toBeTruthy();
  expect(screen.getByText('Español')).toBeTruthy();
});
