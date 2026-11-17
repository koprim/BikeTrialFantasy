const { GameError, gameError } = require('./errors');

test('a game error carries its code, HTTP status and details', () => {
  const error = gameError('INVALID_TEAM', ['Pilote : carte non possédée.']);
  expect(error).toBeInstanceOf(GameError);
  expect([error.code, error.status, error.details]).toEqual(['INVALID_TEAM', 422, ['Pilote : carte non possédée.']]);
});

test('unknown codes are programming errors', () => {
  expect(() => gameError('NOPE')).toThrow('Unknown game error NOPE');
});

test('inherited object keys are not game error codes', () => {
  expect(() => gameError('toString')).toThrow('Unknown game error toString');
  expect(() => gameError('constructor')).toThrow('Unknown game error constructor');
});
