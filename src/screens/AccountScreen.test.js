import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GameProvider } from '../state/GameContext';
import AccountScreen from './AccountScreen';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';

const guest = async () => ({ isAnonymous: true, email: null, pendingEmail: null });

function renderWith(apiOverrides) {
  const api = {
    ...inMemoryDemoApi(),
    features: { simulatedDate: false, reset: false, account: true },
    ...apiOverrides,
  };
  return render(
    <NavigationContainer>
      <GameProvider api={api}>
        <AccountScreen />
      </GameProvider>
    </NavigationContainer>,
  );
}

test('a guest can save their account by e-mail', async () => {
  const saveAccount = jest.fn(async () => ({ ok: true, patch: {} }));
  renderWith({ account: guest, saveAccount });
  expect(await screen.findByText(/compte invité/)).toBeTruthy();
  fireEvent.changeText(screen.getByLabelText('Adresse e-mail'), 'robin@example.com');
  fireEvent.press(screen.getByRole('button', { name: 'Sauvegarder mon compte' }));
  expect(await screen.findByText(/lien de confirmation a été envoyé à robin@example.com/)).toBeTruthy();
  expect(saveAccount).toHaveBeenCalledWith('robin@example.com');
});

test('a guest can sign in to an existing account on this browser', async () => {
  const signIn = jest.fn(async () => ({ ok: true, patch: {} }));
  renderWith({ account: guest, signIn });
  fireEvent.changeText(await screen.findByLabelText('Adresse e-mail'), 'robin@example.com');
  fireEvent.press(screen.getByRole('button', { name: "J'ai déjà un compte" }));
  expect(await screen.findByText(/lien de connexion a été envoyé à robin@example.com/)).toBeTruthy();
  expect(signIn).toHaveBeenCalledWith('robin@example.com');
});

test('a failed account save shows the reason', async () => {
  renderWith({ account: guest, saveAccount: async () => ({ ok: false, error: 'ACCOUNT_SAVE_FAILED' }) });
  fireEvent.changeText(await screen.findByLabelText('Adresse e-mail'), 'robin@example.com');
  fireEvent.press(screen.getByRole('button', { name: 'Sauvegarder mon compte' }));
  expect(await screen.findByText('Impossible de sauvegarder le compte.')).toBeTruthy();
});

test('a saved account shows its e-mail', async () => {
  renderWith({ account: async () => ({ isAnonymous: false, email: 'robin@example.com', pendingEmail: null }) });
  expect(await screen.findByText('Compte sauvegardé : robin@example.com')).toBeTruthy();
});
