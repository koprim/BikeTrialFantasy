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

// A missing or null date clears the simulated date; anything else must be a real YYYY-MM-DD string.
function parseSimulatedDate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw gameError('INVALID_INPUT');
  const { date } = input;
  if (date === null || date === undefined) return null;
  if (typeof date !== 'string' || !isRealCalendarDate(date)) throw gameError('INVALID_INPUT');
  return date;
}

// Dev project only. The simulated date is global (it moves "today" for every player), while the
// lastPackDate clamping below only touches the caller's own collection. The date is stored before the
// collection commit: a BUSY there leaves the date moved, which is acceptable in dev.
function makeSetSimulatedDate({ allowSimulated, clock, settings, wallets }) {
  return async (userId, input) => {
    if (!allowSimulated) throw gameError('FORBIDDEN');
    const simulatedDate = parseSimulatedDate(input);
    await settings.setSimulatedDate(simulatedDate);
    const effectiveDay = simulatedDate || clock.realToday();
    const collection = await applyCollectionChange(wallets, userId, unlockPackFrom(effectiveDay));
    return { simulatedDate, collection };
  };
}

module.exports = { makeSetSimulatedDate };
