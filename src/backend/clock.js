function formatDay(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// The single rule for "today" on the server. readSimulatedDate is consulted only when allowSimulated (dev project).
function makeClock({ timeZone, allowSimulated = false, readSimulatedDate = async () => null, now = () => new Date() }) {
  if (!timeZone) throw new Error('makeClock: timeZone is required');
  const realToday = () => formatDay(now(), timeZone);
  return {
    realToday,
    async today() {
      return (allowSimulated && (await readSimulatedDate())) || realToday();
    },
  };
}

module.exports = { makeClock };
