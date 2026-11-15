// Scores are never stored: they are derived from seeded results once an event is done.
const { eventStatus } = require('../engine/calendar');
const { computeEventOutcome, aggregateStandings } = require('../engine/season');
const { createRivals } = require('../engine/bots');

const RIVALS = createRivals();

function eventOutcome({ event, picks, playerName, now, ridersById, ridersByCategory }) {
  if (eventStatus(event, now) !== 'done') return null;
  return computeEventOutcome({
    event, playerName, playerTeam: picks[event.id] || {}, rivals: RIVALS,
    ridersById, ridersByCategory, seed: event.round,
  });
}

function seasonSummary({ season, ...ctx }) {
  const outcomes = season.events.map((event) => eventOutcome({ event, ...ctx })).filter(Boolean);
  const standings = aggregateStandings(outcomes);
  const rank = standings.findIndex((s) => s.isPlayer) + 1;
  const score = rank ? standings[rank - 1].score : 0;
  return { standings, rank, score, played: outcomes.length };
}

module.exports = { eventOutcome, seasonSummary };
