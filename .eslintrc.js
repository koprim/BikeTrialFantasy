module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  globals: { Intl: 'readonly' }, // ESLint's es* envs omit Intl; Expo's config enables neither browser nor node globals
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
    '.superpowers/',
    'supabase/functions/_shared/backend.mjs',
  ],
  overrides: [
    { files: ['scripts/**/*.js', '*.config.js', '.eslintrc.js'], env: { node: true } }, // Node scripts and configs use __dirname/require
    { files: ['**/*.test.js', 'jest.setup.js', 'test/**/*.js'], env: { jest: true } },
    { files: ['supabase/functions/**/*.ts'], globals: { Deno: 'readonly' }, rules: { 'import/no-unresolved': 'off' } },
  ],
};
