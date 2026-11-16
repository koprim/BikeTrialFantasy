const { teamEventScore } = require('./scoring');
const { generateBotTeam } = require('./bots');
const { makeRng } = require('./rng');
const { normalizeTeam, cardTeamFromRiders, emptyTeam } = require('./team');

function computeEventOutcome({ event, playerName, playerTeam, rivals, ridersById, ridersByCategory, cardsById, balance, edition, seed }) {
  const deps = { ridersById, cardsById, balance };
  const player = teamEventScore(normalizeTeam(playerTeam, edition) || emptyTeam(), event, deps);
  const leaderboard = [{ entrantId: 'player', name: playerName, isPlayer: true, score: player.total }];
  rivals.forEach((rival, i) => {
    const rng = makeRng((seed || 1) * 1000 + i);
    // Rivals play Common pilot cards with their effects, without techniques, equipment or referee.
    const botTeam = cardTeamFromRiders(generateBotTeam(rival.strategy, ridersByCategory, rng), edition);
    const score = teamEventScore(botTeam, event, deps).total;
    leaderboard.push({ entrantId: rival.id, name: rival.name, isPlayer: false, score });
  });
  leaderboard.sort((a, b) => b.score - a.score);
  return { player, leaderboard };
}

function aggregateStandings(outcomes) {
  const totals = {};
  outcomes.forEach((o) => {
    o.leaderboard.forEach((row) => {
      if (!totals[row.entrantId]) totals[row.entrantId] = { entrantId: row.entrantId, name: row.name, isPlayer: row.isPlayer, score: 0 };
      totals[row.entrantId].score += row.score;
    });
  });
  return Object.values(totals).sort((a, b) => b.score - a.score);
}

module.exports = { computeEventOutcome, aggregateStandings };
