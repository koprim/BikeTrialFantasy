import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

test('app renders the Home screen title', async () => {
  const { findByText } = render(<App />);
  expect(await findByText(/Super Fantasy Bike Trial|Commencer|Pseudo/i)).toBeTruthy();
});
