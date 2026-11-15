// Expo SDK 50 on Windows with Node >= 22: Metro tries to mkdir `.expo/metro/externals/node:sea`,
// and ':' is invalid in Windows paths. Skip builtin module names containing ':'.
// Runs on postinstall; safe to run repeatedly.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');
const FROM = 'node-inspect)\\/|\\//.test(x)';
const TO = 'node-inspect)\\/|\\/|:/.test(x)';

if (!fs.existsSync(file)) {
  console.log('patch-expo-windows: @expo/cli not installed, skipping');
} else {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(TO)) console.log('patch-expo-windows: already applied');
  else if (src.includes(FROM)) { fs.writeFileSync(file, src.replace(FROM, TO)); console.log('patch-expo-windows: applied'); }
  else console.warn('patch-expo-windows: pattern not found — Expo version changed, check manually');
}
