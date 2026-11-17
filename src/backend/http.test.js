/** @jest-environment node */
const { makeHttpHandler } = require('./http');
const { gameError } = require('./errors');

const post = (body) =>
  new Request('http://edge/fn', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const handler = (overrides = {}) =>
  makeHttpHandler({
    authenticate: async () => 'u1',
    action: async (userId, body) => ({ userId, body }),
    logError: () => {},
    ...overrides,
  });

test('runs the action for the authenticated user', async () => {
  const response = await handler()(post({ cardId: 'a' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ userId: 'u1', body: { cardId: 'a' } });
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
});

test('an empty body is an empty object', async () => {
  expect(await (await handler()(post())).json()).toEqual({ userId: 'u1', body: {} });
});

test('game errors keep their status, code and details', async () => {
  const response = await handler({
    action: async () => {
      throw gameError('INVALID_TEAM', ['x']);
    },
  })(post({}));
  expect(response.status).toBe(422);
  expect(await response.json()).toEqual({ error: 'INVALID_TEAM', details: ['x'] });
});

test('unauthenticated requests get 401', async () => {
  const response = await handler({
    authenticate: async () => {
      throw gameError('UNAUTHENTICATED');
    },
  })(post({}));
  expect(response.status).toBe(401);
});

test('unexpected errors are logged and hidden behind 500', async () => {
  const logError = jest.fn();
  const response = await handler({
    action: async () => {
      throw new Error('db down');
    },
    logError,
  })(post({}));
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error: 'INTERNAL' });
  expect(logError).toHaveBeenCalled();
});

test('preflight, wrong method and malformed JSON', async () => {
  expect((await handler()(new Request('http://edge/fn', { method: 'OPTIONS' }))).status).toBe(204);
  expect((await handler()(new Request('http://edge/fn', { method: 'GET' }))).status).toBe(405);
  expect((await handler()(new Request('http://edge/fn', { method: 'POST', body: '{oops' }))).status).toBe(400);
});

test.each([['[1,2]'], ['"str"'], ['null']])('a non-object JSON body %s is rejected as INVALID_INPUT', async (text) => {
  const action = jest.fn(async () => ({}));
  const response = await handler({ action })(new Request('http://edge/fn', { method: 'POST', body: text }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ error: 'INVALID_INPUT' });
  expect(action).not.toHaveBeenCalled();
});
