// All dates are 'YYYY-MM-DD' strings; lexical comparison equals chronological order.

function today(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function endOf(event) { return event.dateTo || event.dateFrom; }
function seasonStart(season) { return season.events[0].dateFrom; }
function seasonEnd(season) { return endOf(season.events[season.events.length - 1]); }

function eventStatus(event, now) {
  if (now < event.dateFrom) return 'open';
  if (now <= endOf(event)) return 'live';
  return 'done';
}

function seasonStatus(season, now) {
  if (now > seasonEnd(season)) return 'archived';
  if (now < seasonStart(season)) return 'upcoming';
  return 'current';
}

function currentSeason(seasons, now) {
  const current = seasons.find((s) => seasonStatus(s, now) === 'current');
  if (current) return current;
  const upcoming = seasons
    .filter((s) => seasonStatus(s, now) === 'upcoming')
    .sort((a, b) => seasonStart(a).localeCompare(seasonStart(b)));
  if (upcoming.length) return upcoming[0];
  return [...seasons].sort((a, b) => seasonEnd(b).localeCompare(seasonEnd(a)))[0];
}

module.exports = { today, eventStatus, seasonStatus, currentSeason };
