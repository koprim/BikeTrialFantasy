const { GameError } = require('../errors');
const { makeAuthenticator } = require('./adapters');

const requestWith = (authorization) =>
  new Request('http://edge/fn', { method: 'POST', headers: authorization ? { Authorization: authorization } : {} });
const dbReturning = (result) => ({ auth: { getUser: async () => result } });

describe('makeAuthenticator', () => {
  test('resolves the user id of a valid token', async () => {
    const authenticate = makeAuthenticator(dbReturning({ data: { user: { id: 'u1' } }, error: null }));
    expect(await authenticate(requestWith('Bearer abc'))).toBe('u1');
    expect(await authenticate(requestWith('bearer   abc'))).toBe('u1');
  });

  test.each([[undefined], ['abc'], ['Bearer'], ['Bearer a b'], ['Basic abc']])(
    'malformed header %p is unauthenticated',
    async (header) => {
      const authenticate = makeAuthenticator(dbReturning({ data: { user: { id: 'u1' } }, error: null }));
      await expect(authenticate(requestWith(header))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    },
  );

  test.each([[400], [401], [403]])('a token rejected with status %p is unauthenticated', async (status) => {
    const authenticate = makeAuthenticator(dbReturning({ data: { user: null }, error: { status } }));
    await expect(authenticate(requestWith('Bearer abc'))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  test('no user without an error is unauthenticated', async () => {
    const authenticate = makeAuthenticator(dbReturning({ data: { user: null }, error: null }));
    await expect(authenticate(requestWith('Bearer abc'))).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  test.each([[0], [500], [503], [undefined]])(
    'an auth outage (status %p) is not reported as unauthenticated',
    async (status) => {
      const authenticate = makeAuthenticator(dbReturning({ data: { user: null }, error: { status, message: 'down' } }));
      const failure = await authenticate(requestWith('Bearer abc')).catch((error) => error);
      expect(failure).toBeInstanceOf(Error);
      expect(failure).not.toBeInstanceOf(GameError);
      expect(failure.message).toMatch(/Auth lookup failed/);
    },
  );
});
