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

function validateRiderTeam(team, ridersById) {
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

function pilotCardId(edition, riderId) { return `pilot-${edition}-${riderId}`; }

function emptyTeam() { return { slots: {}, equipment: [], referee: null }; }

function cardTeamFromRiders(riderTeam, edition) {
  const slots = {};
  SLOTS.forEach((s) => {
    const riderId = riderTeam && riderTeam[s.id];
    if (riderId) slots[s.id] = { cardId: pilotCardId(edition, riderId), rarity: 'C', techniques: [] };
  });
  return { slots, equipment: [], referee: null };
}

// Assumption: every rider has a pilot card in the current EDITION, so archived seasons keep their scores
// (edition rotation is out of scope).
// Old saves store { senior26: riderId, … }: convert them to Common pilot cards.
function normalizeTeam(team, edition) {
  if (!team) return null;
  return 'slots' in team ? team : cardTeamFromRiders(team, edition);
}

function teamRiderIds(team, cardsById) {
  return SLOTS.map((s) => (team.slots || {})[s.id])
    .filter(Boolean)
    .map((e) => cardsById[e.cardId])
    .filter(Boolean)
    .map((c) => c.subject);
}

function ownsCard(owned, ref) {
  return !!owned[ref.cardId] && (owned[ref.cardId][ref.rarity] || 0) > 0;
}

// deps = { cardsById, ridersById, owned, balance }
function validateCardTeam(team, { cardsById, ridersById, owned, balance }) {
  const slots = team.slots || {};
  const errors = [];
  const used = new Set();
  const riderIds = [];
  const useCard = (ref, type, where) => {
    const card = cardsById[ref.cardId];
    if (!card || card.type !== type) { errors.push(`${where} : carte invalide.`); return null; }
    if (!card.rarities.includes(ref.rarity)) { errors.push(`${where} : rareté indisponible.`); return null; }
    if (!ownsCard(owned, ref)) errors.push(`${where} : carte non possédée.`);
    const key = `${ref.cardId}:${ref.rarity}`;
    if (used.has(key)) errors.push(`${where} : carte déjà utilisée.`);
    used.add(key);
    return card;
  };
  SLOTS.forEach((slot) => {
    const entry = slots[slot.id];
    if (!entry) { errors.push(`${slot.label} : emplacement vide.`); return; }
    const card = useCard(entry, 'PILOT', slot.label);
    if (!card) return;
    const rider = ridersById[card.subject];
    if (!rider || rider.category !== slot.category) errors.push(`${slot.label} : mauvaise catégorie.`);
    else if (riderIds.includes(rider.id)) errors.push(`${slot.label} : pilote déjà dans l'équipe.`);
    else riderIds.push(rider.id);
    const techniques = entry.techniques || [];
    if (techniques.length > balance.slots.techniquesByPilotRarity[entry.rarity]) errors.push(`${slot.label} : trop de techniques.`);
    techniques.forEach((t) => useCard(t, 'TECHNIQUE', slot.label));
  });
  const equipment = team.equipment || [];
  if (equipment.length > balance.slots.equipment) errors.push('Trop d\'équipements.');
  equipment.forEach((e) => useCard(e, 'EQUIPMENT', 'Équipement'));
  if (team.referee) useCard(team.referee, 'REFEREE', 'Arbitre');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateRiderTeam,
  pilotCardId, emptyTeam, cardTeamFromRiders, normalizeTeam, teamRiderIds, validateCardTeam,
};
