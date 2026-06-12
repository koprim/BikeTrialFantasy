const { teamEventScore } = require('./scoring');
const { generateBotTeam } = require('./bots');
const { makeRng } = require('./rng');

function computeEventOutcome({ event, playerName, playerTeam, rivals, ridersById, ridersByCategory, seed }) {
  const player = teamEventScore(playerTeam, ridersById, event);
  const leaderboard = [{ entrantId: 'player', name: playerName, isPlayer: true, score: player.total }];
  rivals.forEach((rival, i) => {
    const rng = makeRng((seed || 1) * 1000 + i);
    const botTeam = generateBotTeam(rival.strategy, ridersByCategory, rng);
    const score = teamEventScore(botTeam, ridersById, event).total;
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
