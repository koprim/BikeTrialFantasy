// Declarative card effects: { trigger, reward }; their sentence lives in the locale files. Pure functions only.
const TRIGGERS = [
  'ALWAYS',
  'RIDER_TOP_N',
  'RIDER_DID_TECHNIQUE',
  'RIDER_CLEAN_MIN',
  'NATION_COUNT_IN_TOP',
  'CATEGORY_WINNER_NATION',
  'TEAM_BRAND_COUNT',
  'CATEGORY_WINNER_OUTSIDER',
];
const REWARDS = ['FLAT_POINTS', 'RIDER_MULTIPLIER', 'CATEGORY_MULTIPLIER', 'TEAM_MULTIPLIER'];
const RIDER_TRIGGERS = ['RIDER_TOP_N', 'RIDER_DID_TECHNIQUE', 'RIDER_CLEAN_MIN'];

function winnerOf(event, category, ridersById) {
  const order = (event.results || {})[category] || [];
  return ridersById[order[0]] || null;
}

// ctx = { event, ridersById, riderId (rider the card acts on, or null), teamRiderIds }
function evaluateTrigger(trigger, ctx) {
  if (!trigger) return false;
  const { event, ridersById, riderId, teamRiderIds } = ctx;
  const results = event.results || {};
  const stats = riderId ? (event.stats || {})[riderId] : null;
  switch (trigger.type) {
    case 'ALWAYS':
      return true;
    case 'RIDER_TOP_N': {
      const rider = riderId && ridersById[riderId];
      const order = rider && results[rider.category];
      if (!order) return false;
      const idx = order.indexOf(riderId);
      return idx >= 0 && idx < trigger.n;
    }
    case 'RIDER_DID_TECHNIQUE':
      return !!stats && (stats.techniques || []).includes(trigger.technique);
    case 'RIDER_CLEAN_MIN':
      return !!stats && stats.cleanSections >= trigger.min;
    case 'NATION_COUNT_IN_TOP': {
      const top = (results[trigger.category] || []).slice(0, trigger.top);
      return top.filter((id) => ridersById[id] && ridersById[id].country === trigger.nation).length >= trigger.min;
    }
    case 'CATEGORY_WINNER_NATION': {
      const w = winnerOf(event, trigger.category, ridersById);
      return !!w && w.country === trigger.nation;
    }
    case 'TEAM_BRAND_COUNT':
      return (
        teamRiderIds.filter((id) => ridersById[id] && ridersById[id].brand === trigger.brand).length >= trigger.min
      );
    case 'CATEGORY_WINNER_OUTSIDER': {
      const w = winnerOf(event, trigger.category, ridersById);
      return !!w && w.cote >= trigger.minCote;
    }
    default:
      return false;
  }
}

function scaledValue(reward, rarity, balance) {
  const m = balance.rarityMultiplier[rarity];
  return m === undefined ? 0 : reward.value * m;
}

function formatValue(reward, rarity, balance) {
  const v = scaledValue(reward, rarity, balance);
  const fmt = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  return reward.type === 'FLAT_POINTS' ? fmt(v) : `${fmt(v * 100)} %`;
}

module.exports = { TRIGGERS, REWARDS, RIDER_TRIGGERS, evaluateTrigger, scaledValue, formatValue };
