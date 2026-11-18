const { makeClock } = require('./clock');
const { makeHttpHandler } = require('./http');
const adapters = require('./supabase/adapters');
const { makeOpenStarter, makeOpenDailyPack } = require('./usecases/packs');
const { makeRecycle, makeCraft } = require('./usecases/cards');
const { makeSaveTeam } = require('./usecases/teams');
const { makeSetSimulatedDate } = require('./usecases/devDate');

// Composition root: wiring only. Returns one HTTP handler per Edge Function name.
function buildServer({ db, env, randomSeed }) {
  const allowSimulated = env.ALLOW_SIMULATED_DATE === 'true';
  const settings = adapters.makeSettings(db);
  const deps = {
    allowSimulated,
    randomSeed,
    settings,
    clock: makeClock({ timeZone: env.PACK_TIMEZONE, allowSimulated, readSimulatedDate: settings.getSimulatedDate }),
    catalog: adapters.makeCatalog(db),
    wallets: adapters.makeWallets(db),
    competitions: adapters.makeCompetitions(db),
    teams: adapters.makeTeams(db),
  };
  const http = (action) => makeHttpHandler({ authenticate: adapters.makeAuthenticator(db), action });
  const withCollection = (useCase) => http(async (userId, body) => ({ collection: await useCase(userId, body) }));
  const saveTeam = makeSaveTeam(deps);
  return {
    'open-starter': withCollection(makeOpenStarter(deps)),
    'open-daily-pack': withCollection(makeOpenDailyPack(deps)),
    recycle: withCollection(makeRecycle(deps)),
    craft: withCollection(makeCraft(deps)),
    'save-team': http(async (userId, body) => ({ team: await saveTeam(userId, body) })),
    'set-simulated-date': http(makeSetSimulatedDate(deps)),
  };
}

module.exports = { buildServer };
