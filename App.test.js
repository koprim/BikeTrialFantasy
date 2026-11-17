import React from 'react';
import { render } from '@testing-library/react-native';

import App from './App';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

test('app renders the tab bar', async () => {
  const { findByLabelText } = render(<App />);
  expect(await findByLabelText('Onglet Jouer')).toBeTruthy();
});
