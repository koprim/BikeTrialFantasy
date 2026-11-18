// Composition root shared by every Edge Function entry point: wires Supabase, env and RNG into the bundled backend.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import backend from './backend.mjs';

type HandlerName = 'open-starter' | 'open-daily-pack' | 'recycle' | 'craft' | 'save-team' | 'set-simulated-date';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function serve(handlerName: HandlerName): void {
  const db = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  const server = backend.buildServer({
    db,
    env: { PACK_TIMEZONE: Deno.env.get('PACK_TIMEZONE'), ALLOW_SIMULATED_DATE: Deno.env.get('ALLOW_SIMULATED_DATE') },
    randomSeed: () => crypto.getRandomValues(new Uint32Array(1))[0],
  });
  const handler = server[handlerName];
  if (typeof handler !== 'function') throw new Error(`Backend has no handler named ${handlerName}`);
  Deno.serve(handler);
}