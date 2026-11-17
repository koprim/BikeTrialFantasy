import { createDemoApi } from '../data/api/demoApi';

/** Storage port of the demo backend kept in memory, so tests never share AsyncStorage. */
export function memoryStorage(saved = null) {
  return {
    saved,
    async loadState() {
      return this.saved;
    },
    async saveState(state) {
      this.saved = state;
    },
  };
}

/** A demo GameApi whose "device storage" starts with `saved` (null = a new player). */
export const inMemoryDemoApi = (saved = null) => createDemoApi({ storage: memoryStorage(saved) });
