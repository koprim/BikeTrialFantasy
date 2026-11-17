const { eventStatus } = require('../../engine/calendar');
const { validateCardTeam } = require('../../engine/team');
const { gameError } = require('../errors');

function makeSaveTeam({ clock, catalog, competitions, wallets, teams }) {
  return async (userId, { competitionId, team } = {}) => {
    if (!team || typeof team !== 'object') throw gameError('INVALID_INPUT');
    const competition = await competitions.get(competitionId);
    if (!competition) throw gameError('NOT_FOUND');
    if (eventStatus(competition, await clock.today()) !== 'open') throw gameError('TEAM_LOCKED');
    const { cardsById, ridersById, balance } = await catalog.load();
    const { collection } = await wallets.load(userId);
    const check = validateCardTeam(team, { cardsById, ridersById, owned: collection.owned, balance });
    if (!check.valid) throw gameError('INVALID_TEAM', check.errors);
    await teams.save(userId, competitionId, team);
    return team;
  };
}

module.exports = { makeSaveTeam };
