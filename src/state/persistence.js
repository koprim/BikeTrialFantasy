import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'sfbt.gameState.v1';

export async function saveState(state) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* non-fatal for POC */
  }
}
export async function loadState() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
