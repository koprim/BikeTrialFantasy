const CATEGORIES = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];

const SLOTS = [
  { id: 'senior26', category: 'SENIOR_26', label: 'Senior 26"' },
  { id: 'junior26', category: 'JUNIOR_26', label: 'Junior 26"' },
  { id: 'senior20', category: 'SENIOR_20', label: 'Senior 20"' },
  { id: 'junior20', category: 'JUNIOR_20', label: 'Junior 20"' },
  { id: 'eliteWomen1', category: 'ELITE_WOMEN', label: 'Elite Femme 20" (1)' },
  { id: 'eliteWomen2', category: 'ELITE_WOMEN', label: 'Elite Femme 20" (2)' },
];

function groupByCategory(riders) {
  const out = {};
  CATEGORIES.forEach((c) => { out[c] = []; });
  riders.forEach((r) => { if (out[r.category]) out[r.category].push(r); });
  return out;
}

function isTeamComplete(team) {
  return SLOTS.every((s) => team && team[s.id]);
}

function validateTeam(team, ridersById) {
  const errors = [];
  if (!isTeamComplete(team)) errors.push('Team incomplete: all 6 slots required.');
  SLOTS.forEach((s) => {
    const id = team && team[s.id];
    if (id) {
      const rider = ridersById[id];
      if (!rider) errors.push(`Unknown rider in ${s.id}.`);
      else if (rider.category !== s.category) errors.push(`Slot ${s.id} expects ${s.category}.`);
    }
  });
  if (team && team.eliteWomen1 && team.eliteWomen1 === team.eliteWomen2) {
    errors.push('The two Elite Women must be distinct.');
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateTeam };
