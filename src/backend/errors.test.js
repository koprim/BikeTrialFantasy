const { GameError, gameError } = require('./errors');

test('a game error carries its code, HTTP status and details', () => {
  const error = gameError('INVALID_TEAM', [{ code: 'CARD_NOT_OWNED', slot: 'senior26' }]);
  expect(error).toBeInstanceOf(GameError);
  expect([error.code, error.status, error.details]).toEqual([
    'INVALID_TEAM',
    422,
    [{ code: 'CARD_NOT_OWNED', slot: 'senior26' }],
  ]);
});

test('unknown codes are programming errors', () => {
  expect(() => gameError('NOPE')).toThrow('Unknown game error NOPE');
});

test('inherited object keys are not game error codes', () => {
  expect(() => gameError('toString')).toThrow('Unknown game error toString');
  expect(() => gameError('constructor')).toThrow('Unknown game error constructor');
});
