# Menu & Date-Driven Seasons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the linear player-driven loop with a 4-tab menu (Jouer / Classement / Historique / Règles) over two simulated seasons (2025 archived, 2026-27 current) whose event lock, result reveal and archiving are driven by dates.

**Architecture:** A pure `calendar` engine derives event/season status from a `'YYYY-MM-DD'` date. Game state shrinks to `{ player, picks, simulatedDate }`; scores are never stored but derived on demand by `selectors` from seeded results through the existing scoring/bots engine. `useNow()` returns the simulated date or today, so every screen agrees on "now". Navigation becomes a bottom-tab navigator with one native stack per tab.

**Tech Stack:** Expo 50, React Native 0.73 (JS), react-native-web, @react-navigation/native + native-stack + **bottom-tabs@^6**, AsyncStorage, Jest (jest-expo), @testing-library/react-native.

**Source spec:** `docs/superpowers/specs/2026-11-15-menu-navigation-design.md`

---

## Conventions

- Same as the MVP plan: `src/engine/*` and `src/state/selectors.js` are **CommonJS**; React files (`src/screens/*`, `src/ui/*.js` components, `src/state/GameContext.js`, `App.js`) are **ESM**.
- Run one test file: `npx jest <path>`. Run all: `npm test`.
- Dates are always `'YYYY-MM-DD'` strings, compared lexically (`<`, `<=`, `>`).
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Expected red window:** from Task 3 to Task 10, `App.test.js` and `integration.test.js` fail because old screens use removed data/actions. Run only the test files named in each task until Task 10 restores the full suite.

## Data shapes (keep names identical across tasks)

```js
Season = { id: '2026-27', name: 'Coupe du Monde 2026-27', events: Event[] }      // events sorted by dateFrom
Event  = { id: '2026-27-r3', name, venue, country, round: 3, dateFrom: '2026-11-29', dateTo: '2026-11-30',
           results: { [category]: riderId[] } }                                   // dateTo may be missing on real data
Team   = { senior26, junior26, senior20, junior20, eliteWomen1, eliteWomen2 }    // riderIds
State  = { player: { name }, picks: { [eventId]: Team }, simulatedDate: null | 'YYYY-MM-DD' }
Ctx    = { picks, playerName, now, ridersById, ridersByCategory }                 // input to selectors
EventStatus  = 'open' | 'live' | 'done'
SeasonStatus = 'upcoming' | 'current' | 'archived'
```

## File structure

| File | Action | Responsibility |
|------|--------|----------------|
| `scripts/patch-expo-windows.js` | create | Re-apply the Expo 50 / Windows `node:sea` fix after every install |
| `src/engine/calendar.js` (+test) | create | `today`, `eventStatus`, `seasonStatus`, `currentSeason` |
| `scripts/gen-dev-seed.js` | modify | Write `seasons.json` (2 seasons) + `demoPlayer.json` |
| `scripts/build-seed.js` | modify | Real CSV pipeline writes `seasons.json` |
| `src/data/seed/seasons.json`, `demoPlayer.json` | generated | Seed data; `season.json` deleted |
| `src/data/index.js` (+test) | modify | Export `SEASONS`, `EVENTS_BY_ID`, `DEMO_PLAYER` |
| `src/state/selectors.js` (+test) | create | `eventOutcome`, `seasonSummary` |
| `src/state/GameContext.js` (+`gameReducer.test.js`) | rewrite | New reducer, hydration gate, `useNow`, `useScoring` |
| `src/ui/confirm.js` | create | Cross-platform confirmation |
| `src/ui/eventLabel.js` | create | Status text for an event row |
| `src/ui/OutcomeView.js`, `src/ui/StandingsList.js` | create | Shared result / standings rendering |
| `src/screens/SeasonHomeScreen.js` | create | Play tab root (replaces `HomeScreen.js`) |
| `src/screens/BriefingScreen.js`, `ComposeScreen.js`, `EventResultScreen.js` | modify | Take `eventId` route param |
| `src/screens/StandingsScreen.js`, `SeasonListScreen.js`, `SeasonDetailScreen.js`, `RulesScreen.js` (+test) | create | Other tabs |
| `src/screens/HomeScreen.js`, `SeasonStandingsScreen.js` | delete | Replaced |
| `App.js`, `App.test.js`, `integration.test.js` | modify | Tab navigator + updated tests |

---

## Task 1: Install bottom-tabs and make the Expo Windows fix durable

**Files:**
- Create: `scripts/patch-expo-windows.js`
- Modify: `package.json` (scripts + dependency)

- [ ] **Step 1: Write the patch script**

`scripts/patch-expo-windows.js`:

```js
// Expo SDK 50 on Windows with Node >= 22: Metro tries to mkdir `.expo/metro/externals/node:sea`,
// and ':' is invalid in Windows paths. Skip builtin module names containing ':'.
// Runs on postinstall; safe to run repeatedly.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'metro', 'externals.js');
const FROM = 'node-inspect)\\/|\\//.test(x)';
const TO = 'node-inspect)\\/|\\/|:/.test(x)';

if (!fs.existsSync(file)) {
  console.log('patch-expo-windows: @expo/cli not installed, skipping');
} else {
  const src = fs.readFileSync(file, 'utf8');
  if (src.includes(TO)) console.log('patch-expo-windows: already applied');
  else if (src.includes(FROM)) { fs.writeFileSync(file, src.replace(FROM, TO)); console.log('patch-expo-windows: applied'); }
  else console.warn('patch-expo-windows: pattern not found — Expo version changed, check manually');
}
```

- [ ] **Step 2: Add the postinstall script to `package.json`**

In `"scripts"`, add after `"build:seed"`:

```json
    "postinstall": "node scripts/patch-expo-windows.js"
```

(Add a comma after the `"build:seed"` line.)

- [ ] **Step 3: Install bottom-tabs**

Run: `npm install @react-navigation/bottom-tabs@^6.6.1`
Expected: install succeeds and the postinstall prints `patch-expo-windows: already applied` or `applied`.

- [ ] **Step 4: Verify the dependency**

Run: `node -e "console.log(require('@react-navigation/bottom-tabs/package.json').version)"`
Expected: `6.6.1` (or a later 6.x).

- [ ] **Step 5: Commit**

```bash
git add scripts/patch-expo-windows.js package.json package-lock.json
git commit -m "chore: add bottom-tabs and durable Expo Windows patch"
```

---

## Task 2: Calendar engine

**Files:**
- Create: `src/engine/calendar.js`
- Test: `src/engine/calendar.test.js`

- [ ] **Step 1: Write the failing test**

`src/engine/calendar.test.js`:

```js
const { today, eventStatus, seasonStatus, currentSeason } = require('./calendar');

const ev = { dateFrom: '2026-11-29', dateTo: '2026-11-30' };

test('eventStatus: open before dateFrom, live through dateTo, done after', () => {
  expect(eventStatus(ev, '2026-11-28')).toBe('open');
  expect(eventStatus(ev, '2026-11-29')).toBe('live');
  expect(eventStatus(ev, '2026-11-30')).toBe('live');
  expect(eventStatus(ev, '2026-12-01')).toBe('done');
});

test('eventStatus falls back to dateFrom when dateTo is missing', () => {
  expect(eventStatus({ dateFrom: '2026-05-08' }, '2026-05-08')).toBe('live');
  expect(eventStatus({ dateFrom: '2026-05-08' }, '2026-05-09')).toBe('done');
});

const s2025 = { id: '2025', events: [{ dateFrom: '2025-05-10', dateTo: '2025-05-11' }, { dateFrom: '2025-09-20', dateTo: '2025-09-21' }] };
const s2026 = { id: '2026-27', events: [{ dateFrom: '2026-10-18', dateTo: '2026-10-19' }, { dateFrom: '2026-12-20', dateTo: '2026-12-21' }] };
const s2027 = { id: '2027', events: [{ dateFrom: '2027-05-01', dateTo: '2027-05-02' }] };

test('seasonStatus', () => {
  expect(seasonStatus(s2025, '2026-11-15')).toBe('archived');
  expect(seasonStatus(s2026, '2026-11-15')).toBe('current');
  expect(seasonStatus(s2026, '2026-12-21')).toBe('current');
  expect(seasonStatus(s2026, '2026-12-22')).toBe('archived');
  expect(seasonStatus(s2027, '2026-11-15')).toBe('upcoming');
});

test('currentSeason: current, else next upcoming, else most recent', () => {
  expect(currentSeason([s2025, s2026, s2027], '2026-11-15').id).toBe('2026-27');
  expect(currentSeason([s2025, s2026, s2027], '2027-01-10').id).toBe('2027');
  expect(currentSeason([s2025, s2026], '2027-01-10').id).toBe('2026-27');
});

test('today formats a local date as YYYY-MM-DD', () => {
  expect(today(new Date(2026, 10, 5))).toBe('2026-11-05');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/engine/calendar.test.js`
Expected: FAIL — `Cannot find module './calendar'`.

- [ ] **Step 3: Implement**

`src/engine/calendar.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/engine/calendar.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/calendar.js src/engine/calendar.test.js
git commit -m "feat(engine): date-driven event and season status"
```

---

## Task 3: Two simulated seasons + demo player seed

**Files:**
- Modify: `scripts/gen-dev-seed.js` (full rewrite below)
- Modify: `scripts/build-seed.js:17-20`
- Modify: `src/data/index.js`
- Modify: `src/data/index.test.js`
- Generated: `src/data/seed/seasons.json`, `src/data/seed/demoPlayer.json`, `src/data/seed/riders.json`
- Delete: `src/data/seed/season.json`

- [ ] **Step 1: Write the failing loader test**

Replace `src/data/index.test.js` with:

```js
const { SEASONS, EVENTS_BY_ID, DEMO_PLAYER, RIDERS_BY_ID, ridersByCategory } = require('./index');
const { validateTeam } = require('../engine/team');

test('seed loads riders for all 5 categories', () => {
  const byCat = ridersByCategory();
  ['SENIOR_26', 'JUNIOR_26', 'SENIOR_20', 'JUNIOR_20', 'ELITE_WOMEN'].forEach((c) => {
    expect(byCat[c].length).toBeGreaterThanOrEqual(2);
  });
});

test('seed has the 2025 archived season and the 2026-27 current season', () => {
  expect(SEASONS.map((s) => s.id)).toEqual(['2025', '2026-27']);
  SEASONS.forEach((s) => expect(s.events).toHaveLength(4));
  expect(SEASONS[1].events.map((e) => e.dateFrom)).toEqual(['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20']);
  expect(SEASONS[1].events[0].dateTo).toBe('2026-10-19');
});

test('every event result id resolves to a known rider', () => {
  Object.values(EVENTS_BY_ID).forEach((ev) => {
    Object.values(ev.results).forEach((order) => {
      order.forEach((id) => expect(RIDERS_BY_ID[id]).toBeDefined());
    });
  });
});

test('demo player has valid teams for the 6 past events only', () => {
  const ids = Object.keys(DEMO_PLAYER.picks).sort();
  expect(ids).toEqual(['2025-r1', '2025-r2', '2025-r3', '2025-r4', '2026-27-r1', '2026-27-r2']);
  ids.forEach((id) => expect(validateTeam(DEMO_PLAYER.picks[id], RIDERS_BY_ID).valid).toBe(true));
  expect(DEMO_PLAYER.name).toBe('Démo');
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/data/index.test.js`
Expected: FAIL — `SEASONS` is undefined.

- [ ] **Step 3: Rewrite `scripts/gen-dev-seed.js`**

```js
// Synthesizes a playable dev dataset: 2 seasons (2025 archived, 2026-27 current around 2026-11-15)
// plus a demo player who already played the past events. Replace riders/seasons with
// `npm run build:seed` once real data/dev CSVs are filled.
const fs = require('fs');
const path = require('path');
const { coteFromRank } = require('../src/engine/cote');
const { CATEGORIES, groupByCategory } = require('../src/engine/team');
const { generateBotTeam } = require('../src/engine/bots');
const { makeRng } = require('../src/engine/rng');

const COUNTRIES = ['FRA', 'GBR', 'ESP', 'GER', 'SUI', 'POL', 'CZE', 'BEL'];
const VENUES = [['Vic', 'ESP'], ['Andorre', 'AND'], ['Val di Sole', 'ITA'], ['Leogang', 'AUT'],
  ['Les Gets', 'FRA'], ['Châtel', 'FRA'], ['Lenzerheide', 'SUI'], ['Pal Arinsal', 'AND']];
const SEASONS_PLAN = [
  { id: '2025', name: 'Coupe du Monde 2025', dates: ['2025-05-10', '2025-07-05', '2025-08-23', '2025-09-20'] },
  { id: '2026-27', name: 'Coupe du Monde 2026-27', dates: ['2026-10-18', '2026-11-08', '2026-11-29', '2026-12-20'] },
];
const DEMO_PLAYED_BEFORE = '2026-11-15'; // the demo player has teams for events finished before this date

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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

function shuffledResults(byCat, seed) {
  const rng = makeRng(seed);
  const results = {};
  CATEGORIES.forEach((cat) => {
    const ids = byCat[cat].map((r) => r.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    results[cat] = ids;
  });
  return results;
}

function buildSeasons(riders) {
  const byCat = groupByCategory(riders);
  let venueIdx = 0;
  return SEASONS_PLAN.map((plan, si) => ({
    id: plan.id,
    name: plan.name,
    events: plan.dates.map((dateFrom, i) => {
      const [venue, country] = VENUES[venueIdx++ % VENUES.length];
      return {
        id: `${plan.id}-r${i + 1}`, name: `${plan.name} — Manche ${i + 1}`, venue, country,
        round: i + 1, dateFrom, dateTo: addDays(dateFrom, 1),
        results: shuffledResults(byCat, (si + 1) * 100 + (i + 1) * 17),
      };
    }),
  }));
}

function buildDemoPlayer(seasons, riders) {
  const byCat = groupByCategory(riders);
  const rng = makeRng(2026);
  const strategies = ['EQUILIBRE', 'OUTSIDER', 'ALEATOIRE'];
  const picks = {};
  let k = 0;
  seasons.forEach((s) => s.events.forEach((e) => {
    if (e.dateTo < DEMO_PLAYED_BEFORE) picks[e.id] = generateBotTeam(strategies[k++ % strategies.length], byCat, rng);
  }));
  return { name: 'Démo', picks };
}

const riders = buildRiders();
const seasons = buildSeasons(riders);
const demoPlayer = buildDemoPlayer(seasons, riders);
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'seasons.json'), JSON.stringify(seasons, null, 2));
fs.writeFileSync(path.join(dir, 'demoPlayer.json'), JSON.stringify(demoPlayer, null, 2));
console.log(`Wrote ${riders.length} riders, ${seasons.length} seasons, ${Object.keys(demoPlayer.picks).length} demo picks to src/data/seed/`);
```

- [ ] **Step 4: Update the real CSV pipeline (`scripts/build-seed.js`)**

Replace the last 4 lines (from `const dir = ...` to the `console.log`) with:

```js
const seasons = [{ id: String(competitions.season), name: `Coupe du Monde ${competitions.season}`, events: season }];
const dir = path.join(__dirname, '..', 'src', 'data', 'seed');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'riders.json'), JSON.stringify(riders, null, 2));
fs.writeFileSync(path.join(dir, 'seasons.json'), JSON.stringify(seasons, null, 2));
const demoPath = path.join(dir, 'demoPlayer.json');
if (!fs.existsSync(demoPath)) fs.writeFileSync(demoPath, JSON.stringify({ name: 'Démo', picks: {} }, null, 2));
console.log(`Built ${riders.length} riders and ${season.length} events from CSV.`);
```

- [ ] **Step 5: Generate the seed and delete the old file**

Run: `npm run gen:seed`
Expected: `Wrote 40 riders, 2 seasons, 6 demo picks to src/data/seed/`

Run: `git rm src/data/seed/season.json`

- [ ] **Step 6: Update `src/data/index.js`**

```js
import riders from './seed/riders.json';
import seasons from './seed/seasons.json';
import demoPlayer from './seed/demoPlayer.json';
import { groupByCategory } from '../engine/team';

export const RIDERS = riders;
export const SEASONS = seasons;
export const EVENTS_BY_ID = Object.fromEntries(seasons.flatMap((s) => s.events.map((e) => [e.id, e])));
export const DEMO_PLAYER = demoPlayer;
export const RIDERS_BY_ID = Object.fromEntries(riders.map((r) => [r.id, r]));
export function ridersByCategory() { return groupByCategory(riders); }
```

- [ ] **Step 7: Run to verify it passes**

Run: `npx jest src/data`
Expected: PASS (`index.test.js` 4 tests, `seedBuilder.test.js` unchanged and green).

- [ ] **Step 8: Commit**

```bash
git add scripts/gen-dev-seed.js scripts/build-seed.js src/data
git commit -m "feat(data): two simulated seasons and a demo player seed"
```

---

## Task 4: Score selectors

**Files:**
- Create: `src/state/selectors.js`
- Test: `src/state/selectors.test.js`

- [ ] **Step 1: Write the failing test**

`src/state/selectors.test.js`:

```js
const riders = require('../data/seed/riders.json');
const { groupByCategory } = require('../engine/team');
const { eventOutcome, seasonSummary } = require('./selectors');

const ridersById = Object.fromEntries(riders.map((r) => [r.id, r]));
const ridersByCategory = groupByCategory(riders);
// Results in seed order: each category's rider #1 (uciRank 1, cote 1.0) finishes 1st.
const results = Object.fromEntries(Object.entries(ridersByCategory).map(([c, rs]) => [c, rs.map((r) => r.id)]));
const event = { id: 'e1', round: 1, dateFrom: '2026-11-08', dateTo: '2026-11-09', results };
const later = { ...event, id: 'e2', dateFrom: '2026-12-20', dateTo: '2026-12-21' };
const team = {
  senior26: ridersByCategory.SENIOR_26[0].id, junior26: ridersByCategory.JUNIOR_26[0].id,
  senior20: ridersByCategory.SENIOR_20[0].id, junior20: ridersByCategory.JUNIOR_20[0].id,
  eliteWomen1: ridersByCategory.ELITE_WOMEN[0].id, eliteWomen2: ridersByCategory.ELITE_WOMEN[1].id,
};
const ctx = (over = {}) => ({ picks: { e1: team }, playerName: 'Me', now: '2026-11-15', ridersById, ridersByCategory, ...over });

test('eventOutcome is null until the event is done', () => {
  expect(eventOutcome({ event, ...ctx({ now: '2026-11-09' }) })).toBeNull();
});

test('eventOutcome scores the saved team once done', () => {
  const o = eventOutcome({ event, ...ctx() });
  // 4 winners × 100 + women P1 100 + P2 80, all cote 1.0
  expect(o.player.total).toBe(580);
  expect(o.leaderboard.find((r) => r.isPlayer).name).toBe('Me');
  expect(o.leaderboard).toHaveLength(11);
});

test('eventOutcome scores 0 when no team was saved', () => {
  expect(eventOutcome({ event, ...ctx({ picks: {} }) }).player.total).toBe(0);
});

test('seasonSummary aggregates done events only', () => {
  const s = seasonSummary({ season: { events: [event, later] }, ...ctx() });
  expect(s.played).toBe(1);
  expect(s.score).toBe(580);
  expect(s.rank).toBeGreaterThanOrEqual(1);
  expect(s.standings).toHaveLength(11);
});

test('seasonSummary with nothing done has rank 0 and score 0', () => {
  const s = seasonSummary({ season: { events: [later] }, ...ctx() });
  expect(s).toEqual({ standings: [], rank: 0, score: 0, played: 0 });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/state/selectors.test.js`
Expected: FAIL — `Cannot find module './selectors'`.

- [ ] **Step 3: Implement**

`src/state/selectors.js`:

```js
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
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/state/selectors.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/state/selectors.js src/state/selectors.test.js
git commit -m "feat(state): derive event outcomes and season summary from dates"
```

---

## Task 5: New game state (reducer, hydration gate, useNow, useScoring)

**Files:**
- Modify: `src/state/GameContext.js` (full rewrite)
- Test: `src/state/gameReducer.test.js` (full rewrite)

- [ ] **Step 1: Write the failing test**

Replace `src/state/gameReducer.test.js` with:

```js
const { gameReducer, initialState } = require('./GameContext');

const team = { senior26: 'x' };

test('initial state is the demo player with real time', () => {
  expect(initialState.player).toEqual({ name: 'Démo' });
  expect(Object.keys(initialState.picks)).toHaveLength(6);
  expect(initialState.simulatedDate).toBeNull();
});

test('SAVE_TEAM stores the team while the event is open', () => {
  const s = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: '2026-27-r3', team, now: '2026-11-15' } });
  expect(s.picks['2026-27-r3']).toEqual(team);
});

test('SAVE_TEAM is ignored once the event is locked or unknown', () => {
  const locked = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: '2026-27-r3', team, now: '2026-11-29' } });
  expect(locked).toBe(initialState);
  const unknown = gameReducer(initialState, { type: 'SAVE_TEAM', payload: { eventId: 'nope', team, now: '2026-11-15' } });
  expect(unknown).toBe(initialState);
});

test('SET_NAME and SET_SIMULATED_DATE', () => {
  const named = gameReducer(initialState, { type: 'SET_NAME', payload: { name: 'Zoé' } });
  expect(named.player).toEqual({ name: 'Zoé' });
  const dated = gameReducer(named, { type: 'SET_SIMULATED_DATE', payload: { date: '2026-11-30' } });
  expect(dated.simulatedDate).toBe('2026-11-30');
  expect(gameReducer(dated, { type: 'SET_SIMULATED_DATE', payload: { date: null } }).simulatedDate).toBeNull();
});

test('RESET returns to the demo state', () => {
  const dirty = { player: { name: 'X' }, picks: {}, simulatedDate: '2030-01-01' };
  expect(gameReducer(dirty, { type: 'RESET' })).toBe(initialState);
});

test('HYDRATE merges a saved state but ignores the old linear format', () => {
  const saved = { player: { name: 'Z' }, picks: { a: team }, simulatedDate: '2026-11-15' };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: saved })).toEqual(saved);
  const old = { player: { name: 'Old' }, season: [], currentIndex: 2, picks: {}, outcomes: {} };
  expect(gameReducer(initialState, { type: 'HYDRATE', payload: old })).toBe(initialState);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/state/gameReducer.test.js`
Expected: FAIL — `initialState.player` is `null`.

- [ ] **Step 3: Rewrite `src/state/GameContext.js`**

```js
import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { saveState, loadState } from './persistence';
import { DEMO_PLAYER, EVENTS_BY_ID, RIDERS_BY_ID, ridersByCategory } from '../data/index';
import { eventStatus, today } from '../engine/calendar';

const initialState = {
  player: { name: DEMO_PLAYER.name },
  picks: DEMO_PLAYER.picks,   // { [eventId]: Team }
  simulatedDate: null,        // null = real date, else 'YYYY-MM-DD'
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SAVE_TEAM': {
      const { eventId, team, now } = action.payload;
      const event = EVENTS_BY_ID[eventId];
      if (!event || eventStatus(event, now) !== 'open') return state;
      return { ...state, picks: { ...state.picks, [eventId]: team } };
    }
    case 'SET_NAME':
      return { ...state, player: { name: action.payload.name } };
    case 'SET_SIMULATED_DATE':
      return { ...state, simulatedDate: action.payload.date };
    case 'RESET':
      return initialState;
    case 'HYDRATE': {
      const saved = action.payload;
      // Saves from the old linear loop (currentIndex/outcomes) are incompatible: start from demo.
      if (!saved || 'currentIndex' in saved || !saved.picks) return state;
      return { ...state, ...saved };
    }
    default:
      return state;
  }
}

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    loadState().then((saved) => {
      if (saved) dispatch({ type: 'HYDRATE', payload: saved });
      setHydrated(true);
    });
  }, []);
  // Save only after hydration so the initial demo state never overwrites a real save.
  useEffect(() => { if (hydrated) saveState(state); }, [state, hydrated]);
  if (!hydrated) return null;
  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

export function useNow() {
  const { state } = useGame();
  return state.simulatedDate || today();
}

// Everything the selectors need, in one object.
export function useScoring() {
  const { state } = useGame();
  const now = useNow();
  return { picks: state.picks, playerName: state.player.name, now, ridersById: RIDERS_BY_ID, ridersByCategory: ridersByCategory() };
}

export { gameReducer, initialState };
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/state`
Expected: PASS (`gameReducer` 6, `selectors` 5, `persistence` 1).

- [ ] **Step 5: Commit**

```bash
git add src/state/GameContext.js src/state/gameReducer.test.js
git commit -m "feat(state): date-driven game state with hydration gate"
```

---

## Task 6: Shared UI helpers and components

**Files:**
- Create: `src/ui/confirm.js`, `src/ui/eventLabel.js`, `src/ui/OutcomeView.js`, `src/ui/StandingsList.js`

No dedicated tests: these are covered by the screen and integration tests in Tasks 8–10.

- [ ] **Step 1: Create `src/ui/confirm.js`**

```js
import { Alert, Platform } from 'react-native';

// Alert.alert is a no-op on react-native-web, so use the browser dialog there.
export function confirm(message) {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    Alert.alert('Confirmation', message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
```

- [ ] **Step 2: Create `src/ui/eventLabel.js`**

```js
import { eventStatus } from '../engine/calendar';
import { eventOutcome } from '../state/selectors';

// Status text for an event row, e.g. 'Ouverte · à composer' or 'Terminée · 412 pts'.
export function eventLabel(event, ctx) {
  const status = eventStatus(event, ctx.now);
  const hasTeam = !!ctx.picks[event.id];
  if (status === 'open') return hasTeam ? 'Ouverte · équipe prête' : 'Ouverte · à composer';
  if (status === 'live') return hasTeam ? 'En cours' : 'En cours · non jouée';
  if (!hasTeam) return 'Non jouée';
  return `Terminée · ${eventOutcome({ event, ...ctx }).player.total.toFixed(0)} pts`;
}
```

- [ ] **Step 3: Create `src/ui/StandingsList.js`** (rows moved from `SeasonStandingsScreen`)

```js
import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { colors, space, radius } from './theme';

export default function StandingsList({ standings }) {
  return (
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
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: 2, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  rank: { width: 28, fontWeight: '700', color: colors.muted },
  name: { flex: 1, color: colors.text }, score: { fontWeight: '800', color: colors.primary },
});
```

- [ ] **Step 4: Create `src/ui/OutcomeView.js`** (body moved from `EventResultScreen`)

```js
import React from 'react';
import { View, Text, SectionList, StyleSheet } from 'react-native';
import { colors, space, radius } from './theme';

export default function OutcomeView({ event, outcome }) {
  const played = outcome.player.breakdown.some((b) => b.riderId);
  const sections = [
    { title: 'Ton score', data: played ? outcome.player.breakdown.map((b) => ({ kind: 'breakdown', ...b })) : [] },
    { title: 'Classement de la manche', data: outcome.leaderboard.map((s, i) => ({ kind: 'standing', rank: i + 1, ...s })) },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.total}>{outcome.player.total.toFixed(0)} pts</Text>
      <Text style={styles.sub}>{event.name} · Manche {event.round}</Text>
      {!played && <Text style={styles.sub}>Non jouée — aucune équipe enregistrée</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  total: { fontSize: 40, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  sub: { textAlign: 'center', color: colors.muted, marginBottom: space.md },
  section: { fontWeight: '700', color: colors.accent, marginTop: space.md, marginBottom: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  playerRow: { borderColor: colors.primary, borderWidth: 2 },
  cell1: { flex: 1, color: colors.text }, cell2: { width: 44, color: colors.muted },
  cell3: { width: 44, color: colors.muted }, cell4: { width: 56, textAlign: 'right', fontWeight: '700', color: colors.text },
});
```

- [ ] **Step 5: Commit**

```bash
git add src/ui
git commit -m "feat(ui): confirm helper, event label, shared outcome and standings views"
```

---

## Task 7: Play tab screens (SeasonHome, Briefing, Compose, EventResult)

**Files:**
- Create: `src/screens/SeasonHomeScreen.js`
- Modify: `src/screens/BriefingScreen.js`, `src/screens/ComposeScreen.js`, `src/screens/EventResultScreen.js`

Covered by the integration test in Task 10.

- [ ] **Step 1: Create `src/screens/SeasonHomeScreen.js`**

```js
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useGame, useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { currentSeason, eventStatus } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import { eventLabel } from '../ui/eventLabel';
import { colors, space, radius } from '../ui/theme';

export default function SeasonHomeScreen({ navigation }) {
  const { state } = useGame();
  const ctx = useScoring();
  const season = currentSeason(SEASONS, ctx.now);
  const summary = seasonSummary({ season, ...ctx });

  function open(event) {
    if (eventStatus(event, ctx.now) === 'open') navigation.navigate('Briefing', { eventId: event.id });
    else navigation.navigate('EventResult', { eventId: event.id });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>{season.name}</Text>
      <Text style={styles.sub}>
        {state.player.name} · {summary.score.toFixed(0)} pts{summary.rank ? ` · #${summary.rank}` : ''}
      </Text>
      <FlatList
        data={season.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={styles.row} accessibilityRole="button">
            <View style={{ flex: 1 }}>
              <Text style={styles.round}>Manche {item.round} · {item.venue}</Text>
              <Text style={styles.date}>{item.dateFrom} · {item.country}</Text>
            </View>
            <Text style={styles.status}>{eventLabel(item, ctx)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md, gap: space.sm },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border, gap: space.sm },
  round: { fontWeight: '700', color: colors.text },
  date: { color: colors.muted, marginTop: 2 },
  status: { color: colors.primary, fontWeight: '600' },
});
```

- [ ] **Step 2: Update `src/screens/BriefingScreen.js`**

Change the import of `ridersByCategory` to also take `EVENTS_BY_ID`:

```js
import { ridersByCategory, EVENTS_BY_ID } from '../data/index';
```

Replace the component signature and the event lookup:

```js
export default function BriefingScreen({ navigation, route }) {
  const event = EVENTS_BY_ID[route.params.eventId];
```

(Delete the `const { state } = useGame();` line and the `useGame` import — the screen no longer reads state.)

Add the lock date under the existing `sub` line in the header:

```js
        <Text style={styles.sub}>Équipe verrouillée le {event.dateFrom}</Text>
```

Change the CTA navigation:

```js
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Compose', { eventId: event.id })} style={styles.cta}>
```

- [ ] **Step 3: Update `src/screens/ComposeScreen.js`**

Replace the imports block (lines 1-7) with:

```js
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, FlatList, StyleSheet } from 'react-native';
import { useGame, useNow } from '../state/GameContext';
import { ridersByCategory, RIDERS_BY_ID, EVENTS_BY_ID } from '../data/index';
import { SLOTS, validateTeam } from '../engine/team';
import { eventStatus } from '../engine/calendar';
import { colors, space, radius } from '../ui/theme';
```

Replace from `export default function ComposeScreen` through the end of `function lock() {...}` with:

```js
export default function ComposeScreen({ navigation, route }) {
  const { state, dispatch } = useGame();
  const now = useNow();
  const event = EVENTS_BY_ID[route.params.eventId];
  const byCat = ridersByCategory();
  const [team, setTeam] = useState(state.picks[event.id] || EMPTY);
  const [activeSlot, setActiveSlot] = useState(null);

  const result = validateTeam(team, RIDERS_BY_ID);

  function pick(riderId) {
    setTeam((t) => ({ ...t, [activeSlot.id]: riderId }));
    setActiveSlot(null);
  }

  function save() {
    dispatch({ type: 'SAVE_TEAM', payload: { eventId: event.id, team, now } });
    navigation.popToTop();
  }

  if (eventStatus(event, now) !== 'open') {
    return (
      <View style={styles.closed}>
        <Text style={styles.closedText}>Composition fermée</Text>
      </View>
    );
  }
```

In the footer, change the CTA to:

```js
        <Pressable disabled={!result.valid} onPress={save} style={[styles.cta, !result.valid && styles.ctaDisabled]} accessibilityRole="button">
          <Text style={styles.ctaText}>Enregistrer l'équipe</Text>
        </Pressable>
```

Add to `StyleSheet.create({ ... })`:

```js
  closed: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  closedText: { fontSize: 18, color: colors.muted },
```

- [ ] **Step 4: Rewrite `src/screens/EventResultScreen.js`**

```js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useGame, useScoring } from '../state/GameContext';
import { EVENTS_BY_ID, RIDERS_BY_ID } from '../data/index';
import { SLOTS } from '../engine/team';
import { eventOutcome } from '../state/selectors';
import OutcomeView from '../ui/OutcomeView';
import { colors, space, radius } from '../ui/theme';

export default function EventResultScreen({ route }) {
  const { state } = useGame();
  const ctx = useScoring();
  const event = EVENTS_BY_ID[route.params.eventId];
  const outcome = eventOutcome({ event, ...ctx });

  if (outcome) {
    return <View style={styles.container}><OutcomeView event={event} outcome={outcome} /></View>;
  }

  // Live event: team is locked, results not revealed yet.
  const team = state.picks[event.id];
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.name}</Text>
      <Text style={styles.sub}>Résultats après le {event.dateTo || event.dateFrom}</Text>
      {team ? SLOTS.map((slot) => (
        <View key={slot.id} style={styles.row}>
          <Text style={styles.label}>{slot.label}</Text>
          <Text style={styles.rider}>{RIDERS_BY_ID[team[slot.id]]?.name ?? '—'}</Text>
        </View>
      )) : <Text style={styles.sub}>Aucune équipe enregistrée</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, marginVertical: space.sm },
  row: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.sm, marginVertical: 2, borderWidth: 1, borderColor: colors.border },
  label: { fontSize: 12, color: colors.muted },
  rider: { color: colors.text, fontWeight: '600' },
});
```

- [ ] **Step 5: Commit**

```bash
git add src/screens/SeasonHomeScreen.js src/screens/BriefingScreen.js src/screens/ComposeScreen.js src/screens/EventResultScreen.js
git commit -m "feat(ui): date-driven play tab screens"
```

---

## Task 8: Standings and History screens

**Files:**
- Create: `src/screens/StandingsScreen.js`, `src/screens/SeasonListScreen.js`, `src/screens/SeasonDetailScreen.js`

Covered by the integration test in Task 10.

- [ ] **Step 1: Create `src/screens/StandingsScreen.js`**

```js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { currentSeason } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import StandingsList from '../ui/StandingsList';
import { colors, space } from '../ui/theme';

export default function StandingsScreen() {
  const ctx = useScoring();
  const season = currentSeason(SEASONS, ctx.now);
  const summary = seasonSummary({ season, ...ctx });
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{season.name}</Text>
      <Text style={styles.sub}>Après {summary.played} / {season.events.length} manches</Text>
      {summary.played
        ? <StandingsList standings={summary.standings} />
        : <Text style={styles.sub}>Aucune manche terminée pour l'instant</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  sub: { color: colors.muted, marginBottom: space.md },
});
```

- [ ] **Step 2: Create `src/screens/SeasonListScreen.js`**

```js
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { seasonStatus } from '../engine/calendar';
import { seasonSummary } from '../state/selectors';
import { colors, space, radius } from '../ui/theme';

export default function SeasonListScreen({ navigation }) {
  const ctx = useScoring();
  // SEASONS is chronological; show the newest first and hide seasons not started yet.
  const seasons = SEASONS.filter((s) => seasonStatus(s, ctx.now) !== 'upcoming').slice().reverse();
  return (
    <View style={styles.container}>
      <FlatList
        data={seasons}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => {
          const summary = seasonSummary({ season: item, ...ctx });
          const status = seasonStatus(item, ctx.now) === 'current' ? 'En cours' : 'Archivée';
          return (
            <Pressable onPress={() => navigation.navigate('SeasonDetail', { seasonId: item.id })} style={styles.row} accessibilityRole="button">
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {status} · {summary.rank ? `#${summary.rank}` : '—'} · {summary.score.toFixed(0)} pts
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  row: { backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border },
  name: { fontWeight: '700', color: colors.text },
  meta: { color: colors.muted, marginTop: 2 },
});
```

- [ ] **Step 3: Create `src/screens/SeasonDetailScreen.js`**

```js
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useScoring } from '../state/GameContext';
import { SEASONS } from '../data/index';
import { eventStatus } from '../engine/calendar';
import { eventLabel } from '../ui/eventLabel';
import { colors, space, radius } from '../ui/theme';

export default function SeasonDetailScreen({ navigation, route }) {
  const ctx = useScoring();
  const season = SEASONS.find((s) => s.id === route.params.seasonId);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{season.name}</Text>
      <FlatList
        data={season.events}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => {
          const isOpen = eventStatus(item, ctx.now) === 'open';
          return (
            <Pressable
              disabled={isOpen}
              onPress={() => navigation.navigate('EventResult', { eventId: item.id })}
              style={styles.row}
              accessibilityRole="button"
            >
              <Text style={styles.round}>Manche {item.round} · {item.venue}</Text>
              <Text style={styles.status}>{eventLabel(item, ctx)}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: space.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: space.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.sm, padding: space.md, marginVertical: space.xs, borderWidth: 1, borderColor: colors.border },
  round: { fontWeight: '700', color: colors.text },
  status: { color: colors.primary, fontWeight: '600' },
});
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/StandingsScreen.js src/screens/SeasonListScreen.js src/screens/SeasonDetailScreen.js
git commit -m "feat(ui): standings and history screens"
```

---

## Task 9: Rules & profile screen

**Files:**
- Create: `src/screens/RulesScreen.js`
- Test: `src/screens/RulesScreen.test.js`

- [ ] **Step 1: Write the failing test**

`src/screens/RulesScreen.test.js`:

```js
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameProvider } from '../state/GameContext';
import RulesScreen from './RulesScreen';

jest.mock('../ui/confirm', () => ({ confirm: jest.fn(() => Promise.resolve(true)) }));

beforeEach(() => AsyncStorage.clear());

function renderRules() {
  return render(<GameProvider><RulesScreen /></GameProvider>);
}

test('applies and clears a simulated date', async () => {
  renderRules();
  fireEvent.changeText(await screen.findByPlaceholderText('AAAA-MM-JJ'), '2026-11-30');
  fireEvent.press(screen.getByText('Appliquer'));
  expect(await screen.findByText('Date du jeu : 2026-11-30 (simulée)')).toBeTruthy();
  fireEvent.press(screen.getByText("Revenir à aujourd'hui"));
  expect(await screen.findByText(/^Date du jeu : \d{4}-\d{2}-\d{2}$/)).toBeTruthy();
});

test('renames the player and resets after confirmation', async () => {
  renderRules();
  fireEvent.changeText(await screen.findByDisplayValue('Démo'), 'Zoé');
  fireEvent.press(screen.getByText('Enregistrer le pseudo'));
  expect(await screen.findByText('Pseudo actuel : Zoé')).toBeTruthy();
  fireEvent.press(screen.getByText('Réinitialiser la partie'));
  expect(await screen.findByText('Pseudo actuel : Démo')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest src/screens/RulesScreen.test.js`
Expected: FAIL — `Cannot find module './RulesScreen'`.

- [ ] **Step 3: Implement `src/screens/RulesScreen.js`**

```js
import React, { useState } from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { useGame, useNow, initialState } from '../state/GameContext';
import { confirm } from '../ui/confirm';
import { colors, space, radius } from '../ui/theme';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function RulesScreen() {
  const { state, dispatch } = useGame();
  const now = useNow();
  const [name, setName] = useState(state.player.name);
  const [date, setDate] = useState(state.simulatedDate || '');

  function saveName() {
    dispatch({ type: 'SET_NAME', payload: { name: name.trim() || 'Joueur' } });
  }

  async function reset() {
    if (!(await confirm('Réinitialiser la partie ? Tes équipes seront remplacées par les données de démo.'))) return;
    dispatch({ type: 'RESET' });
    setName(initialState.player.name);
    setDate('');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.h2}>Règles</Text>
      <Text style={styles.p}>• Compose une équipe de 6 pilotes : Senior 26", Junior 26", Senior 20", Junior 20" et 2 Elite Femme 20" différentes.</Text>
      <Text style={styles.p}>• Points d'un pilote = points de classement (100 pour le 1er, 80, 65…) × sa cote.</Text>
      <Text style={styles.p}>• Une cote élevée signale un outsider : s'il finit bien, il rapporte gros.</Text>
      <Text style={styles.p}>• L'équipe est modifiable jusqu'au jour de la manche, puis verrouillée. Les résultats sont révélés à la fin de la manche.</Text>

      <Text style={styles.h2}>Profil</Text>
      <Text style={styles.p}>Pseudo actuel : {state.player.name}</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} />
      <Pressable onPress={saveName} style={styles.btn} accessibilityRole="button">
        <Text style={styles.btnText}>Enregistrer le pseudo</Text>
      </Pressable>

      <Text style={styles.h2}>Date simulée</Text>
      <Text style={styles.p}>Date du jeu : {now}{state.simulatedDate ? ' (simulée)' : ''}</Text>
      <TextInput value={date} onChangeText={setDate} placeholder="AAAA-MM-JJ" style={styles.input} />
      <View style={styles.rowBtns}>
        <Pressable disabled={!DATE_RE.test(date)} onPress={() => dispatch({ type: 'SET_SIMULATED_DATE', payload: { date } })}
          style={[styles.btn, styles.flex, !DATE_RE.test(date) && styles.disabled]} accessibilityRole="button">
          <Text style={styles.btnText}>Appliquer</Text>
        </Pressable>
        <Pressable onPress={() => { dispatch({ type: 'SET_SIMULATED_DATE', payload: { date: null } }); setDate(''); }}
          style={[styles.btn, styles.flex, styles.secondary]} accessibilityRole="button">
          <Text style={styles.secondaryText}>Revenir à aujourd'hui</Text>
        </Pressable>
      </View>

      <Pressable onPress={reset} style={[styles.btn, styles.danger]} accessibilityRole="button">
        <Text style={styles.btnText}>Réinitialiser la partie</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.md, gap: space.sm },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: space.md },
  p: { color: colors.text, lineHeight: 20 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: space.md, fontSize: 16 },
  rowBtns: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  btn: { backgroundColor: colors.primary, padding: space.md, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  secondaryText: { color: colors.text, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  danger: { backgroundColor: '#DC2626', marginTop: space.lg },
});
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx jest src/screens/RulesScreen.test.js`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add src/screens/RulesScreen.js src/screens/RulesScreen.test.js
git commit -m "feat(ui): rules and profile screen with simulated date"
```

---

## Task 10: Tab navigator, remove old screens, restore the full suite

**Files:**
- Modify: `App.js` (full rewrite), `App.test.js`, `integration.test.js`
- Delete: `src/screens/HomeScreen.js`, `src/screens/SeasonStandingsScreen.js`

- [ ] **Step 1: Write the failing integration test**

Replace `integration.test.js` with:

```js
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';
import { STORAGE_KEY } from './src/state/persistence';
import { initialState } from './src/state/GameContext';

// Freeze "now" at 2026-11-15: 2025 archived, 2026-27 rounds 1-2 done, 3-4 open.
beforeEach(async () => {
  await AsyncStorage.clear();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initialState, simulatedDate: '2026-11-15' }));
});

test('season home shows date-driven statuses', async () => {
  render(<App />);
  expect(await screen.findByText('Coupe du Monde 2026-27')).toBeTruthy();
  expect(screen.getAllByText(/^Terminée · \d+ pts$/)).toHaveLength(2);
  expect(screen.getAllByText('Ouverte · à composer')).toHaveLength(2);
});

test('open event: Briefing -> Compose shows the 6 typed slots', async () => {
  render(<App />);
  fireEvent.press(await screen.findByText(/^Manche 3 · /));
  fireEvent.press(await screen.findByText('Composer mon équipe'));
  expect(await screen.findByText('Senior 26"')).toBeTruthy();
  expect(screen.getByText('Junior 26"')).toBeTruthy();
  expect(screen.getByText('Senior 20"')).toBeTruthy();
  expect(screen.getByText('Junior 20"')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (1)')).toBeTruthy();
  expect(screen.getByText('Elite Femme 20" (2)')).toBeTruthy();
  expect(screen.getByText("Enregistrer l'équipe")).toBeTruthy();
});

test('4 tabs; history lists the archived 2025 season', async () => {
  render(<App />);
  expect(await screen.findByLabelText('Onglet Jouer')).toBeTruthy();
  ['Onglet Classement', 'Onglet Historique', 'Onglet Règles'].forEach((label) => {
    expect(screen.getByLabelText(label)).toBeTruthy();
  });
  fireEvent.press(screen.getByLabelText('Onglet Historique'));
  expect(await screen.findByText('Coupe du Monde 2025')).toBeTruthy();
  expect(screen.getByText(/^Archivée · /)).toBeTruthy();
});
```

Replace `App.test.js` with:

```js
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

import App from './App';

test('app renders the tab bar', async () => {
  const { findByLabelText } = render(<App />);
  expect(await findByLabelText('Onglet Jouer')).toBeTruthy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest App.test.js integration.test.js`
Expected: FAIL — `App.js` still imports the old `HomeScreen`, which uses removed `SEASON` / `START_SEASON`.

- [ ] **Step 3: Rewrite `App.js`**

```js
import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from './src/state/GameContext';
import SeasonHomeScreen from './src/screens/SeasonHomeScreen';
import BriefingScreen from './src/screens/BriefingScreen';
import ComposeScreen from './src/screens/ComposeScreen';
import EventResultScreen from './src/screens/EventResultScreen';
import StandingsScreen from './src/screens/StandingsScreen';
import SeasonListScreen from './src/screens/SeasonListScreen';
import SeasonDetailScreen from './src/screens/SeasonDetailScreen';
import RulesScreen from './src/screens/RulesScreen';
import { colors } from './src/ui/theme';

const Tab = createBottomTabNavigator();
const PlayStack = createNativeStackNavigator();
const StandingsStack = createNativeStackNavigator();
const HistoryStack = createNativeStackNavigator();
const RulesStack = createNativeStackNavigator();

const stackOptions = { headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text, contentStyle: { backgroundColor: colors.bg } };

function PlayNav() {
  return (
    <PlayStack.Navigator screenOptions={stackOptions}>
      <PlayStack.Screen name="SeasonHome" component={SeasonHomeScreen} options={{ title: 'Super Fantasy Bike Trial' }} />
      <PlayStack.Screen name="Briefing" component={BriefingScreen} options={{ title: 'Briefing' }} />
      <PlayStack.Screen name="Compose" component={ComposeScreen} options={{ title: 'Mon équipe' }} />
      <PlayStack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats' }} />
    </PlayStack.Navigator>
  );
}

function StandingsNav() {
  return (
    <StandingsStack.Navigator screenOptions={stackOptions}>
      <StandingsStack.Screen name="Standings" component={StandingsScreen} options={{ title: 'Classement saison' }} />
    </StandingsStack.Navigator>
  );
}

function HistoryNav() {
  return (
    <HistoryStack.Navigator screenOptions={stackOptions}>
      <HistoryStack.Screen name="SeasonList" component={SeasonListScreen} options={{ title: 'Historique' }} />
      <HistoryStack.Screen name="SeasonDetail" component={SeasonDetailScreen} options={{ title: 'Saison' }} />
      <HistoryStack.Screen name="EventResult" component={EventResultScreen} options={{ title: 'Résultats' }} />
    </HistoryStack.Navigator>
  );
}

function RulesNav() {
  return (
    <RulesStack.Navigator screenOptions={stackOptions}>
      <RulesStack.Screen name="Rules" component={RulesScreen} options={{ title: 'Règles & profil' }} />
    </RulesStack.Navigator>
  );
}

const icon = (glyph) => () => <Text style={{ fontSize: 18 }}>{glyph}</Text>;
const tab = (title, glyph) => ({ title, tabBarIcon: icon(glyph), tabBarAccessibilityLabel: `Onglet ${title}` });

export default function App() {
  return (
    <SafeAreaProvider>
      <GameProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Tab.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
            <Tab.Screen name="PlayTab" component={PlayNav} options={tab('Jouer', '🎮')} />
            <Tab.Screen name="StandingsTab" component={StandingsNav} options={tab('Classement', '🏆')} />
            <Tab.Screen name="HistoryTab" component={HistoryNav} options={tab('Historique', '📜')} />
            <Tab.Screen name="RulesTab" component={RulesNav} options={tab('Règles', '📖')} />
          </Tab.Navigator>
        </NavigationContainer>
      </GameProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 4: Delete the replaced screens**

Run: `git rm src/screens/HomeScreen.js src/screens/SeasonStandingsScreen.js`

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS (engine, data, state, RulesScreen, App smoke, integration).

- [ ] **Step 6: Commit**

```bash
git add App.js App.test.js integration.test.js
git commit -m "feat(ui): bottom-tab menu over date-driven seasons"
```

---

## Task 11: Manual check on web

- [ ] **Step 1: Start the web app**

Run: `npm run web` (open http://localhost:8081).

- [ ] **Step 2: Walk through**

1. **Jouer**: "Coupe du Monde 2026-27", rounds 1-2 "Terminée · X pts", rounds 3-4 "Ouverte · à composer".
2. Round 3 → Briefing → Compose → fill 6 slots → "Enregistrer l'équipe" → back on SeasonHome, round 3 shows "Ouverte · équipe prête".
3. **Règles**: simulated date `2026-11-29` → **Jouer**: round 3 "En cours"; tap it shows the locked team.
4. Simulated date `2026-12-01` → round 3 "Terminée · X pts"; tap shows the breakdown.
5. Simulated date `2026-12-22` → **Historique**: both seasons "Archivée".
6. **Classement**: standings reflect the done rounds.
7. Reload (F5): state and simulated date persist. "Réinitialiser la partie" asks for confirmation and restores the demo.

- [ ] **Step 3: Fix anything found, re-run `npm test`, commit.**
