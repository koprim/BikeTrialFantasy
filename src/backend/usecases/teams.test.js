const { makeSaveTeam } = require('./teams');
const { emptyCollection } = require('../../engine/collection');
const { validateCardTeam } = require('../../engine/team');
const demoPlayer = require('../../data/seed/demoPlayer.json');
const {
  fakeCatalog,
  fakeClock,
  fakeCompetitions,
  fakeTeams,
  fakeWallets,
  seedCatalog,
} = require('../../../test/fakes');

const team = Object.values(demoPlayer.picks)[0];
const owned = demoPlayer.collection.owned;
const competition = { id: 'c1', dateFrom: '2026-12-05', dateTo: '2026-12-06' };

function setup({ day = '2026-12-01', collection = { ...emptyCollection(), owned } } = {}) {
  const deps = {
    clock: fakeClock(day),
    catalog: fakeCatalog(),
    competitions: fakeCompetitions([competition]),
    wallets: fakeWallets(collection),
    teams: fakeTeams(),
  };
  return { deps, saveTeam: makeSaveTeam(deps) };
}

test('precondition: the demo team is valid with the demo collection', () => {
  const { cardsById, ridersById, balance } = seedCatalog();
  expect(validateCardTeam(team, { cardsById, ridersById, owned, balance }).valid).toBe(true);
});

test('saves a valid team before the competition starts', async () => {
  const { deps, saveTeam } = setup();
  await saveTeam('u1', { competitionId: 'c1', team });
  expect(deps.teams.saved).toEqual([{ userId: 'u1', competitionId: 'c1', team }]);
});

test('refuses once the competition has started', async () => {
  const { saveTeam } = setup({ day: '2026-12-05' });
  await expect(saveTeam('u1', { competitionId: 'c1', team })).rejects.toMatchObject({ code: 'TEAM_LOCKED' });
});

test('refuses once the competition is finished', async () => {
  const { saveTeam } = setup({ day: '2026-12-07' });
  await expect(saveTeam('u1', { competitionId: 'c1', team })).rejects.toMatchObject({ code: 'TEAM_LOCKED' });
});

test('refuses cards the player does not own, with the reasons', async () => {
  const { saveTeam } = setup({ collection: emptyCollection() });
  const error = await saveTeam('u1', { competitionId: 'c1', team }).catch((e) => e);
  expect(error.code).toBe('INVALID_TEAM');
  expect(error.details.join(' ')).toContain('non possédée');
});

test('unknown competition and missing team are rejected', async () => {
  const { saveTeam } = setup();
  await expect(saveTeam('u1', { competitionId: 'nope', team })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  await expect(saveTeam('u1', { competitionId: 'c1' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
});
