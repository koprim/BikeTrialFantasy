const { SLOTS, teamRiderIds } = require('./team');
const { evaluateTrigger, scaledValue, describeEffect } = require('./effects');

const POSITION_POINTS = { 1: 100, 2: 80, 3: 65, 4: 52, 5: 42, 6: 34, 7: 27, 8: 21, 9: 16, 10: 12 };

function pointsForPosition(pos) {
  if (POSITION_POINTS[pos] != null) return POSITION_POINTS[pos];
  return Math.max(4, 12 - 2 * (pos - 10));
}

function positionOf(riderId, category, results) {
  const order = results[category];
  if (!order) return null;
  const idx = order.indexOf(riderId);
  return idx < 0 ? null : idx + 1;
}

function riderEventScore(rider, position) {
  if (position == null) return 0;
  return pointsForPosition(position) * rider.cote;
}

// team = card team; deps = { ridersById, cardsById, balance }.
function teamEventScore(team, event, { ridersById, cardsById, balance }) {
  const slots = team.slots || {};
  const riderIds = teamRiderIds({ slots }, cardsById);
  const rows = [];
  const pending = []; // { card, rarity, effect, riderId, rowIndex }
  const collect = (ref, riderId, rowIndex = null) => {
    const card = cardsById[ref.cardId];
    if (card) card.effects.forEach((effect) => pending.push({ card, rarity: ref.rarity, effect, riderId, rowIndex }));
  };

  SLOTS.forEach((slot) => {
    const entry = slots[slot.id];
    const card = entry && cardsById[entry.cardId];
    const rider = card && ridersById[card.subject];
    const position = rider ? positionOf(rider.id, rider.category, event.results) : null;
    rows.push({
      slotId: slot.id, cardId: entry ? entry.cardId : null, rarity: entry ? entry.rarity : null,
      riderId: rider ? rider.id : null, category: rider ? rider.category : null, name: rider ? rider.name : null,
      position, cote: rider ? rider.cote : null, points: rider ? riderEventScore(rider, position) : 0,
    });
    if (card) {
      collect(entry, rider ? rider.id : null, rows.length - 1);
      (entry.techniques || []).forEach((t) => collect(t, rider ? rider.id : null, rows.length - 1));
    }
  });
  (team.equipment || []).forEach((e) => collect(e, null));
  if (team.referee) collect(team.referee, null);

  const fired = pending.filter(({ effect, riderId }) =>
    evaluateTrigger(effect.trigger, { event, ridersById, riderId, teamRiderIds: riderIds }));
  const ofType = (type) => fired.filter((f) => f.effect.reward.type === type);
  const value = (f) => scaledValue(f.effect.reward, f.rarity, balance);
  const effects = [];
  const note = (f, points) => effects.push({
    cardId: f.card.id, name: f.card.name, rarity: f.rarity, description: describeEffect(f.effect, f.rarity, balance), points,
  });

  const base = rows.map((r) => r.points);
  ofType('RIDER_MULTIPLIER').filter((f) => f.riderId && f.rowIndex != null).forEach((f) => {
    const i = f.rowIndex;
    const gain = base[i] * value(f);
    rows[i].points += gain;
    note(f, gain);
  });

  const afterRider = rows.map((r) => r.points);
  ofType('CATEGORY_MULTIPLIER').forEach((f) => {
    let gain = 0;
    rows.forEach((r, i) => {
      if (r.category === f.effect.reward.category) { const g = afterRider[i] * value(f); r.points += g; gain += g; }
    });
    note(f, gain);
  });

  let total = rows.reduce((sum, r) => sum + r.points, 0);
  const subtotal = total;
  ofType('TEAM_MULTIPLIER').forEach((f) => { const gain = subtotal * value(f); total += gain; note(f, gain); });
  ofType('FLAT_POINTS').forEach((f) => { const gain = value(f); total += gain; note(f, gain); });

  return { total, breakdown: rows, effects };
}

module.exports = { POSITION_POINTS, pointsForPosition, positionOf, riderEventScore, teamEventScore };
