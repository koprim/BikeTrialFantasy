// react-native exports its components and APIs as lazy getters: `import { Text } from 'react-native'`
// only loads (and, on a cold Jest cache, Babel-transforms) Text the first time a render touches it.
// That one-time cost then lands inside the first test of each file and, on a fresh CI runner, takes
// longer than the 5 s test timeout. Loading every export here, before any test starts, keeps that
// cost out of each test's time budget; it also covers the modules our navigation libraries use.
// Skipped: deprecated exports and those without a native module under Jest, which warn when loaded.
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
  'DevMenu', // RN 0.79+: TurboModule absent under Jest, throws on access
]);

const reactNative = require('react-native');

for (const exportName of Object.keys(reactNative)) {
  if (!EXPORTS_THAT_WARN_WHEN_LOADED.has(exportName)) {
    void reactNative[exportName];
  }
}
