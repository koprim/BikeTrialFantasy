const { SLOTS } = require('./team');

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

function teamEventScore(team, ridersById, event) {
  const breakdown = SLOTS.map((slot) => {
    const riderId = team[slot.id];
    const rider = ridersById[riderId];
    const position = rider ? positionOf(rider.id, rider.category, event.results) : null;
    const points = rider ? riderEventScore(rider, position) : 0;
    return {
      slotId: slot.id,
      riderId: riderId || null,
      name: rider ? rider.name : null,
      position,
      cote: rider ? rider.cote : null,
      points,
    };
  });
  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { total, breakdown };
}

module.exports = { POSITION_POINTS, pointsForPosition, positionOf, riderEventScore, teamEventScore };
