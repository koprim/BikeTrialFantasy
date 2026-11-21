import { errorMessage } from './errorMessages';

test('maps an error code to its French message', () => {
  expect(errorMessage('TEAM_LOCKED')).toBe('La manche a commencé : équipe verrouillée.');
  expect(errorMessage('STORAGE_FAILED')).toBe('Sauvegarde locale impossible.');
});

test('team details are translated and appended', () => {
  expect(
    errorMessage('INVALID_TEAM', [
      { code: 'CARD_NOT_OWNED', slot: 'senior26' },
      { code: 'TOO_MANY_EQUIPMENT', slot: null },
    ]),
  ).toBe('Équipe invalide. Senior 26" : carte non possédée. Trop d\'équipements.');
  expect(errorMessage('INVALID_TEAM', [])).toBe('Équipe invalide.');
  expect(errorMessage('INVALID_TEAM', { field: 'team' })).toBe('Équipe invalide.');
});

test('falls back to a generic message for an unknown code', () => {
  expect(errorMessage('WHATEVER')).toBe('Une erreur est survenue.');
  expect(errorMessage(undefined)).toBe('Une erreur est survenue.');
});
