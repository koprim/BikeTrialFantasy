import { errorMessage } from './errorMessages';

test('maps an error code to its French message', () => {
  expect(errorMessage('TEAM_LOCKED')).toBe('La manche a commencé : équipe verrouillée.');
  expect(errorMessage('STORAGE_FAILED')).toBe('Sauvegarde locale impossible.');
});

test('appends the details of a refused request', () => {
  expect(errorMessage('INVALID_TEAM', ['Carte non possédée.', 'Arbitre manquant.'])).toBe(
    'Équipe invalide. Carte non possédée. Arbitre manquant.',
  );
  expect(errorMessage('INVALID_TEAM', [])).toBe('Équipe invalide.');
  expect(errorMessage('INVALID_TEAM', { field: 'team' })).toBe('Équipe invalide.');
});

test('falls back to a generic message for an unknown code', () => {
  expect(errorMessage('WHATEVER')).toBe('Une erreur est survenue.');
  expect(errorMessage(undefined)).toBe('Une erreur est survenue.');
});
