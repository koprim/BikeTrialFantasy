import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoApi } from './demoApi';
import { createSupabaseApi } from './supabaseApi';
import { createSupabaseClient } from './supabaseClient';

// EXPO_PUBLIC_* variables must be read literally so Expo inlines them at build time.
const ENV_CONFIG = {
  backend: process.env.EXPO_PUBLIC_BACKEND,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  allowSimulatedDate: process.env.EXPO_PUBLIC_ALLOW_SIMULATED_DATE === 'true',
};

const webOrigin = () => (typeof window !== 'undefined' && window.location ? window.location.origin : undefined);

/** @returns {import('./demoApi').GameApi} */
export function createApi(config = ENV_CONFIG) {
  if (config.backend !== 'supabase') return createDemoApi();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required when EXPO_PUBLIC_BACKEND=supabase',
    );
  }
  return createSupabaseApi({
    client: createSupabaseClient({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey }),
    storage: AsyncStorage,
    allowSimulatedDate: config.allowSimulatedDate,
    emailRedirectTo: webOrigin(),
  });
}
