const { isNetworkError } = require('./networkError');

describe('isNetworkError', () => {
  test.each([
    ['a fetch TypeError', new TypeError('Failed to fetch')],
    ['a React Native fetch TypeError', new TypeError('Network request failed')],
    ['a Safari fetch TypeError', new TypeError('Load failed')],
    ['an auth retryable fetch error', Object.assign(new Error('x'), { name: 'AuthRetryableFetchError' })],
    ['a functions fetch error', Object.assign(new Error('x'), { name: 'FunctionsFetchError' })],
    ['a PostgREST fetch failure without code', { code: '', message: 'TypeError: Failed to fetch' }],
  ])('%s is a network error', (_label, error) => {
    expect(isNetworkError(error)).toBe(true);
  });

  test.each([
    ['a missing row', { code: 'PGRST116', message: 'no rows' }],
    ['a row level security rejection', { code: '42501', message: 'denied' }],
    ['a mapping TypeError', new TypeError("Cannot read properties of null (reading 'display_name')")],
    ['a functions HTTP error', Object.assign(new Error('non-2xx'), { name: 'FunctionsHttpError' })],
    ['a coded error mentioning fetch', { code: '42P01', message: 'Failed to fetch' }],
    ['nothing', null],
  ])('%s is not a network error', (_label, error) => {
    expect(isNetworkError(error)).toBe(false);
  });
});
