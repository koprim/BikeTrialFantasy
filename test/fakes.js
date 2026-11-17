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

function fakeWallets(collection = emptyCollection()) {
  return {
    state: { collection, version: 0 },
    openings: new Set(),
    commits: [],
    conflictsToSimulate: 0,
    async load() {
      return { ...this.state };
    },
    async commit(_userId, change) {
      if (this.conflictsToSimulate > 0) {
        this.conflictsToSimulate -= 1;
        return 'conflict';
      }
      if (change.expectedVersion !== this.state.version) return 'conflict';
      if (change.opening) {
        if (this.openings.has(openingKey(change.opening))) return 'duplicate';
        this.openings.add(openingKey(change.opening));
      }
      this.commits.push(change);
      this.state = { collection: { ...change.after, lastPack: [] }, version: this.state.version + 1 };
      return 'ok';
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
