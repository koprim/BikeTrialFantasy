// Runs the unit tests with coverage, then the SonarQube scanner (Docker) against the local server.
// Needs: `npm run sonar:up` and a token in SONAR_TOKEN or in the gitignored file .sonar-token.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const TOKEN_FILE = path.join(ROOT, '.sonar-token');
const SCANNER_IMAGE =
  'sonarsource/sonar-scanner-cli@sha256:6e6eca4d552695a98fb7dab84f0c1bd0885ebbfe272654d1552e24bd7f452d51';
// From inside a container, Docker Desktop reaches the host's port 9000 through this name.
const SONAR_HOST_URL = process.env.SONAR_HOST_URL || 'http://host.docker.internal:9000';

function readToken() {
  if (process.env.SONAR_TOKEN) return process.env.SONAR_TOKEN;
  if (fs.existsSync(TOKEN_FILE)) return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  console.error('No SonarQube token: set SONAR_TOKEN or write it to .sonar-token (see docs/qualite-code.md).');
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

const token = readToken();
run('npx', ['jest', '--coverage', '--coverageReporters=lcov', '--silent']);
run('docker', [
  'run',
  '--rm',
  '-e',
  `SONAR_HOST_URL=${SONAR_HOST_URL}`,
  '-e',
  `SONAR_TOKEN=${token}`,
  '-v',
  `${ROOT}:/usr/src`,
  SCANNER_IMAGE,
]);
console.log('Report: http://localhost:9000/dashboard?id=biketrial-fantasy');
