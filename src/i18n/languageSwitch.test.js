import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import App from '../../App';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

test('choosing English in the rules switches the tabs to English', async () => {
  render(<App api={inMemoryDemoApi()} />);
  fireEvent.press(await screen.findByLabelText('Onglet Règles'));
  fireEvent.press(await screen.findByText('English'));
  expect(await screen.findByLabelText('Tab Play')).toBeTruthy();
});
