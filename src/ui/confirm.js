import { Alert, Platform } from 'react-native';
import i18n from '../i18n';

// Alert.alert is a no-op on react-native-web, so use the browser dialog there.
export function confirm(message) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert(
      i18n.t('app.confirmTitle'),
      message,
      [
        { text: i18n.t('app.cancel'), style: 'cancel', onPress: () => resolve(false) },
        { text: i18n.t('app.confirm'), style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
