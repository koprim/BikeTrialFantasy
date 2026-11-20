// react-native exports its components and APIs as lazy getters: `import { Text } from 'react-native'`
// only loads (and, on a cold Jest cache, Babel-transforms) Text the first time a render touches it.
// That one-time cost then lands inside the first test of each file and, on a fresh CI runner, takes
// longer than the 5 s test timeout. Loading every export here, before any test starts, keeps that
// cost out of each test's time budget; it also covers the modules our navigation libraries use.
// An export that throws when loaded (its native module is absent under Jest) is irrelevant to the
// cache and is skipped. Exports that only warn when loaded (deprecated, or no native module) are
// listed below and not loaded at all, to keep test output free of their console noise.
const EXPORTS_THAT_WARN_WHEN_LOADED = new Set([
  'ProgressBarAndroid',
  'Clipboard',
  'PushNotificationIOS',
  'DevSettings',
  'Settings',
  'ColorPropType',
  'EdgeInsetsPropType',
  'PointPropType',
  'ViewPropTypes',
  'SafeAreaView', // RN 0.81+: deprecated
]);

const reactNative = require('react-native');

for (const exportName of Object.keys(reactNative)) {
  if (EXPORTS_THAT_WARN_WHEN_LOADED.has(exportName)) continue;
  try {
    void reactNative[exportName];
  } catch {
    // Throws under Jest only; nothing to warm up.
  }
}
