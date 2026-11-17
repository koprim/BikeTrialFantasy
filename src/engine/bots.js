const { SLOTS } = require('./team');

function orderForStrategy(list, strategy, rng) {
  const arr = [...list];
  if (strategy === 'FAVORIS') return arr.sort((a, b) => a.uciRank - b.uciRank);
  if (strategy === 'OUTSIDER') return arr.sort((a, b) => b.uciRank - a.uciRank);
  if (strategy === 'EQUILIBRE') {
    const sorted = arr.sort((a, b) => a.uciRank - b.uciRank);
    const mid = Math.floor(sorted.length / 2);
    return [sorted[mid], ...sorted.slice(0, mid), ...sorted.slice(mid + 1)];
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBotTeam(strategy, ridersByCategory, rng) {
  const team = {};
  const womenOrder = orderForStrategy(ridersByCategory.ELITE_WOMEN, strategy, rng);
  SLOTS.forEach((slot) => {
    if (slot.category === 'ELITE_WOMEN') return;
    const ordered = orderForStrategy(ridersByCategory[slot.category], strategy, rng);
    team[slot.id] = ordered[0].id;
  });
  team.eliteWomen1 = womenOrder[0].id;
  team.eliteWomen2 = womenOrder[1].id;
  return team;
}

const RIVAL_PLAN = [
  ['Aigle', 'FAVORIS'], ['Bison', 'FAVORIS'], ['Cobra', 'FAVORIS'],
  ['Drago', 'EQUILIBRE'], ['Echo', 'EQUILIBRE'], ['Falco', 'EQUILIBRE'],
  ['Gecko', 'OUTSIDER'], ['Hydra', 'OUTSIDER'],
  ['Ibex', 'ALEATOIRE'], ['Jaguar', 'ALEATOIRE'],
];

function createRivals() {
  return RIVAL_PLAN.map(([name, strategy], i) => ({ id: `rival-${i + 1}`, name: `Bot ${name}`, strategy }));
}

module.exports = { generateBotTeam, createRivals };
