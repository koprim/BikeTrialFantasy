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

test.each([
  ['an array team', []],
  ['a string team', 'team'],
  ['slots as an array', { slots: [], equipment: [], referee: null }],
  ['string techniques', { ...team, slots: { ...team.slots, senior26: { ...team.slots.senior26, techniques: 'abc' } } }],
  ['a null slot entry', { ...team, slots: { ...team.slots, senior26: null } }],
  ['a malformed referee', { ...team, referee: 'ref' }],
])('malformed team (%s) is rejected and nothing is saved', async (_label, badTeam) => {
  const { deps, saveTeam } = setup();
  await expect(saveTeam('u1', { competitionId: 'c1', team: badTeam })).rejects.toMatchObject({
    code: 'INVALID_INPUT',
  });
  expect(deps.teams.saved).toEqual([]);
});

test('extra keys are neither validated against nor persisted, and the saved team is returned', async () => {
  const { deps, saveTeam } = setup();
  const dirty = { ...team, admin: true, slots: { ...team.slots, hacker: team.slots.senior26 } };
  const result = await saveTeam('u1', { competitionId: 'c1', team: dirty });
  expect(result).toEqual(team);
  expect(deps.teams.saved).toEqual([{ userId: 'u1', competitionId: 'c1', team }]);
});

test.each([[null], [undefined], ['x'], [[]], [{ team }], [{ competitionId: '', team }], [{ competitionId: 5, team }]])(
  'invalid input %p is rejected',
  async (input) => {
    const { deps, saveTeam } = setup();
    await expect(saveTeam('u1', input)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(deps.teams.saved).toEqual([]);
  },
);
