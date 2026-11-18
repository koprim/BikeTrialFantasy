// Composition root shared by every Edge Function entry point: wires Supabase, env and RNG into the bundled backend.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import backend from './backend.mjs';

type HandlerName = 'open-starter' | 'open-daily-pack' | 'recycle' | 'craft' | 'save-team' | 'set-simulated-date';

export function serve(handlerName: HandlerName): void {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const server = backend.buildServer({
    db,
    env: Deno.env.toObject(),
    randomSeed: () => crypto.getRandomValues(new Uint32Array(1))[0],
  });
  Deno.serve(server[handlerName]);
}
