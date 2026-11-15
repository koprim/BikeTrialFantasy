import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on react-native-web, so use the browser dialog there.
export function confirm(message) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('Confirmation', message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
