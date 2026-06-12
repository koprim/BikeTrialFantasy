import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';

test('app renders the Home screen start button', async () => {
  const { findByText } = render(<App />);
  // Unique signal that the Home screen mounted and rendered without crashing.
  expect(await findByText('Commencer la saison')).toBeTruthy();
});
