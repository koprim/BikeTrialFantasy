const { normalizeTeam } = require('../engine/team');

const renameEventId = (id) => id.replace(/^2026-27-/, '2026-');

// Brings any saved state to the current shape, or returns null when it cannot be used.
function migrateSave(saved, { edition, demoCollection }) {
  if (!saved || 'currentIndex' in saved || !saved.picks) return null;
  const picks = {};
  Object.entries(saved.picks).forEach(([id, team]) => { picks[renameEventId(id)] = normalizeTeam(team, edition); });
  let collection = saved.collection;
  if (!collection) {
    // Saves from before the collection: start from the demo collection and own every pilot already played.
    collection = JSON.parse(JSON.stringify(demoCollection));
    Object.values(picks).forEach((team) => Object.values(team.slots).forEach((e) => {
      const counts = collection.owned[e.cardId] || (collection.owned[e.cardId] = {});
      counts[e.rarity] = Math.max(counts[e.rarity] || 0, 1);
    }));
  }
  return { ...saved, picks, collection };
}

module.exports = { migrateSave };
