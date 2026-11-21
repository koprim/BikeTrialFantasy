module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-svg))',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '<rootDir>/test/preloadReactNative.js',
    '<rootDir>/test/i18nSetup.js',
  ],
  // Recycle workers before V8 runs out of memory ("Zone Allocation failed") on full runs.
  maxWorkers: '50%',
  workerIdleMemoryLimit: '1GB',
  // Integration and Edge Function tests need the local Supabase stack: run them explicitly.
  testPathIgnorePatterns: ['/node_modules/', '\\.int\\.test\\.js$', '\\.fn\\.test\\.js$'],
};
