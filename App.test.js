import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';

test('app renders the Home screen title', async () => {
  const { findByText } = render(<App />);
  expect(await findByText(/Super Fantasy Bike Trial|Commencer|Pseudo/i)).toBeTruthy();
});
