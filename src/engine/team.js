const CATEGORIES = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];

const SLOTS = [
  { id: 'senior26', category: 'SENIOR_26' },
  { id: 'junior26', category: 'JUNIOR_26' },
  { id: 'senior20', category: 'SENIOR_20' },
  { id: 'junior20', category: 'JUNIOR_20' },
  { id: 'eliteWomen1', category: 'ELITE_WOMEN' },
  { id: 'eliteWomen2', category: 'ELITE_WOMEN' },
];

function groupByCategory(riders) {
  const out = {};
  CATEGORIES.forEach((c) => {
    out[c] = [];
  });
  riders.forEach((r) => {
    if (out[r.category]) out[r.category].push(r);
  });
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

function pilotCardId(edition, riderId) {
  return `pilot-${edition}-${riderId}`;
}

function emptyTeam() {
  return { slots: {}, equipment: [], referee: null };
}

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

// Generous upper bound on any card list of a team, so hostile payloads cannot be huge; the real
// per-rarity limits stay in validateCardTeam (balance).
const MAX_CARDS_PER_LIST = 10;

const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

function sanitizeRef(raw) {
  if (!isPlainObject(raw) || typeof raw.cardId !== 'string' || typeof raw.rarity !== 'string') return null;
  return { cardId: raw.cardId, rarity: raw.rarity };
}

function sanitizeRefList(raw) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > MAX_CARDS_PER_LIST) return null;
  const refs = raw.map(sanitizeRef);
  return refs.includes(null) ? null : refs;
}

function sanitizeSlotEntry(raw) {
  const ref = sanitizeRef(raw);
  const techniques = ref && sanitizeRefList(raw.techniques);
  return techniques ? { ...ref, techniques } : null;
}

function sanitizeSlots(raw) {
  if (!isPlainObject(raw)) return null;
  const slots = {};
  for (const slot of SLOTS) {
    if (!(slot.id in raw)) continue;
    const entry = sanitizeSlotEntry(raw[slot.id]);
    if (!entry) return null;
    slots[slot.id] = entry;
  }
  return slots;
}

// Untrusted JSON in, canonical team out (only known fields), or null when the shape is wrong.
function sanitizeCardTeam(raw) {
  if (!isPlainObject(raw)) return null;
  const slots = sanitizeSlots(raw.slots);
  const equipment = sanitizeRefList(raw.equipment);
  const referee = raw.referee == null ? null : sanitizeRef(raw.referee);
  if (!slots || !equipment || (raw.referee != null && !referee)) return null;
  return { slots, equipment, referee };
}

function ownsCard(owned, ref) {
  return !!owned[ref.cardId] && (owned[ref.cardId][ref.rarity] || 0) > 0;
}

// Screens translate them (ui.json team.<code>); `slot` is a slot id, 'equipment', 'referee' or null.
const TEAM_ERROR_CODES = [
  'CARD_INVALID',
  'RARITY_UNAVAILABLE',
  'CARD_NOT_OWNED',
  'CARD_ALREADY_USED',
  'SLOT_EMPTY',
  'WRONG_CATEGORY',
  'RIDER_ALREADY_IN_TEAM',
  'TOO_MANY_TECHNIQUES',
  'TOO_MANY_EQUIPMENT',
];

// deps = { cardsById, ridersById, owned, balance }
function validateCardTeam(team, { cardsById, ridersById, owned, balance }) {
  const slots = team.slots || {};
  const errors = [];
  const fail = (code, slot = null) => errors.push({ code, slot });
  const used = new Set();
  const riderIds = [];
  const checkCard = (ref, type, where) => {
    const card = cardsById[ref.cardId];
    if (!card || card.type !== type) {
      fail('CARD_INVALID', where);
      return null;
    }
    if (!card.rarities.includes(ref.rarity)) {
      fail('RARITY_UNAVAILABLE', where);
      return null;
    }
    if (!ownsCard(owned, ref)) fail('CARD_NOT_OWNED', where);
    const key = `${ref.cardId}:${ref.rarity}`;
    if (used.has(key)) fail('CARD_ALREADY_USED', where);
    used.add(key);
    return card;
  };
  SLOTS.forEach((slot) => {
    const entry = slots[slot.id];
    if (!entry) {
      fail('SLOT_EMPTY', slot.id);
      return;
    }
    const card = checkCard(entry, 'PILOT', slot.id);
    if (!card) return;
    const rider = ridersById[card.subject];
    if (!rider || rider.category !== slot.category) fail('WRONG_CATEGORY', slot.id);
    else if (riderIds.includes(rider.id)) fail('RIDER_ALREADY_IN_TEAM', slot.id);
    else riderIds.push(rider.id);
    const techniques = entry.techniques || [];
    if (techniques.length > balance.slots.techniquesByPilotRarity[entry.rarity]) fail('TOO_MANY_TECHNIQUES', slot.id);
    techniques.forEach((t) => checkCard(t, 'TECHNIQUE', slot.id));
  });
  const equipment = team.equipment || [];
  if (equipment.length > balance.slots.equipment) fail('TOO_MANY_EQUIPMENT');
  equipment.forEach((e) => checkCard(e, 'EQUIPMENT', 'equipment'));
  if (team.referee) checkCard(team.referee, 'REFEREE', 'referee');
  return { valid: errors.length === 0, errors };
}

module.exports = {
  CATEGORIES,
  SLOTS,
  groupByCategory,
  isTeamComplete,
  validateRiderTeam,
  pilotCardId,
  emptyTeam,
  cardTeamFromRiders,
  normalizeTeam,
  teamRiderIds,
  validateCardTeam,
  TEAM_ERROR_CODES,
  sanitizeCardTeam,
};
