// Runs a command with the local Supabase URL and keys in its environment.
const { execSync, spawnSync } = require('child_process');

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const env = {
  ...process.env,
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
};
const [command, ...args] = process.argv.slice(2);
const result = spawnSync(command, args, { stdio: 'inherit', env, shell: true });
process.exit(result.status ?? 1);