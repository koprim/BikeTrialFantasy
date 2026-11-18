module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-svg))',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/test/preloadReactNative.js'],
  // Integration and Edge Function tests need the local Supabase stack: run them explicitly.
  testPathIgnorePatterns: ['/node_modules/', '\\.int\\.test\\.js$', '\\.fn\\.test\\.js$'],
};
