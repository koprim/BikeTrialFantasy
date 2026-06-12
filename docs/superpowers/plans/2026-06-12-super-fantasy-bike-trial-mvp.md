# Super Fantasy Bike Trial — MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-device Expo (mobile + web) POC where a player picks a 6-rider team per UCI World Cup round, gets scored `position × cote` against simulated rivals, and climbs an event + season leaderboard.

**Architecture:** Pure-logic core (cote, scoring, bots, season aggregation) as plain CommonJS modules with no React/RN imports, fully unit-tested. A data layer turns CSV (or a synthetic dev generator) into two seed JSON files the app imports. A React Context + reducer holds game state. React Navigation drives a linear flow: Home → Briefing → Compose → EventResult → SeasonStandings → (next round).

**Tech Stack:** Expo 50, React Native 0.73 (JS), react-native-web, @react-navigation/native (native-stack), @react-native-async-storage/async-storage, Jest (jest-expo preset), @testing-library/react-native.

**Source spec:** `docs/superpowers/specs/2026-04-27-super-fantasy-bike-trial-design.md` §1bis (MVP scope).

---

## Conventions

- **Pure logic modules** (`src/engine/*`, `src/data/seedBuilder.js`) are **CommonJS** (`module.exports` / `require`) so Node scripts, Jest, and Metro can all load them.
- **React components / context** (`src/screens/*`, `src/state/*`, `App.js`) are **ESM** (`import`). Babel interops the CJS engine imports automatically.
- **Scripts** (`scripts/*.js`) are CommonJS, run with `node scripts/<file>.js`.
- Run a single test file: `npx jest <path> -t "<name>"`. Run all: `npm test`.
- Commit after every task.

## Canonical data shapes (used by every task — keep names identical)

```js
// Rider
{ id: 'jack-carthy', name: 'Jack CARTHY', country: 'GBR',
  category: 'SENIOR_26', uciRank: 1, cote: 1.0 }

// Event (one World Cup round)
{ id: 'tri-2026-wc-dole', name: 'UCI Trials World Cup', venue: 'Dole',
  country: 'FRA', dateFrom: '2026-05-08', round: 1,
  results: { SENIOR_26: ['jack-carthy', 'rider-x', ...] /* finishing order, index 0 = 1st */,
             JUNIOR_26: [...], SENIOR_20: [...], JUNIOR_20: [...], ELITE_WOMEN: [...] } }

// Team (player or bot pick)
{ senior26: 'riderId', junior26: 'riderId', senior20: 'riderId',
  junior20: 'riderId', eliteWomen1: 'riderId', eliteWomen2: 'riderId' }

// Rival
{ id: 'rival-1', name: 'Bot Alpha', strategy: 'FAVORIS' }

// EventOutcome (computed per event)
{ player: { total: 642.5, breakdown: [ { slotId, riderId, name, position, cote, points } x6 ] },
  leaderboard: [ { entrantId, name, isPlayer, score } sorted desc ] }

// Standing (leaderboard row)
{ entrantId: 'player'|'rival-1', name, isPlayer: bool, score: number }
```

## File Structure

| File | Responsibility |
|------|----------------|
| `src/engine/cote.js` | `coteFromRank(rank)` → multiplier |
| `src/engine/scoring.js` | `pointsForPosition`, `positionOf`, `riderEventScore`, `teamEventScore` |
| `src/engine/team.js` | `CATEGORIES`, `SLOTS`, `groupByCategory`, `isTeamComplete`, `validateTeam` |
| `src/engine/rng.js` | `makeRng(seed)` seeded PRNG |
| `src/engine/bots.js` | `generateBotTeam`, `createRivals` |
| `src/engine/season.js` | `computeEventOutcome`, `aggregateStandings` |
| `src/data/seedBuilder.js` | `parseCsv`, `buildRiders`, `buildSeason` (pure CSV→objects) |
| `src/data/seed/riders.json` | Generated rider seed (app input) |
| `src/data/seed/season.json` | Generated event seed (app input) |
| `src/data/index.js` | Loads seed JSON, exports `RIDERS`, `SEASON`, `RIDERS_BY_ID`, `ridersByCategory()` |
| `scripts/gen-dev-seed.js` | Synthesize dev seed JSON (playable now, no real data needed) |
| `scripts/build-seed.js` | Real pipeline: read `data/dev` or real CSVs → seed JSON |
| `src/state/GameContext.js` | Context + reducer: player, season progress, picks, outcomes |
| `src/ui/theme.js` | Minimal shared colors/spacing (visual style deferred) |
| `src/screens/HomeScreen.js` | Enter pseudo, list season rounds, start |
| `src/screens/BriefingScreen.js` | Event header + roster per category with cotes |
| `src/screens/ComposeScreen.js` | 6 slot pickers, validation, lock |
| `src/screens/EventResultScreen.js` | Player score breakdown + event leaderboard |
| `src/screens/SeasonStandingsScreen.js` | Cumulative standings + advance/finish |
| `App.js` | Navigation container + stack + GameProvider |
| `data/competitions-2026.json` | Already exists — full UCI 2026 calendar |
| `data/templates/*.csv` | Already exists — CSV templates for real data |

---

## Phase 0 — Project setup

### Task 1: Install dependencies and wire up Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `src/engine/__smoke__.test.js`

- [ ] **Step 1: Install runtime + dev dependencies**

Run:
```bash
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
npm install --save-dev jest-expo jest @testing-library/react-native react-test-renderer
```

- [ ] **Step 2: Add test script + jest preset to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "jest",
"gen:seed": "node scripts/gen-dev-seed.js",
"build:seed": "node scripts/build-seed.js"
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|react-native-svg))',
  ],
};
```

- [ ] **Step 4: Write a smoke test to prove Jest runs**

`src/engine/__smoke__.test.js`:
```js
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 5: Run it**

Run: `npm test -- src/engine/__smoke__.test.js`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js src/engine/__smoke__.test.js
git commit -m "chore: add navigation, async-storage, jest-expo test setup"
```

---

## Phase 1 — Engine (pure logic, TDD)

### Task 2: Cote derivation

**Files:**
- Create: `src/engine/cote.js`
- Test: `src/engine/cote.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/cote.test.js`:
```js
const { coteFromRank } = require('./cote');

describe('coteFromRank', () => {
  test('top 3 → 1.0', () => {
    expect(coteFromRank(1)).toBe(1.0);
    expect(coteFromRank(3)).toBe(1.0);
  });
  test('4–10 → 1.3', () => expect(coteFromRank(10)).toBe(1.3));
  test('11–25 → 1.6', () => expect(coteFromRank(25)).toBe(1.6));
  test('26–50 → 2.0', () => expect(coteFromRank(50)).toBe(2.0));
  test('beyond 50 → 2.5', () => expect(coteFromRank(51)).toBe(2.5));
  test('unranked/null → 2.5', () => expect(coteFromRank(null)).toBe(2.5));
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/cote.test.js`
Expected: FAIL ("Cannot find module './cote'").

- [ ] **Step 3: Implement**

`src/engine/cote.js`:
```js
function coteFromRank(rank) {
  if (rank == null) return 2.5;
  if (rank <= 3) return 1.0;
  if (rank <= 10) return 1.3;
  if (rank <= 25) return 1.6;
  if (rank <= 50) return 2.0;
  return 2.5;
}

module.exports = { coteFromRank };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/cote.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/cote.js src/engine/cote.test.js
git commit -m "feat(engine): cote multiplier from UCI rank"
```

---

### Task 3: Scoring engine

**Files:**
- Create: `src/engine/scoring.js`
- Test: `src/engine/scoring.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/scoring.test.js`:
```js
const {
  pointsForPosition, positionOf, riderEventScore, teamEventScore,
} = require('./scoring');

describe('pointsForPosition', () => {
  test('podium values', () => {
    expect(pointsForPosition(1)).toBe(100);
    expect(pointsForPosition(2)).toBe(80);
    expect(pointsForPosition(3)).toBe(65);
    expect(pointsForPosition(10)).toBe(12);
  });
  test('beyond 10 decays by 2, floor 4', () => {
    expect(pointsForPosition(11)).toBe(10);
    expect(pointsForPosition(13)).toBe(6);
    expect(pointsForPosition(20)).toBe(4);
  });
});

describe('positionOf', () => {
  const results = { SENIOR_26: ['a', 'b', 'c'] };
  test('1-based position', () => expect(positionOf('b', 'SENIOR_26', results)).toBe(2));
  test('absent rider → null', () => expect(positionOf('z', 'SENIOR_26', results)).toBeNull());
  test('missing category → null', () => expect(positionOf('a', 'JUNIOR_20', results)).toBeNull());
});

describe('riderEventScore', () => {
  test('points × cote', () => {
    expect(riderEventScore({ cote: 2.5 }, 3)).toBe(162.5); // 65 * 2.5
  });
  test('null position → 0', () => expect(riderEventScore({ cote: 2.5 }, null)).toBe(0));
});

describe('teamEventScore', () => {
  const ridersById = {
    r1: { id: 'r1', name: 'R1', category: 'SENIOR_26', cote: 1.0 },
    r2: { id: 'r2', name: 'R2', category: 'JUNIOR_26', cote: 1.3 },
    r3: { id: 'r3', name: 'R3', category: 'SENIOR_20', cote: 1.6 },
    r4: { id: 'r4', name: 'R4', category: 'JUNIOR_20', cote: 2.0 },
    r5: { id: 'r5', name: 'R5', category: 'ELITE_WOMEN', cote: 2.5 },
    r6: { id: 'r6', name: 'R6', category: 'ELITE_WOMEN', cote: 1.0 },
  };
  const team = { senior26: 'r1', junior26: 'r2', senior20: 'r3', junior20: 'r4', eliteWomen1: 'r5', eliteWomen2: 'r6' };
  const event = { results: {
    SENIOR_26: ['r1'], JUNIOR_26: ['x', 'r2'], SENIOR_20: ['r3'],
    JUNIOR_20: ['x', 'x', 'r4'], ELITE_WOMEN: ['r5', 'r6'],
  } };
  test('sums all six slots', () => {
    const out = teamEventScore(team, ridersById, event);
    // r1: 100*1.0=100, r2 pos2: 80*1.3=104, r3 pos1: 100*1.6=160,
    // r4 pos3: 65*2.0=130, r5 pos1: 100*2.5=250, r6 pos2: 80*1.0=80
    expect(out.total).toBe(824);
    expect(out.breakdown).toHaveLength(6);
    expect(out.breakdown[0]).toMatchObject({ slotId: 'senior26', position: 1, points: 100 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/scoring.test.js`
Expected: FAIL ("Cannot find module './scoring'").

- [ ] **Step 3: Implement**

`src/engine/scoring.js`:
```js
const { SLOTS } = require('./team');

const POSITION_POINTS = { 1: 100, 2: 80, 3: 65, 4: 52, 5: 42, 6: 34, 7: 27, 8: 21, 9: 16, 10: 12 };

function pointsForPosition(pos) {
  if (POSITION_POINTS[pos] != null) return POSITION_POINTS[pos];
  return Math.max(4, 12 - 2 * (pos - 10));
}

function positionOf(riderId, category, results) {
  const order = results[category];
  if (!order) return null;
  const idx = order.indexOf(riderId);
  return idx < 0 ? null : idx + 1;
}

function riderEventScore(rider, position) {
  if (position == null) return 0;
  return pointsForPosition(position) * rider.cote;
}

function teamEventScore(team, ridersById, event) {
  const breakdown = SLOTS.map((slot) => {
    const riderId = team[slot.id];
    const rider = ridersById[riderId];
    const position = rider ? positionOf(rider.id, rider.category, event.results) : null;
    const points = rider ? riderEventScore(rider, position) : 0;
    return {
      slotId: slot.id,
      riderId: riderId || null,
      name: rider ? rider.name : null,
      position,
      cote: rider ? rider.cote : null,
      points,
    };
  });
  const total = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { total, breakdown };
}

module.exports = { POSITION_POINTS, pointsForPosition, positionOf, riderEventScore, teamEventScore };
```

> Note: this requires `./team` (Task 4). Implement Task 4 before re-running if needed; the test above only exercises scoring but imports `SLOTS` transitively. If running this task first, create a minimal `src/engine/team.js` stub exporting `SLOTS` — but the recommended order is Task 4 then Task 3. **Reorder: do Task 4 before Task 3 when executing.**

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/scoring.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/scoring.js src/engine/scoring.test.js
git commit -m "feat(engine): position points and team scoring"
```

---

### Task 4: Team slots and validation

> **Execute this BEFORE Task 3** (scoring imports `SLOTS`).

**Files:**
- Create: `src/engine/team.js`
- Test: `src/engine/team.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/team.test.js`:
```js
const { CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateTeam } = require('./team');

test('five categories, six slots', () => {
  expect(CATEGORIES).toHaveLength(5);
  expect(SLOTS).toHaveLength(6);
  expect(SLOTS.filter((s) => s.category === 'ELITE_WOMEN')).toHaveLength(2);
});

test('groupByCategory buckets riders', () => {
  const riders = [
    { id: 'a', category: 'SENIOR_26' },
    { id: 'b', category: 'SENIOR_26' },
    { id: 'c', category: 'ELITE_WOMEN' },
  ];
  const g = groupByCategory(riders);
  expect(g.SENIOR_26.map((r) => r.id)).toEqual(['a', 'b']);
  expect(g.ELITE_WOMEN).toHaveLength(1);
});

describe('validateTeam', () => {
  const ridersById = {
    r1: { id: 'r1', category: 'SENIOR_26' }, r2: { id: 'r2', category: 'JUNIOR_26' },
    r3: { id: 'r3', category: 'SENIOR_20' }, r4: { id: 'r4', category: 'JUNIOR_20' },
    r5: { id: 'r5', category: 'ELITE_WOMEN' }, r6: { id: 'r6', category: 'ELITE_WOMEN' },
  };
  const full = { senior26: 'r1', junior26: 'r2', senior20: 'r3', junior20: 'r4', eliteWomen1: 'r5', eliteWomen2: 'r6' };

  test('complete + valid team', () => {
    expect(isTeamComplete(full)).toBe(true);
    expect(validateTeam(full, ridersById)).toEqual({ valid: true, errors: [] });
  });
  test('incomplete team', () => {
    const t = { ...full, eliteWomen2: null };
    expect(isTeamComplete(t)).toBe(false);
    expect(validateTeam(t, ridersById).valid).toBe(false);
  });
  test('duplicate elite women rejected', () => {
    const t = { ...full, eliteWomen2: 'r5' };
    const res = validateTeam(t, ridersById);
    expect(res.valid).toBe(false);
    expect(res.errors.join()).toMatch(/distinct/i);
  });
  test('wrong category in slot rejected', () => {
    const t = { ...full, senior26: 'r2' }; // r2 is JUNIOR_26
    expect(validateTeam(t, ridersById).valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/team.test.js`
Expected: FAIL ("Cannot find module './team'").

- [ ] **Step 3: Implement**

`src/engine/team.js`:
```js
const CATEGORIES = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];

const SLOTS = [
  { id: 'senior26', category: 'SENIOR_26', label: 'Senior 26"' },
  { id: 'junior26', category: 'JUNIOR_26', label: 'Junior 26"' },
  { id: 'senior20', category: 'SENIOR_20', label: 'Senior 20"' },
  { id: 'junior20', category: 'JUNIOR_20', label: 'Junior 20"' },
  { id: 'eliteWomen1', category: 'ELITE_WOMEN', label: 'Elite Femme 20" (1)' },
  { id: 'eliteWomen2', category: 'ELITE_WOMEN', label: 'Elite Femme 20" (2)' },
];

function groupByCategory(riders) {
  const out = {};
  CATEGORIES.forEach((c) => { out[c] = []; });
  riders.forEach((r) => { if (out[r.category]) out[r.category].push(r); });
  return out;
}

function isTeamComplete(team) {
  return SLOTS.every((s) => team && team[s.id]);
}

function validateTeam(team, ridersById) {
  const errors = [];
  if (!isTeamComplete(team)) errors.push('Team incomplete: all 6 slots required.');
  SLOTS.forEach((s) => {
    const id = team && team[s.id];
    if (id) {
      const rider = ridersById[id];
      if (!rider) errors.push(`Unknown rider in ${s.id}.`);
      else if (rider.category !== s.category) errors.push(`Slot ${s.id} expects ${s.category}.`);
    }
  });
  if (team && team.eliteWomen1 && team.eliteWomen1 === team.eliteWomen2) {
    errors.push('The two Elite Women must be distinct.');
  }
  return { valid: errors.length === 0, errors };
}

module.exports = { CATEGORIES, SLOTS, groupByCategory, isTeamComplete, validateTeam };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/team.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/team.js src/engine/team.test.js
git commit -m "feat(engine): team slots and validation"
```

---

### Task 5: Seeded RNG

**Files:**
- Create: `src/engine/rng.js`
- Test: `src/engine/rng.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/rng.test.js`:
```js
const { makeRng } = require('./rng');

test('deterministic for a seed', () => {
  const a = makeRng(42); const b = makeRng(42);
  const seqA = [a(), a(), a()]; const seqB = [b(), b(), b()];
  expect(seqA).toEqual(seqB);
});
test('values in [0,1)', () => {
  const r = makeRng(7);
  for (let i = 0; i < 100; i++) { const v = r(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
});
test('different seeds differ', () => {
  expect(makeRng(1)()).not.toEqual(makeRng(2)());
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/rng.test.js`
Expected: FAIL ("Cannot find module './rng'").

- [ ] **Step 3: Implement (mulberry32)**

`src/engine/rng.js`:
```js
function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { makeRng };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/rng.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rng.js src/engine/rng.test.js
git commit -m "feat(engine): seeded mulberry32 rng"
```

---

### Task 6: Bot teams and rivals

**Files:**
- Create: `src/engine/bots.js`
- Test: `src/engine/bots.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/bots.test.js`:
```js
const { generateBotTeam, createRivals } = require('./bots');
const { makeRng } = require('./rng');
const { validateTeam, groupByCategory } = require('./team');

function mkRiders() {
  const riders = [];
  const cats = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];
  cats.forEach((c) => {
    for (let i = 1; i <= 6; i++) {
      const rank = i * 8; // 8,16,24,32,40,48 → spread of cotes
      riders.push({ id: `${c}-${i}`, name: `${c} ${i}`, country: 'FRA', category: c, uciRank: rank, cote: rank <= 10 ? 1.3 : rank <= 25 ? 1.6 : 2.0 });
    }
  });
  return riders;
}

describe('generateBotTeam', () => {
  const riders = mkRiders();
  const byCat = groupByCategory(riders);
  const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));

  test.each(['FAVORIS', 'EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'])('%s produces a valid team', (strategy) => {
    const team = generateBotTeam(strategy, byCat, makeRng(1));
    expect(validateTeam(team, ridersById).valid).toBe(true);
  });

  test('FAVORIS picks best-ranked per category', () => {
    const team = generateBotTeam('FAVORIS', byCat, makeRng(1));
    expect(ridersById[team.senior26].uciRank).toBe(8); // lowest rank value in category
  });

  test('OUTSIDER picks worst-ranked (highest cote) per category', () => {
    const team = generateBotTeam('OUTSIDER', byCat, makeRng(1));
    expect(ridersById[team.senior26].uciRank).toBe(48);
  });

  test('ALEATOIRE deterministic for a seed', () => {
    const t1 = generateBotTeam('ALEATOIRE', byCat, makeRng(99));
    const t2 = generateBotTeam('ALEATOIRE', byCat, makeRng(99));
    expect(t1).toEqual(t2);
  });
});

describe('createRivals', () => {
  test('returns 10 rivals with valid strategies', () => {
    const rivals = createRivals();
    expect(rivals).toHaveLength(10);
    const strategies = new Set(rivals.map((r) => r.strategy));
    ['FAVORIS', 'EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'].forEach((s) => expect(strategies.has(s)).toBe(true));
    expect(new Set(rivals.map((r) => r.id)).size).toBe(10); // unique ids
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/bots.test.js`
Expected: FAIL ("Cannot find module './bots'").

- [ ] **Step 3: Implement**

`src/engine/bots.js`:
```js
const { SLOTS, CATEGORIES } = require('./team');

// Order a category's riders for a strategy. Lower uciRank = stronger.
function orderForStrategy(list, strategy, rng) {
  const arr = [...list];
  if (strategy === 'FAVORIS') return arr.sort((a, b) => a.uciRank - b.uciRank);
  if (strategy === 'OUTSIDER') return arr.sort((a, b) => b.uciRank - a.uciRank);
  if (strategy === 'EQUILIBRE') {
    const sorted = arr.sort((a, b) => a.uciRank - b.uciRank);
    const mid = Math.floor(sorted.length / 2);
    // reorder starting from the middle outwards (balanced picks)
    return [sorted[mid], ...sorted.slice(0, mid), ...sorted.slice(mid + 1)];
  }
  // ALEATOIRE: shuffle with rng
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateBotTeam(strategy, ridersByCategory, rng) {
  const team = {};
  const womenOrder = orderForStrategy(ridersByCategory.ELITE_WOMEN, strategy, rng);
  SLOTS.forEach((slot) => {
    if (slot.category === 'ELITE_WOMEN') return; // handled below
    const ordered = orderForStrategy(ridersByCategory[slot.category], strategy, rng);
    team[slot.id] = ordered[0].id;
  });
  team.eliteWomen1 = womenOrder[0].id;
  team.eliteWomen2 = womenOrder[1].id; // distinct by construction
  return team;
}

const RIVAL_PLAN = [
  ['Aigle', 'FAVORIS'], ['Bison', 'FAVORIS'], ['Cobra', 'FAVORIS'],
  ['Drago', 'EQUILIBRE'], ['Echo', 'EQUILIBRE'], ['Falco', 'EQUILIBRE'],
  ['Gecko', 'OUTSIDER'], ['Hydra', 'OUTSIDER'],
  ['Ibex', 'ALEATOIRE'], ['Jaguar', 'ALEATOIRE'],
];

function createRivals() {
  return RIVAL_PLAN.map(([name, strategy], i) => ({ id: `rival-${i + 1}`, name: `Bot ${name}`, strategy }));
}

module.exports = { generateBotTeam, createRivals };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/bots.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/bots.js src/engine/bots.test.js
git commit -m "feat(engine): bot team strategies and rivals"
```

---

### Task 7: Season outcome and standings

**Files:**
- Create: `src/engine/season.js`
- Test: `src/engine/season.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/season.test.js`:
```js
const { computeEventOutcome, aggregateStandings } = require('./season');
const { groupByCategory } = require('./team');
const { createRivals } = require('./bots');
const { makeRng } = require('./rng');

function mkRiders() {
  const riders = []; const cats = ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'];
  cats.forEach((c) => { for (let i = 1; i <= 6; i++) {
    const rank = i * 8; riders.push({ id: `${c}-${i}`, name: `${c} ${i}`, category: c, uciRank: rank, cote: rank <= 10 ? 1.3 : rank <= 25 ? 1.6 : 2.0 });
  } });
  return riders;
}

const RIDERS = mkRiders();
const ridersById = Object.fromEntries(RIDERS.map((r) => [r.id, r]));
const byCat = groupByCategory(RIDERS);
const event = { id: 'e1', round: 1, results: Object.fromEntries(
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].map((c) => [c, byCat[c].map((r) => r.id)]),
) };
const playerTeam = { senior26: 'SENIOR_26-1', junior26: 'JUNIOR_26-1', senior20: 'SENIOR_20-1', junior20: 'JUNIOR_20-1', eliteWomen1: 'ELITE_WOMEN-1', eliteWomen2: 'ELITE_WOMEN-2' };

test('computeEventOutcome returns player + sorted leaderboard with player row', () => {
  const rivals = createRivals();
  const out = computeEventOutcome({ event, playerName: 'Me', playerTeam, rivals, ridersById, ridersByCategory: byCat, seed: event.round });
  expect(out.player.total).toBeGreaterThan(0);
  expect(out.leaderboard).toHaveLength(rivals.length + 1);
  // sorted descending
  for (let i = 1; i < out.leaderboard.length; i++) {
    expect(out.leaderboard[i - 1].score).toBeGreaterThanOrEqual(out.leaderboard[i].score);
  }
  expect(out.leaderboard.some((s) => s.isPlayer && s.name === 'Me')).toBe(true);
});

test('aggregateStandings sums scores across events by entrant', () => {
  const outcomes = [
    { leaderboard: [ { entrantId: 'player', name: 'Me', isPlayer: true, score: 100 }, { entrantId: 'rival-1', name: 'Bot', isPlayer: false, score: 80 } ] },
    { leaderboard: [ { entrantId: 'player', name: 'Me', isPlayer: true, score: 50 }, { entrantId: 'rival-1', name: 'Bot', isPlayer: false, score: 120 } ] },
  ];
  const table = aggregateStandings(outcomes);
  expect(table[0]).toMatchObject({ entrantId: 'rival-1', score: 200 }); // 80+120, ranked first
  expect(table.find((t) => t.entrantId === 'player').score).toBe(150);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/engine/season.test.js`
Expected: FAIL ("Cannot find module './season'").

- [ ] **Step 3: Implement**

`src/engine/season.js`:
```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/engine/season.test.js`
Expected: PASS.

- [ ] **Step 5: Run the whole engine suite**

Run: `npm test -- src/engine`
Expected: PASS (all engine tests green).

- [ ] **Step 6: Commit**

```bash
git add src/engine/season.js src/engine/season.test.js
git commit -m "feat(engine): event outcome and season standings"
```

---

## Phase 2 — Data layer

### Task 8: CSV seed builder (pure)

**Files:**
- Create: `src/data/seedBuilder.js`
- Test: `src/data/seedBuilder.test.js`

- [ ] **Step 1: Write the failing test**

`src/data/seedBuilder.test.js`:
```js
const { parseCsv, buildRiders, buildSeason } = require('./seedBuilder');

const rankingsCsv = `category,uci_rank,name,country,points
SENIOR_26,1,Jack CARTHY,GBR,1250
SENIOR_26,40,Outsider GUY,FRA,300
ELITE_WOMEN,2,Top WOMAN,ESP,900`;

const resultsCsv = `event_id,category,position,name,country
tri-2026-wc-dole,SENIOR_26,1,Outsider GUY,FRA
tri-2026-wc-dole,SENIOR_26,2,Jack CARTHY,GBR
tri-2026-wc-dole,ELITE_WOMEN,1,Top WOMAN,ESP`;

const competitions = { competitions: [
  { id: 'tri-2026-wc-dole', name: 'UCI Trials World Cup', venue: 'Dole', country: 'FRA', dateFrom: '2026-05-08', round: 1, playable: true },
] };

test('parseCsv yields row objects', () => {
  const rows = parseCsv(rankingsCsv);
  expect(rows).toHaveLength(3);
  expect(rows[0]).toMatchObject({ category: 'SENIOR_26', uci_rank: '1', name: 'Jack CARTHY', country: 'GBR' });
});

test('buildRiders derives ids and cotes', () => {
  const riders = buildRiders(parseCsv(rankingsCsv));
  const carthy = riders.find((r) => r.name === 'Jack CARTHY');
  expect(carthy).toMatchObject({ id: 'jack-carthy', category: 'SENIOR_26', uciRank: 1, cote: 1.0 });
  expect(riders.find((r) => r.name === 'Outsider GUY').cote).toBe(2.0); // rank 40
});

test('buildSeason attaches ordered results to events', () => {
  const riders = buildRiders(parseCsv(rankingsCsv));
  const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
  const competitionsById = Object.fromEntries(competitions.competitions.map((c) => [c.id, c]));
  const season = buildSeason(parseCsv(resultsCsv), ridersById, competitionsById);
  expect(season).toHaveLength(1);
  expect(season[0].id).toBe('tri-2026-wc-dole');
  // position 1 = outsider-guy, position 2 = jack-carthy
  expect(season[0].results.SENIOR_26).toEqual(['outsider-guy', 'jack-carthy']);
  expect(season[0].results.ELITE_WOMEN).toEqual(['top-woman']);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/data/seedBuilder.test.js`
Expected: FAIL ("Cannot find module './seedBuilder'").

- [ ] **Step 3: Implement**

`src/data/seedBuilder.js`:
```js
const { coteFromRank } = require('../engine/cote');

function slug(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || '').trim(); });
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
    const meta = competitionsById[eventId] || { id: eventId, name: eventId, venue: '', country: '', dateFrom: '', round: 0 };
    const results = {};
    Object.keys(byEvent[eventId]).forEach((cat) => {
      results[cat] = byEvent[eventId][cat].sort((a, b) => a.pos - b.pos).map((x) => x.riderId);
    });
    return { id: meta.id, name: meta.name, venue: meta.venue, country: meta.country, dateFrom: meta.dateFrom, round: meta.round, results };
  });
}

module.exports = { slug, parseCsv, buildRiders, buildSeason };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/data/seedBuilder.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/seedBuilder.js src/data/seedBuilder.test.js
git commit -m "feat(data): pure CSV→seed builder"
```

---

### Task 9: Seed generators and data loader

**Files:**
- Create: `scripts/gen-dev-seed.js`
- Create: `scripts/build-seed.js`
- Create: `src/data/index.js`
- Create: `src/data/index.test.js`
- Generates: `src/data/seed/riders.json`, `src/data/seed/season.json`

- [ ] **Step 1: Write the dev seed generator**

`scripts/gen-dev-seed.js`:
```js
// Synthesizes a fully playable dev season so the app runs before real CSVs exist.
// Replace by running `npm run build:seed` once real data/dev CSVs are filled.
const fs = require('fs');
const path = require('path');
const { coteFromRank } = require('../src/engine/cote');
const { CATEGORIES } = require('../src/engine/team');
const { makeRng } = require('../src/engine/rng');

const competitions = require('../data/competitions-2026.json');
const COUNTRIES = ['FRA', 'GBR', 'ESP', 'GER', 'SUI', 'POL', 'CZE', 'BEL'];

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function buildRiders() {
  const riders = [];
  CATEGORIES.forEach((cat) => {
    for (let i = 1; i <= 8; i++) {
      const uciRank = (i - 1) * 7 + 1; // 1,8,15,22,29,36,43,50 → cote spread
      const name = `${cat.replace('_', ' ')} Pilote ${i}`;
      riders.push({ id: slug(`${cat}-${i}`), name, country: COUNTRIES[i % COUNTRIES.length], category: cat, uciRank, cote: coteFromRank(uciRank) });
    }
  });
  return riders;
}

function buildSeason(riders) {
  const byCat = {};
  CATEGORIES.forEach((c) => { byCat[c] = riders.filter((r) => r.category === c); });
  const playable = competitions.competitions.filter((c) => c.playable && c.class === 'CDM');
  return playable.map((c, idx) => {
    const rng = makeRng((c.round || idx + 1) * 17);
    const results = {};
    CATEGORIES.forEach((cat) => {
      const ids = byCat[cat].map((r) => r.id);
      for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
      results[cat] = ids;
    });
    return { id: c.id, name: c.name, venue: c.venue, country: c.country, dateFrom: c.dateFrom, round: c.round || idx + 1, results };
  });
}

const riders = buildRiders();
const season = buildSeason(riders);
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'season.json'), JSON.stringify(season, null, 2));
console.log(`Wrote ${riders.length} riders and ${season.length} events to src/data/seed/`);
```

- [ ] **Step 2: Write the real CSV pipeline**

`scripts/build-seed.js`:
```js
// Real pipeline: reads CSVs (default: data/dev/*.csv) → src/data/seed/*.json.
// Usage: node scripts/build-seed.js [rankingsCsvPath] [resultsCsvPath]
const fs = require('fs');
const path = require('path');
const { parseCsv, buildRiders, buildSeason } = require('../src/data/seedBuilder');
const competitions = require('../data/competitions-2026.json');

const rankingsPath = process.argv[2] || path.join(__dirname, '..', 'data', 'dev', 'rankings.csv');
const resultsPath = process.argv[3] || path.join(__dirname, '..', 'data', 'dev', 'results.csv');

const riders = buildRiders(parseCsv(fs.readFileSync(rankingsPath, 'utf8')));
const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
const competitionsById = Object.fromEntries(competitions.competitions.map((c) => [c.id, c]));
const season = buildSeason(parseCsv(fs.readFileSync(resultsPath, 'utf8')), ridersById, competitionsById);

const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'season.json'), JSON.stringify(season, null, 2));
console.log(`Built ${riders.length} riders and ${season.length} events from CSV.`);
```

- [ ] **Step 3: Generate the dev seed**

Run: `npm run gen:seed`
Expected: console prints "Wrote 40 riders and 3 events to src/data/seed/" and the two JSON files exist.

- [ ] **Step 4: Write the data loader**

`src/data/index.js`:
```js
import riders from './seed/riders.json';
import season from './seed/season.json';
import { groupByCategory } from '../engine/team';

export const RIDERS = riders;
export const SEASON = season;
export const RIDERS_BY_ID = Object.fromEntries(riders.map((r) => [r.id, r]));
export function ridersByCategory() { return groupByCategory(riders); }
```

- [ ] **Step 5: Write the loader test**

`src/data/index.test.js`:
```js
const { RIDERS, SEASON, RIDERS_BY_ID, ridersByCategory } = require('./index');

test('seed loads riders for all 5 categories', () => {
  const byCat = ridersByCategory();
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].forEach((c) => {
    expect(byCat[c].length).toBeGreaterThanOrEqual(2);
  });
});
test('every event result id resolves to a known rider', () => {
  SEASON.forEach((ev) => {
    Object.values(ev.results).forEach((order) => {
      order.forEach((id) => expect(RIDERS_BY_ID[id]).toBeDefined());
    });
  });
});
test('season has at least one event', () => expect(SEASON.length).toBeGreaterThan(0));
```

- [ ] **Step 6: Run the loader test**

Run: `npm test -- src/data/index.test.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/gen-dev-seed.js scripts/build-seed.js src/data/index.js src/data/index.test.js src/data/seed/
git commit -m "feat(data): dev + CSV seed generators and loader"
```

---

## Phase 3 — Game state

### Task 10: GameContext reducer

**Files:**
- Create: `src/state/GameContext.js`
- Test: `src/state/gameReducer.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/gameReducer.test.js`:
```js
const { gameReducer, initialState } = require('./GameContext');

test('START_SEASON sets player, season, rivals, index 0', () => {
  const season = [{ id: 'e1' }, { id: 'e2' }];
  const rivals = [{ id: 'rival-1' }];
  const s = gameReducer(initialState, { type: 'START_SEASON', payload: { name: 'Me', season, rivals } });
  expect(s.player).toEqual({ name: 'Me' });
  expect(s.season).toHaveLength(2);
  expect(s.currentIndex).toBe(0);
  expect(s.rivals).toEqual(rivals);
});

test('LOCK_TEAM stores pick + outcome for an event', () => {
  const base = { ...initialState, player: { name: 'Me' }, season: [{ id: 'e1' }], currentIndex: 0 };
  const team = { senior26: 'r1' };
  const outcome = { player: { total: 100, breakdown: [] }, leaderboard: [] };
  const s = gameReducer(base, { type: 'LOCK_TEAM', payload: { eventId: 'e1', team, outcome } });
  expect(s.picks.e1).toEqual(team);
  expect(s.outcomes.e1).toEqual(outcome);
});

test('ADVANCE increments currentIndex', () => {
  const base = { ...initialState, season: [{ id: 'e1' }, { id: 'e2' }], currentIndex: 0 };
  expect(gameReducer(base, { type: 'ADVANCE' }).currentIndex).toBe(1);
});

test('RESET returns to initial', () => {
  const base = { ...initialState, player: { name: 'X' }, currentIndex: 5 };
  expect(gameReducer(base, { type: 'RESET' })).toEqual(initialState);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/state/gameReducer.test.js`
Expected: FAIL ("Cannot find module './GameContext'").

- [ ] **Step 3: Implement**

`src/state/GameContext.js`:
```js
import React, { createContext, useContext, useReducer } from 'react';

const initialState = {
  player: null,        // { name }
  season: [],          // Event[]
  rivals: [],          // Rival[]
  currentIndex: 0,
  picks: {},           // { [eventId]: Team }
  outcomes: {},        // { [eventId]: EventOutcome }
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'START_SEASON':
      return { ...state, player: { name: action.payload.name }, season: action.payload.season, rivals: action.payload.rivals, currentIndex: 0, picks: {}, outcomes: {} };
    case 'LOCK_TEAM':
      return { ...state, picks: { ...state.picks, [action.payload.eventId]: action.payload.team }, outcomes: { ...state.outcomes, [action.payload.eventId]: action.payload.outcome } };
    case 'ADVANCE':
      return { ...state, currentIndex: state.currentIndex + 1 };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export { gameReducer, initialState };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/state/gameReducer.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/GameContext.js src/state/gameReducer.test.js
git commit -m "feat(state): game context and reducer"
```

---

## Phase 4 — UI (navigation + screens)

> Visual style is intentionally minimal (spec defers final styling). Use `src/ui/theme.js` tokens so a later restyle is a single-file change.

### Task 11: Theme tokens + navigation shell

**Files:**
- Create: `src/ui/theme.js`
- Modify: `App.js`
- Test: `App.test.js`

- [ ] **Step 1: Create theme tokens**

`src/ui/theme.js`:
```js
export const colors = {
  bg: '#F4F5F7', surface: '#FFFFFF', text: '#1A1C1E', muted: '#6B7280',
  primary: '#2563EB', accent: '#7C3AED', good: '#16A34A', border: '#E5E7EB',
};
export const space = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16 };
```

- [ ] **Step 2: Wire navigation in `App.js`**

`App.js` (replace entire file):
```js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/state/GameContext';
import HomeScreen from './src/screens/HomeScreen';
import BriefingScreen from './src/screens/BriefingScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import EventResultScreen from './src/screens/EventResultScreen';
import SeasonStandingsScreen from './src/screens/SeasonStandingsScreen';
import { colors } from './src/ui/theme';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } }}>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Super Fantasy Bike Trial' }} />
            <Stack.Screen name="Briefing" component={BriefingScreen} options={{ title: 'Briefing' }} />
            <Stack.Screen name="Compose" component={ComposeScreen} options={{ title: 'Mon équipe' }} />
            <Stack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats', headerBackVisible: false }} />
            <Stack.Screen name="SeasonStandings" component={SeasonStandingsScreen} options={{ title: 'Classement saison', headerBackVisible: false }} />
          </Stack.Navigator>
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Create placeholder screens so the app compiles**

Create each of these 5 files with a temporary body (they are fully implemented in Tasks 12–16). For now:

`src/screens/HomeScreen.js`, `src/screens/BriefingScreen.js`, `src/screens/ComposeScreen.js`, `src/screens/EventResultScreen.js`, `src/screens/SeasonStandingsScreen.js` — each:
```js
import React from 'react';
import { View, Text } from 'react-native';
export default function Screen() { return (<View><Text>placeholder</Text></View>); }
```

- [ ] **Step 4: Write an app smoke test**

`App.test.js`:
```js
import React from 'react';
import { render } from '@testing-library/react-native';
import App from './App';

test('app renders the Home screen title', async () => {
  const { findByText } = render(<App />);
  expect(await findByText(/Super Fantasy Bike Trial|Commencer|Pseudo/i)).toBeTruthy();
});
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test -- App.test.js`
Expected: PASS (renders without crashing). `native-stack` relies on `react-native-screens` + `react-native-safe-area-context` (installed in Task 1); no gesture-handler needed.

- [ ] **Step 6: Commit**

```bash
git add App.js App.test.js src/ui/theme.js src/screens/
git commit -m "feat(ui): navigation shell, theme tokens, screen placeholders"
```

---

### Task 12: HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.js`

- [ ] **Step 1: Implement HomeScreen**

`src/screens/HomeScreen.js` (replace):
```js
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { SEASON } from '../data/index';
import { createRivals } from '../engine/bots';
import { colors, space, radius } from '../ui/theme';

export default function HomeScreen({ navigation }) {
  const { dispatch } = useGame();
  const [name, setName] = useState('');

  function start() {
    const pseudo = name.trim() || 'Joueur';
    dispatch({ type: 'START_SEASON', payload: { name: pseudo, season: SEASON, rivals: createRivals() } });
    navigation.navigate('Briefing');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Compose ton équipe. Découvre les outsiders. Domine la saison.</Text>
      <Text style={styles.label}>Pseudo</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Ton pseudo" style={styles.input} />
      <Text style={styles.label}>Calendrier de la saison</Text>
      <FlatList
        data={SEASON}
        keyExtractor={(e) => e.id}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.round}>Manche {item.round || index + 1}</Text>
            <Text style={styles.event}>{item.venue} · {item.country}</Text>
          </View>
        )}
        style={{ alignSelf: 'stretch' }}
      />
      <Pressable accessibilityRole="button" onPress={start} style={styles.cta}>
        <Text style={styles.ctaText}>Commencer la saison</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.lg, gap: space.sm },
  h1: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: space.md },
  label: { fontSize: 13, color: colors.muted, marginTop: space.md },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: space.md, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border },
  round: { fontWeight: '700', color: colors.text },
  event: { color: colors.muted },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.md },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Verify the app smoke test still passes**

Run: `npm test -- App.test.js`
Expected: PASS (Home now shows "Commencer la saison").

- [ ] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.js
git commit -m "feat(ui): home screen with pseudo and season calendar"
```

---

### Task 13: BriefingScreen

**Files:**
- Modify: `src/screens/BriefingScreen.js`

- [ ] **Step 1: Implement BriefingScreen**

`src/screens/BriefingScreen.js` (replace):
```js
import React from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { ridersByCategory } from '../data/index';
import { SLOTS } from '../engine/team';
import { colors, space, radius } from '../ui/theme';

const CATEGORY_LABEL = {
  SENIOR_26: 'Senior 26"', JUNIOR_26: 'Junior 26"', SENIOR_20: 'Senior 20"',
  JUNIOR_20: 'Junior 20"', ELITE_WOMEN: 'Elite Femme 20"',
};

export default function BriefingScreen({ navigation }) {
  const { state } = useGame();
  const event = state.season[state.currentIndex];
  const byCat = ridersByCategory();
  const categories = [...new Set(SLOTS.map((s) => s.category))];
  const sections = categories.map((c) => ({
    title: CATEGORY_LABEL[c],
    data: [...byCat[c]].sort((a, b) => a.uciRank - b.uciRank),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{event.name}</Text>
        <Text style={styles.sub}>Manche {event.round} · {event.venue} ({event.country}) · {event.dateFrom}</Text>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{item.uciRank}</Text>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.country}>{item.country}</Text>
            <Text style={styles.cote}>×{item.cote.toFixed(1)}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
      />
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Compose')} style={styles.cta}>
        <Text style={styles.ctaText}>Composer mon équipe</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  header: { marginBottom: space.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, marginTop: space.xs },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  rank: { width: 40, color: colors.muted },
  name: { flex: 1, color: colors.text },
  country: { width: 44, color: colors.muted },
  cote: { width: 44, textAlign: 'right', fontWeight: '700', color: colors.primary },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Manual sanity check (optional)**

Run: `npm run web` and confirm Home → "Commencer" → Briefing lists riders per category with cotes. Stop the server when done.

- [ ] **Step 3: Commit**

```bash
git add src/screens/BriefingScreen.js
git commit -m "feat(ui): briefing screen with roster and cotes"
```

---

### Task 14: ComposeScreen

**Files:**
- Modify: `src/screens/ComposeScreen.js`

- [ ] **Step 1: Implement ComposeScreen**

`src/screens/ComposeScreen.js` (replace):
```js
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, FlatList, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { ridersByCategory, RIDERS_BY_ID } from '../data/index';
import { SLOTS, validateTeam } from '../engine/team';
import { computeEventOutcome } from '../engine/season';
import { colors, space, radius } from '../ui/theme';

const EMPTY = { senior26: null, junior26: null, senior20: null, junior20: null, eliteWomen1: null, eliteWomen2: null };

export default function ComposeScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const event = state.season[state.currentIndex];
  const byCat = ridersByCategory();
  const [team, setTeam] = useState(EMPTY);
  const [activeSlot, setActiveSlot] = useState(null);

  const result = validateTeam(team, RIDERS_BY_ID);
  const usedWomen = [team.eliteWomen1, team.eliteWomen2].filter(Boolean);

  function pick(riderId) {
    setTeam((t) => ({ ...t, [activeSlot.id]: riderId }));
    setActiveSlot(null);
  }

  function lock() {
    const outcome = computeEventOutcome({
      event, playerName: state.player.name, playerTeam: team, rivals: state.rivals,
      ridersById: RIDERS_BY_ID, ridersByCategory: byCat, seed: event.round,
    });
    dispatch({ type: 'LOCK_TEAM', payload: { eventId: event.id, team, outcome } });
    navigation.navigate('EventResult');
  }

  const options = activeSlot
    ? byCat[activeSlot.category].filter((r) => {
        if (activeSlot.id === 'eliteWomen1') return r.id !== team.eliteWomen2;
        if (activeSlot.id === 'eliteWomen2') return r.id !== team.eliteWomen1;
        return true;
      })
    : [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ gap: space.sm, padding: space.md }}>
        {SLOTS.map((slot) => {
          const rider = team[slot.id] ? RIDERS_BY_ID[team[slot.id]] : null;
          return (
            <Pressable key={slot.id} onPress={() => setActiveSlot(slot)} style={styles.slot} accessibilityRole="button">
              <Text style={styles.slotLabel}>{slot.label}</Text>
              {rider
                ? <Text style={styles.slotRider}>{rider.name} · {rider.country} · ×{rider.cote.toFixed(1)}</Text>
                : <Text style={styles.slotEmpty}>Choisir un pilote…</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {!result.valid && <Text style={styles.error}>{result.errors[0]}</Text>}
        <Pressable disabled={!result.valid} onPress={lock} style={[styles.cta, !result.valid && styles.ctaDisabled]} accessibilityRole="button">
          <Text style={styles.ctaText}>Verrouiller l'équipe</Text>
        </Pressable>
      </View>

      <Modal visible={!!activeSlot} animationType="slide" transparent onRequestClose={() => setActiveSlot(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{activeSlot?.label}</Text>
            <FlatList
              data={options.sort((a, b) => a.uciRank - b.uciRank)}
              keyExtractor={(r) => r.id}
              renderItem={({ item }) => (
                <Pressable onPress={() => pick(item.id)} style={styles.option} accessibilityRole="button">
                  <Text style={styles.optionName}>#{item.uciRank} {item.name}</Text>
                  <Text style={styles.optionCote}>×{item.cote.toFixed(1)}</Text>
                </Pressable>
              )}
            />
            <Pressable onPress={() => setActiveSlot(null)} style={styles.close}><Text style={styles.closeText}>Fermer</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slot: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, borderWidth: 1, borderColor: colors.border },
  slotLabel: { fontSize: 12, color: colors.muted },
  slotRider: { fontSize: 16, color: colors.text, fontWeight: '600', marginTop: 2 },
  slotEmpty: { fontSize: 16, color: colors.primary, marginTop: 2 },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  error: { color: '#DC2626', marginBottom: space.sm },
  cta: { backgroundColor: colors.good, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  ctaDisabled: { opacity: 0.4 },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  modalWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modal: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.md, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: space.sm, color: colors.text },
  option: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionName: { color: colors.text }, optionCote: { fontWeight: '700', color: colors.primary },
  close: { padding: space.md, alignItems: 'center' }, closeText: { color: colors.muted },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/ComposeScreen.js
git commit -m "feat(ui): compose screen with slot pickers, validation, lock"
```

---

### Task 15: EventResultScreen

**Files:**
- Modify: `src/screens/EventResultScreen.js`

- [ ] **Step 1: Implement EventResultScreen**

`src/screens/EventResultScreen.js` (replace):
```js
import React from 'react';
import { View, Text, SectionList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { colors, space, radius } from '../ui/theme';

export default function EventResultScreen({ navigation }) {
  const { state } = useGame();
  const event = state.season[state.currentIndex];
  const outcome = state.outcomes[event.id];

  const sections = [
    { title: 'Ton score', data: outcome.player.breakdown.map((b) => ({ kind: 'breakdown', ...b })) },
    { title: 'Classement de la manche', data: outcome.leaderboard.map((s, i) => ({ kind: 'standing', rank: i + 1, ...s })) },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.total}>{outcome.player.total.toFixed(0)} pts</Text>
      <Text style={styles.sub}>{event.name} · Manche {event.round}</Text>
      <SectionList
        sections={sections}
        keyExtractor={(item, i) => (item.kind === 'standing' ? item.entrantId : item.slotId) + i}
        renderSectionHeader={({ section }) => <Text style={styles.section}>{section.title}</Text>}
        renderItem={({ item }) => item.kind === 'breakdown' ? (
          <View style={styles.row}>
            <Text style={styles.cell1}>{item.name || '—'}</Text>
            <Text style={styles.cell2}>{item.position ? `P${item.position}` : 'DNF'}</Text>
            <Text style={styles.cell3}>×{item.cote?.toFixed(1) ?? '—'}</Text>
            <Text style={styles.cell4}>{item.points.toFixed(0)}</Text>
          </View>
        ) : (
          <View style={[styles.row, item.isPlayer && styles.playerRow]}>
            <Text style={styles.cell1}>{item.rank}. {item.name}{item.isPlayer ? ' (toi)' : ''}</Text>
            <Text style={styles.cell4}>{item.score.toFixed(0)}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
      />
      <Pressable onPress={() => navigation.navigate('SeasonStandings')} style={styles.cta} accessibilityRole="button">
        <Text style={styles.ctaText}>Voir le classement saison</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  total: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: space.md },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  cell1: { flex: 1, color: colors.text }, cell2: { width: 44, color: colors.muted },
  cell3: { width: 44, color: colors.muted }, cell4: { width: 56, textAlign: 'right', fontWeight: '700', color: colors.text },
  cta: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/EventResultScreen.js
git commit -m "feat(ui): event result screen with breakdown and leaderboard"
```

---

### Task 16: SeasonStandingsScreen (+ advance / finish)

**Files:**
- Modify: `src/screens/SeasonStandingsScreen.js`

- [ ] **Step 1: Implement SeasonStandingsScreen**

`src/screens/SeasonStandingsScreen.js` (replace):
```js
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useGame } from '../state/GameContext';
import { aggregateStandings } from '../engine/season';
import { colors, space, radius } from '../ui/theme';

export default function SeasonStandingsScreen({ navigation }) {
  const { state, dispatch } = useGame();
  const playedOutcomes = Object.values(state.outcomes);
  const standings = aggregateStandings(playedOutcomes);
  const isLast = state.currentIndex >= state.season.length - 1;

  function next() {
    if (isLast) {
      dispatch({ type: 'RESET' });
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      dispatch({ type: 'ADVANCE' });
      navigation.reset({ index: 0, routes: [{ name: 'Briefing' }] });
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Classement saison</Text>
      <Text style={styles.sub}>Après {playedOutcomes.length} / {state.season.length} manches</Text>
      <FlatList
        data={standings}
        keyExtractor={(s) => s.entrantId}
        renderItem={({ item, index }) => (
          <View style={[styles.row, item.isPlayer && styles.playerRow]}>
            <Text style={styles.rank}>{index + 1}</Text>
            <Text style={styles.name}>{item.name}{item.isPlayer ? ' (toi)' : ''}</Text>
            <Text style={styles.score}>{item.score.toFixed(0)}</Text>
          </View>
        )}
      />
      <Pressable onPress={next} style={styles.cta} accessibilityRole="button">
        <Text style={styles.ctaText}>{isLast ? 'Terminer la saison' : 'Manche suivante'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: 2, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  rank: { width: 28, fontWeight: '700', color: colors.muted },
  name: { flex: 1, color: colors.text }, score: { fontWeight: '800', color: colors.primary },
  cta: { backgroundColor: colors.good, padding: space.md, borderRadius: radius.md, alignItems: 'center', marginTop: space.sm },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
```

- [ ] **Step 2: Full manual playthrough**

Run: `npm run web`. Play a full season: enter pseudo → for each round, compose 6 valid riders → lock → see result → see season standings → next round → … → "Terminer la saison" returns to Home. Confirm the player can beat the "Bot Aigle/Bison/Cobra" (FAVORIS) bots by picking high-cote outsiders who finish well. Stop the server when done.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SeasonStandingsScreen.js
git commit -m "feat(ui): season standings with advance/finish flow"
```

---

## Phase 5 — Persistence (resilience for the demo)

### Task 17: Persist game state across reloads

**Files:**
- Modify: `src/state/GameContext.js`
- Test: `src/state/persistence.test.js`

- [ ] **Step 1: Write the failing test for the persistence helpers**

`src/state/persistence.test.js`:
```js
jest.mock('@react-native-async-storage/async-storage', () => {
  let store = {};
  return { setItem: jest.fn((k, v) => { store[k] = v; return Promise.resolve(); }), getItem: jest.fn((k) => Promise.resolve(store[k] ?? null)), removeItem: jest.fn((k) => { delete store[k]; return Promise.resolve(); }) };
});
const { saveState, loadState, STORAGE_KEY } = require('./persistence');

test('round-trips state through storage', async () => {
  const state = { player: { name: 'Me' }, currentIndex: 2 };
  await saveState(state);
  expect(await loadState()).toEqual(state);
  expect(STORAGE_KEY).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- src/state/persistence.test.js`
Expected: FAIL ("Cannot find module './persistence'").

- [ ] **Step 3: Implement persistence helpers**

`src/state/persistence.js`:
```js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEY = 'sfbt.gameState.v1';

export async function saveState(state) {
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* non-fatal for POC */ }
}
export async function loadState() {
  try { const raw = await AsyncStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- src/state/persistence.test.js`
Expected: PASS.

- [ ] **Step 5: Hydrate + persist in the provider**

In `src/state/GameContext.js`, update `GameProvider` to hydrate on mount and save on change:
```js
import { saveState, loadState } from './persistence';
import { useEffect } from 'react';

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  useEffect(() => { loadState().then((saved) => { if (saved) dispatch({ type: 'HYDRATE', payload: saved }); }); }, []);
  useEffect(() => { saveState(state); }, [state]);
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}
```
And add a `HYDRATE` case to `gameReducer`:
```js
    case 'HYDRATE':
      return { ...state, ...action.payload };
```

- [ ] **Step 6: Add a reducer test for HYDRATE**

Append to `src/state/gameReducer.test.js`:
```js
test('HYDRATE merges saved state', () => {
  const s = gameReducer(initialState, { type: 'HYDRATE', payload: { player: { name: 'Z' }, currentIndex: 3 } });
  expect(s.player).toEqual({ name: 'Z' });
  expect(s.currentIndex).toBe(3);
});
```

- [ ] **Step 7: Run state tests**

Run: `npm test -- src/state`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/state/GameContext.js src/state/persistence.js src/state/persistence.test.js src/state/gameReducer.test.js
git commit -m "feat(state): persist and hydrate game state via AsyncStorage"
```

---

## Done criteria

- `npm test` → all suites green (engine, data, state, app smoke).
- `npm run web` → full season playthrough works end-to-end on web.
- Picking high-cote outsiders who finish well beats the FAVORIS bots — the core hook is demonstrable.
- Real data path ready: drop filled `data/dev/rankings.csv` + `data/dev/results.csv` (or pass real CSV paths) and run `npm run build:seed` to replace the synthetic seed.

## Replacing dev data with real UCI data later

1. Fill `data/templates/rankings-template.csv` → save as `data/dev/rankings.csv`.
2. Fill `data/templates/results-template.csv` → save as `data/dev/results.csv`.
3. Run `npm run build:seed`.
4. Run `npm test` to confirm seed integrity (Task 9 loader test).
