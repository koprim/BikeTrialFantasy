const { dayBefore } = require('../../engine/calendar');
const { gameError } = require('../errors');
const { applyCollectionChange } = require('./applyCollectionChange');

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Going back in time must not lock the daily pack behind a future date.
function unlockPackFrom(effectiveDay) {
  return (collection) => {
    const last = collection.lastPackDate;
    return last && effectiveDay <= last ? { after: { ...collection, lastPackDate: dayBefore(effectiveDay) } } : null;
  };
}

// Dev project only: moves the shared simulated date.
function makeSetSimulatedDate({ allowSimulated, clock, settings, wallets }) {
  return async (userId, { date } = {}) => {
    if (!allowSimulated) throw gameError('FORBIDDEN');
    const simulatedDate = date || null;
    if (simulatedDate && !isRealCalendarDate(simulatedDate)) throw gameError('INVALID_INPUT');
    await settings.setSimulatedDate(simulatedDate);
    const effectiveDay = simulatedDate || clock.realToday();
    const collection = await applyCollectionChange(wallets, userId, unlockPackFrom(effectiveDay));
    return { simulatedDate, collection };
  };
}

module.exports = { makeSetSimulatedDate };
