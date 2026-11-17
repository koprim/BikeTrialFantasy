const CACHE_KEY = 'sfbt:supabase-cache:v1';

// Last known player state, tagged with its owner so one user never sees another user's data offline.
function createPlayerCache(storage) {
  async function read() {
    try {
      const raw = await storage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null; // unreadable or corrupt cache: behave as if there were none
    }
  }

  async function write(userId, state) {
    try {
      await storage.setItem(CACHE_KEY, JSON.stringify({ userId, state }));
    } catch {
      // The cache is best effort: a failed write must not discard the fresh state the caller already holds.
    }
  }

  async function readFor(userId) {
    const cached = await read();
    return cached && userId && cached.userId === userId ? cached.state : null;
  }

  return { read, write, readFor };
}

module.exports = { createPlayerCache };
