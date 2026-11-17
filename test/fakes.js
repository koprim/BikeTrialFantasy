const { emptyCollection } = require('../src/engine/collection');
const { buildCatalog } = require('../src/backend/catalog');
const cards = require('../src/data/seed/cards.json');
const riders = require('../src/data/seed/riders.json');
const balance = require('../src/data/seed/balance.json');

const seedCatalog = () => buildCatalog({ cards, riders, balance });

function fakeCatalog(catalog = seedCatalog()) {
  return { load: async () => catalog };
}

function fakeClock(day) {
  return {
    day,
    async today() {
      return this.day;
    },
    realToday() {
      return this.day;
    },
  };
}

function openingKey(opening) {
  return opening.kind === 'starter' ? 'starter' : `daily|${opening.packDate}`;
}

function assertNonNegative(after) {
  const counts = Object.values(after.owned).flatMap((byRarity) => Object.values(byRarity));
  if (counts.some((count) => count < 0)) throw new Error('commit_collection_change: negative count');
  if (after.fragments < 0) throw new Error('commit_collection_change: negative fragments');
}

// In-memory stand-in for the commit_collection_change RPC: same outcomes, same refusals, isolated copies.
function fakeWallets(collection = emptyCollection()) {
  return {
    state: { collection: structuredClone(collection), version: 0 },
    openings: new Set(),
    commits: [],
    conflictsToSimulate: 0,
    async load() {
      return structuredClone(this.state);
    },
    async commit(_userId, change) {
      if (this.conflictsToSimulate > 0) {
        this.conflictsToSimulate -= 1;
        this.simulateExternalWriter();
        return 'conflict';
      }
      if (change.expectedVersion !== this.state.version) return 'conflict';
      assertNonNegative(change.after); // the RPC raises and rolls back
      if (change.opening) {
        if (this.openings.has(openingKey(change.opening))) return 'duplicate';
        this.openings.add(openingKey(change.opening));
      }
      this.commits.push(structuredClone(change));
      // The database does not store lastPack, so a later load has none; callers keep it from change.after.
      const stored = { ...structuredClone(change.after), lastPack: [] };
      this.state = { collection: stored, version: this.state.version + 1 };
      return 'ok';
    },
    // Another writer got in first: the stored data and version move on.
    simulateExternalWriter() {
      const { collection: current, version } = this.state;
      this.state = { collection: { ...current, fragments: current.fragments + 1 }, version: version + 1 };
    },
  };
}

function fakeCompetitions(competitions = []) {
  const byId = Object.fromEntries(competitions.map((competition) => [competition.id, competition]));
  return { get: async (id) => byId[id] || null };
}

function fakeTeams() {
  return {
    saved: [],
    async save(userId, competitionId, team) {
      this.saved.push({ userId, competitionId, team });
    },
  };
}

function fakeSettings() {
  return {
    simulatedDate: null,
    async getSimulatedDate() {
      return this.simulatedDate;
    },
    async setSimulatedDate(date) {
      this.simulatedDate = date;
    },
  };
}

module.exports = { seedCatalog, fakeCatalog, fakeClock, fakeWallets, fakeCompetitions, fakeTeams, fakeSettings };
