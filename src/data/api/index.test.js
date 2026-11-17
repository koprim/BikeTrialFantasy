import { createApi } from './index';

test('demo backend by default', () => {
  expect(createApi({ backend: undefined }).features.account).toBe(false);
});

test('the Supabase backend requires its URL and key', () => {
  expect(() => createApi({ backend: 'supabase' })).toThrow('EXPO_PUBLIC_SUPABASE_URL');
});
