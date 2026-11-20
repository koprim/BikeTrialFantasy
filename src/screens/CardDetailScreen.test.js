import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { GameProvider } from '../state/GameContext';
import CardDetailScreen from './CardDetailScreen';
import { inMemoryDemoApi } from '../testing/inMemoryDemoApi';
import { initialState } from '../state/gameReducer';
import { confirm } from '../ui/confirm';

jest.mock('../ui/confirm', () => ({ confirm: jest.fn() }));

const CARD_ID = 'technique-2026-drop';

// Two Common "Drop" (one duplicate to recycle) and enough fragments to craft a Common.
const savedGame = {
  ...initialState,
  collection: {
    ...initialState.collection,
    owned: { ...initialState.collection.owned, [CARD_ID]: { C: 2 } },
    fragments: 100,
  },
};

function renderCard() {
  render(
    <GameProvider api={inMemoryDemoApi(savedGame)}>
      <CardDetailScreen route={{ params: { cardId: CARD_ID } }} />
    </GameProvider>,
  );
}

beforeEach(() => confirm.mockReset());

test('recycling asks for confirmation and does nothing when cancelled', async () => {
  confirm.mockResolvedValueOnce(false);
  renderCard();
  fireEvent.press(await screen.findByRole('button', { name: 'Recycler Drop Commune' }));
  await waitFor(() =>
    expect(confirm).toHaveBeenCalledWith('Recycler un exemplaire de Drop (Commune) contre 5 fragments ?'),
  );
  expect(screen.getByText('Fragments : 100')).toBeTruthy();
  expect(screen.getByText('Commune · ×2')).toBeTruthy();
});

test('recycling once confirmed turns the duplicate into fragments', async () => {
  confirm.mockResolvedValueOnce(true);
  renderCard();
  fireEvent.press(await screen.findByRole('button', { name: 'Recycler Drop Commune' }));
  expect(await screen.findByText('Fragments : 105')).toBeTruthy();
  expect(screen.getByText('Commune · ×1')).toBeTruthy();
});

test('crafting asks for confirmation and does nothing when cancelled', async () => {
  confirm.mockResolvedValueOnce(false);
  renderCard();
  fireEvent.press(await screen.findByRole('button', { name: 'Fabriquer Drop Commune' }));
  await waitFor(() => expect(confirm).toHaveBeenCalledWith('Fabriquer Drop (Commune) pour 40 fragments ?'));
  expect(screen.getByText('Fragments : 100')).toBeTruthy();
  expect(screen.getByText('Commune · ×2')).toBeTruthy();
});

test('crafting once confirmed spends the fragments', async () => {
  confirm.mockResolvedValueOnce(true);
  renderCard();
  fireEvent.press(await screen.findByRole('button', { name: 'Fabriquer Drop Commune' }));
  expect(await screen.findByText('Fragments : 60')).toBeTruthy();
  expect(screen.getByText('Commune · ×3')).toBeTruthy();
});
