// Runs a command with the local Supabase URL and keys in its environment.
const { execSync, spawnSync } = require('child_process');

const REQUIRED_STATUS_KEYS = ['API_URL', 'ANON_KEY', 'SERVICE_ROLE_KEY'];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readLocalSupabaseStatus() {
  try {
    return JSON.parse(execSync('npx --no-install supabase status -o json', { encoding: 'utf8' }));
  } catch (error) {
    return fail(`Local Supabase is not running: run \`npx supabase start\`\n${error.message}`);
  }
}

const status = readLocalSupabaseStatus();
const missingKeys = REQUIRED_STATUS_KEYS.filter((key) => !status[key]);
if (missingKeys.length > 0) {
  fail(`supabase status is missing: ${missingKeys.join(', ')}`);
}

const env = {
  ...process.env,
  SUPABASE_URL: status.API_URL,
  SUPABASE_ANON_KEY: status.ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
};
// One joined command string with shell:true (an args array with shell:true triggers DEP0190).
const commandLine = process.argv.slice(2).join(' ');
const result = spawnSync(commandLine, { stdio: 'inherit', env, shell: true });
if (result.error) fail(`Failed to run "${commandLine}": ${result.error.message}`);
process.exit(result.status ?? 1);