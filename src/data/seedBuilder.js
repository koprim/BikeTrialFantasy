const { coteFromRank } = require('../engine/cote');

function slug(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] || '').trim();
    });
    return row;
  });
}

function buildRiders(rows) {
  return rows.map((row) => {
    const uciRank = row.uci_rank ? Number(row.uci_rank) : null;
    return {
      id: slug(row.name),
      name: row.name,
      country: row.country,
      category: row.category,
      uciRank,
      cote: coteFromRank(uciRank),
    };
  });
}

function buildSeason(resultRows, ridersById, competitionsById) {
  const byEvent = {};
  resultRows.forEach((row) => {
    const eventId = row.event_id;
    const riderId = slug(row.name);
    if (!byEvent[eventId]) byEvent[eventId] = {};
    if (!byEvent[eventId][row.category]) byEvent[eventId][row.category] = [];
    byEvent[eventId][row.category].push({ pos: Number(row.position), riderId });
  });
  return Object.keys(byEvent).map((eventId) => {
    const meta = competitionsById[eventId] || {
      id: eventId,
      name: eventId,
      venue: '',
      country: '',
      dateFrom: '',
      round: 0,
    };
    const results = {};
    Object.keys(byEvent[eventId]).forEach((cat) => {
      results[cat] = byEvent[eventId][cat].sort((a, b) => a.pos - b.pos).map((x) => x.riderId);
    });
    return {
      id: meta.id,
      name: meta.name,
      venue: meta.venue,
      country: meta.country,
      dateFrom: meta.dateFrom,
      round: meta.round,
      results,
    };
  });
}

module.exports = { slug, parseCsv, buildRiders, buildSeason };
