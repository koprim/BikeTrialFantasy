# Expo SDK 50 → 58 and React Navigation 6 → 7 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Production-code edits also follow the project skill `.claude/skills/solid-clean-code`.

**Goal:** Move the app from Expo SDK 50 / React 18.2 / React Native 0.73 / React Navigation 6 to Expo SDK 58 / React 19.3 / React Native 0.88 / React Navigation 7, and close the remaining dependency vulnerabilities (45 `npm audit` findings, ≤ 98 open Dependabot alerts on 2026-11-20), without changing behaviour.

**Architecture:** One Expo SDK at a time (Expo's recommendation), each hop ending green and committed, so any regression is bisectable to one hop. React Navigation 7 is its own task, done on SDK 52 (its first SDK with `react-native-screens` ≥ 4, which v7 requires). A characterization test net for navigation is added *before* any upgrade and must stay green throughout. No feature work in this branch.

**Tech Stack:** Expo SDK 50→58, React 18.2→19.3, React Native 0.73→0.88, react-native-web 0.19→0.21, React Navigation 7, Jest 29→30 (jest-expo 58), @testing-library/react-native 12→13, Supabase local stack (integration tests).

---

## Context the engineer needs

- Repo: `F:\Application\SuperFantasyTrial\BikeTrialFantasy`, branch `chore/expo-sdk-58` (from `main` at 14a2bcc).
- **Windows quirks:** run `npm`, `npx`, `jest` from **PowerShell** (the bash `rtk` wrapper breaks jest). In bash, `docker` is aliased to Podman; Supabase needs **Docker Desktop** (start it, then `npx supabase start`).
- The app is **web-first**: the demo runs with `npx expo start --web --port 8081`. Native builds are out of scope, but `npx expo-doctor` must end clean.
- Before each hop, stop running `supabase functions serve` / Expo processes: they lock `node_modules\@supabase\cli-windows-x64\bin\supabase.exe` and `npm` fails with `EPERM`.
- `scripts/patch-expo-windows.js` (postinstall) patches an SDK 50 Metro bug on Windows (`mkdir .expo/metro/externals/node:sea`). From SDK 52 it will print `pattern not found`; Task 11 decides whether to delete it.
- `package.json` currently pins `react-native` to `0.73.11` with `"expo": { "install": { "exclude": ["react-native"] } }` (deliberate security pin). **Task 3 removes that exclusion**: from SDK 52 the SDK-expected React Native version is already patched.
- Navigation tree (`App.js`): bottom tabs `PlayTab | CollectionTab | StandingsTab | HistoryTab | RulesTab`, each a native stack. Navigation calls in screens: `navigate(name, params)` within the same stack, `popToTop()` (Compose), `goBack()` (PackReveal). No `linking`, no nested cross-navigator `navigate`, no `reset`/`dispatch`.
- Versions Expo expects per SDK (from each SDK's `bundledNativeModules.json`):

| SDK | react | react-native | react-native-web | screens | safe-area | async-storage | jest-expo | eslint-config-expo |
| --- | ----- | ------------ | ---------------- | ------- | --------- | ------------- | --------- | ------------------ |
| 52 | 18.3.1 | 0.76.9 | ~0.19.13 | ~4.4.0 | 4.12.0 | 1.23.1 | ~52.0.6 | 8.0.1 |
| 53 | 19.0.0 | 0.79.6 | ~0.20.0 | ~4.11.1 | 5.4.0 | 2.1.2 | ~53.0.14 | 9.2.0 |
| 54 | 19.1.0 | 0.81.5 | ~0.21.0 | ~4.16.0 | ~5.6.0 | 2.2.0 | ~54.0.18 | 10.0.0 |
| 55 | (expo install --fix) | | | | | | | 55.0.1 |
| 56 | 19.2.3 | 0.85.3 | ~0.21.0 | ~4.26.0 | ~5.7.0 | 2.2.0 | ~56.0.6 | 56.0.4 |
| 57 | (expo install --fix) | | | | | | | 57.0.2 |
| 58 | 19.3.0 | 0.88.1 | ~0.21.4 | ~4.30.1 | ~5.11.1 | 2.2.0 | ~58.0.15 (needs Jest 30) | 58.0.4 |

`npx expo install --fix` sets the runtime columns; `eslint-config-expo` and `react-test-renderer` are not managed by Expo and are set explicitly in each hop.

## Stop rule

If a hop needs code changes beyond those listed in its task, or a test fails for a reason not covered here: **stop, do not weaken or skip the test**, write the failure (command + output) in the task report and ask. Never use `--force`/`--legacy-peer-deps` to silence a peer conflict without reporting it.

## Manual web smoke test (used by every hop)

With Supabase running (`npx supabase start`), in two PowerShell windows: `npm run functions:serve` and `npx expo start --web --port 8081 --clear`. In the browser at http://localhost:8081, with the dev tools console open:

1. The 5 tabs show with their icons; switching tabs works.
2. Jouer → an open round → "Composer mon équipe" → pick a pilot → "Enregistrer l'équipe" → back on the season home.
3. Collection → open the daily pack → 5 cards revealed → "Voir ma collection" returns to the collection.
4. Historique → "Coupe du Monde 2025" → a round → results with "Effets déclenchés".
5. Règles → "Sauvegarder mon compte" → enter an e-mail → the magic link arrives in http://127.0.0.1:54324.
6. Browser back button returns to the previous screen inside a stack.
7. No red error in the console (yellow deprecation warnings: note them in the report).

---

### Task 1: Branch baseline and one-command verification

**Files:**
- Modify: `package.json` (scripts)

- [ ] **Step 1: Add the `verify:all` script**

In `package.json` → `"scripts"`, after `"test:functions"`, add:

```json
"verify:all": "npm run lint && npm run format:check && jest --silent && npm run test:int -- --silent && npm run test:functions -- --silent && expo export --platform web --output-dir dist",
```

(`dist/` is already in `.gitignore` and in the ESLint `ignorePatterns`; Prettier 3 also honours `.gitignore`.)

- [ ] **Step 2: Run it on SDK 50 to record the baseline**

Supabase running (`npx supabase start`), `npm run functions:serve` running in another window (needed by `test:functions`). Run:

```powershell
npm run verify:all
npm audit --json | ConvertFrom-Json | % { $_.metadata.vulnerabilities }
```

Expected: lint/format clean, `Tests: 406 passed`, `Tests: 40 passed`, `Tests: 3 passed`, `App exported to: dist`; audit total 45 (critical 1, high 15).

- [ ] **Step 3: Commit**

```powershell
git add package.json
git commit -m "chore: add verify:all (lint, format, unit, integration, functions, web export)"
```

---

### Task 2: Navigation safety net (characterization tests, must pass on SDK 50)

These tests pin today's navigation behaviour through the real `App`, so the React Navigation 7 and React Native upgrades cannot silently break a path. They are expected to **pass** immediately (characterization), not fail.

**Files:**
- Create: `navigation.integration.test.js` (repo root, next to `integration.test.js`)

- [ ] **Step 1: Write the tests**

```js
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import App from './App';
import { inMemoryDemoApi } from './src/testing/inMemoryDemoApi';
import { initialState } from './src/state/gameReducer';

// babel-jest hoists jest.mock above the imports.
jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default || mock;
});

// Freeze "now" at 2026-11-15: 2025 archived, 2026 rounds 1-2 done, 3-4 open.
const demoState = { ...initialState, simulatedDate: '2026-11-15' };
const renderApp = (api = inMemoryDemoApi(demoState)) => render(<App api={api} />);

test('history: season list -> season detail -> finished round results', async () => {
  renderApp();
  fireEvent.press(await screen.findByLabelText('Onglet Historique'));
  fireEvent.press(await screen.findByText('Coupe du Monde 2025'));
  // The Jouer tab stays mounted and also lists 2026 rounds: the History stack is rendered last.
  const rounds = await screen.findAllByText(/^Manche 1 · /);
  fireEvent.press(rounds[rounds.length - 1]);
  expect((await screen.findAllByText('Effets déclenchés')).length).toBeGreaterThan(0);
});

test('rules: "Sauvegarder mon compte" opens the account screen in the same stack', async () => {
  const api = {
    ...inMemoryDemoApi(demoState),
    features: { simulatedDate: true, reset: true, account: true },
    account: async () => ({ isAnonymous: true, email: null, pendingEmail: null }),
  };
  renderApp(api);
  fireEvent.press(await screen.findByLabelText('Onglet Règles'));
  fireEvent.press(await screen.findByText('Sauvegarder mon compte'));
  expect(await screen.findByLabelText('Adresse e-mail')).toBeTruthy();
});
```

- [ ] **Step 2: Run them**

Run: `npx jest navigation.integration`
Expected: `Tests: 2 passed`. If one fails on SDK 50, the test is wrong (not the app): fix the selector against the real screen text, never the app code.

- [ ] **Step 3: Commit**

```powershell
git add navigation.integration.test.js
git commit -m "test(nav): characterize history and rules->account navigation before the upgrade"
```

---

### Task 3: Expo SDK 50 → 52 (React 18.3, React Native 0.76)

**Files:**
- Modify: `package.json`, `package-lock.json`, possibly `app.json` (only what `expo-doctor` requires)

- [ ] **Step 1: Drop the temporary React Native pin**

In `package.json` delete the whole top-level block:

```json
"expo": {
  "install": {
    "exclude": ["react-native"]
  }
}
```

- [ ] **Step 2: Upgrade Expo and align SDK packages**

Stop Expo / functions serve first (EPERM otherwise).

```powershell
npx expo install expo@^52.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@8.0.1
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
npm i -D "@types/react@~18.3.12"
```

Expected `package.json`: `expo ~52.0.x`, `react 18.3.1`, `react-dom 18.3.1`, `react-native 0.76.9`, `react-native-screens ~4.4.0`, `react-native-safe-area-context 4.12.0`, `jest-expo ~52.0.6`, `react-test-renderer 18.3.1`.

- [ ] **Step 3: Doctor**

Run: `npx expo-doctor`
Expected: all checks pass. If it reports `app.json` schema warnings (e.g. top-level `splash` deprecated in favour of the `expo-splash-screen` plugin), apply exactly the change it prints; nothing else.

- [ ] **Step 4: Windows Metro check**

Run: `npx expo export --platform web --output-dir dist`
Expected: `App exported to: dist`. Note in the report whether `npm install` printed `patch-expo-windows: pattern not found` and whether the export still works (input for Task 11).

- [ ] **Step 5: Full verification + smoke test**

Run: `npm run verify:all`, then the **Manual web smoke test** above.
Expected: everything green; same test counts as the baseline + 2 (navigation tests).

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json app.json
git commit -m "chore(deps): Expo SDK 52 (React 18.3, React Native 0.76)"
```

---

### Task 4: React Navigation 6 → 7 (on SDK 52)

**Files:**
- Modify: `package.json`, `package-lock.json`; `App.js` only if a test proves it necessary (see Step 3)

- [ ] **Step 1: Install v7**

```powershell
npm i "@react-navigation/native@^7.5.2" "@react-navigation/native-stack@^7.21.1" "@react-navigation/bottom-tabs@^7.22.0"
```

Expected: no peer-dependency error (v7 needs `react-native-screens` ≥ 4 and `react-native-safe-area-context` ≥ 4, both present since Task 3).

- [ ] **Step 2: Run the suites**

Run: `npx jest --silent`
Expected: all green, no code change. v7 breaking changes checked against this app on 2026-11-20 (guide: https://reactnavigation.org/docs/upgrading-from-6.x):

| v7 change | Used here? |
| --- | --- |
| `navigate` no longer goes back to an existing screen (use `popTo`) | No: every `navigate` targets a screen not yet in the stack; covered by tests |
| Navigating by name into a screen of another (nested) navigator removed | No: all `navigate` calls stay in the current stack |
| `navigate` no longer merges params by default | No: screens read params once on mount |
| `NavigationContainer` `independent` prop → `NavigationIndependentTree` | No |
| `headerBackTitleVisible`, `tabBarVisible`, `unmountOnBlur` removed/renamed | No |
| Bottom-tabs `tabBarAccessibilityLabel` | Yes (`App.js` `tab()` helper), covered by every `findByLabelText('Onglet …')` test |

- [ ] **Step 3: Only if a test fails**

If `findByLabelText('Onglet …')` fails, v7 changed the tab accessibility option name: read `node_modules/@react-navigation/bottom-tabs/src/types.tsx`, find the option that sets the tab button's accessibility label, rename it in `App.js` (`const tab = …`), re-run. Any other failure → **Stop rule**.

- [ ] **Step 4: Full verification + smoke test**

Run: `npm run verify:all`, then the **Manual web smoke test** (pay attention to item 6, browser back).

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json App.js
git commit -m "chore(deps): React Navigation 7"
```

---

### Task 5: Expo SDK 52 → 53 (React 19.0, React Native 0.79)

React 19 removes `defaultProps` on function components, `propTypes` checks, string refs and `ReactDOM.render`; none is used in `src/` (checked 2026-11-20). `react-test-renderer` is deprecated in React 19 but still published and still what @testing-library/react-native 13 uses.

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^53.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@9.2.0
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
npm i -D "@testing-library/react-native@^13.3.0" "@types/react@~19.0.10"
```

Expected: `react 19.0.0`, `react-native 0.79.6`, `react-native-web ~0.20.0`, `@react-native-async-storage/async-storage 2.1.2`, `react-test-renderer 19.0.0`.

- [ ] **Step 2: Doctor and unit tests**

Run: `npx expo-doctor` then `npx jest --silent`
Expected: doctor clean; all tests pass. React 19 prints `act(...)` warnings differently; a *warning* is acceptable, a *failure* follows the **Stop rule**.

- [ ] **Step 3: AsyncStorage 2 check**

`jest.setup.js` mocks `@react-native-async-storage/async-storage/jest/async-storage-mock`. Run: `Test-Path node_modules/@react-native-async-storage/async-storage/jest/async-storage-mock.js`
Expected: `True`. If `False`, list `node_modules/@react-native-async-storage/async-storage/jest/` and point `jest.setup.js` at the mock file that exists there.

- [ ] **Step 4: Full verification + smoke test**

Run: `npm run verify:all`, then the **Manual web smoke test**.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json jest.setup.js
git commit -m "chore(deps): Expo SDK 53 (React 19.0, React Native 0.79)"
```

---

### Task 6: Expo SDK 53 → 54 (React 19.1, React Native 0.81)

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^54.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@10.0.0
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
npm i -D "@types/react@~19.1.10"
```

Expected: `react 19.1.0`, `react-native 0.81.5`, `react-native-web ~0.21.0`, `jest-expo ~54.0.18`.

- [ ] **Step 2: Lint config still loads**

Run: `npm run lint`
Expected: no output errors. `eslint-config-expo` 10 still exports the legacy config used by `.eslintrc.js` (`extends: ['expo', 'prettier']`, ESLint 8.57.1). If ESLint reports it cannot load `expo`, **Stop rule** (moving to flat config is a separate decision).

- [ ] **Step 3: Doctor, full verification, smoke test**

Run: `npx expo-doctor`, `npm run verify:all`, then the **Manual web smoke test**.

- [ ] **Step 4: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore(deps): Expo SDK 54 (React 19.1, React Native 0.81)"
```

---

### Task 7: Expo SDK 54 → 55

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^55.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@55.0.1
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
```

- [ ] **Step 2: Doctor, full verification, smoke test**

Run: `npx expo-doctor`, `npm run verify:all`, then the **Manual web smoke test**.
Expected: all green. Record the React / React Native versions installed (`npm ls react react-native --depth=0`) in the commit message.

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore(deps): Expo SDK 55"
```

---

### Task 8: Expo SDK 55 → 56 (React 19.2, React Native 0.85)

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^56.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@56.0.4
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
npm i -D "@types/react@~19.2.0"
```

Expected: `react 19.2.3`, `react-native 0.85.3`, `react-native-screens ~4.26.0`, `jest-expo ~56.0.6`.

- [ ] **Step 2: Doctor, full verification, smoke test**

Run: `npx expo-doctor`, `npm run verify:all`, then the **Manual web smoke test**.

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore(deps): Expo SDK 56 (React 19.2, React Native 0.85)"
```

---

### Task 9: Expo SDK 56 → 57

**Files:**
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^57.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@57.0.2
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
```

- [ ] **Step 2: Doctor, full verification, smoke test**

Run: `npx expo-doctor`, `npm run verify:all`, then the **Manual web smoke test**. Record `npm ls react react-native --depth=0` in the commit message.

- [ ] **Step 3: Commit**

```powershell
git add package.json package-lock.json
git commit -m "chore(deps): Expo SDK 57"
```

---

### Task 10: Expo SDK 57 → 58 (React 19.3, React Native 0.88, Jest 30)

`jest-expo` 58.0.15 depends on Jest 30 packages (`jest-environment-jsdom ^30`, `@jest/globals ^30`), so Jest itself moves to 30 here.

**Files:**
- Modify: `package.json`, `package-lock.json`; test files only for the renamed matchers below

- [ ] **Step 1: Upgrade**

```powershell
npx expo install expo@^58.0.0
npx expo install --fix
npm i -D --save-exact eslint-config-expo@58.0.4
$rv = node -p "require('react/package.json').version"; npm i -D --save-exact "react-test-renderer@$rv"
npm i -D "jest@^30.0.0" "@types/react@~19.3.0"
```

Expected: `react 19.3.0`, `react-native 0.88.1`, `react-native-web ~0.21.4`, `jest-expo ~58.0.15`, `jest ^30`.

- [ ] **Step 2: Jest 30 removed matcher aliases — find them**

Run (PowerShell):

```powershell
Get-ChildItem -Recurse -Include *.test.js -Exclude node_modules | Select-String -Pattern '\.(toBeCalled|toBeCalledWith|lastCalledWith|nthCalledWith|toReturn|toReturnWith|lastReturnedWith|nthReturnedWith|toThrowError)\(' | ? { $_.Path -notmatch 'node_modules' }
```

Replace each hit with its Jest 30 name:

| Removed | Use |
| --- | --- |
| `toBeCalled` | `toHaveBeenCalled` |
| `toBeCalledWith` | `toHaveBeenCalledWith` |
| `lastCalledWith` | `toHaveBeenLastCalledWith` |
| `nthCalledWith` | `toHaveBeenNthCalledWith` |
| `toReturn` | `toHaveReturned` |
| `toReturnWith` | `toHaveReturnedWith` |
| `lastReturnedWith` | `toHaveLastReturnedWith` |
| `nthReturnedWith` | `toHaveNthReturnedWith` |
| `toThrowError` | `toThrow` |

- [ ] **Step 3: Doctor, full verification, smoke test**

Run: `npx expo-doctor`, `npm run verify:all`, then the **Manual web smoke test**.
Expected: all green. The three Jest configs (`jest.config.js`, `jest.integration.config.js`, `jest.functions.config.js`) need no change; if Jest 30 rejects an option, **Stop rule**.

- [ ] **Step 4: Commit**

```powershell
git add -A package.json package-lock.json "*.test.js" src test
git commit -m "chore(deps): Expo SDK 58 (React 19.3, React Native 0.88, Jest 30)"
```

---

### Task 11: Cleanup, security check, docs

**Files:**
- Delete (conditional): `scripts/patch-expo-windows.js`; Modify: `package.json` (`postinstall`)
- Modify: `docs/dev-backend.md`, `.github/workflows/ci.yml` (only if Node needs bumping)

- [ ] **Step 1: Windows patch**

If since Task 3 `npm install` prints `patch-expo-windows: pattern not found` **and** `npx expo start --web --port 8081 --clear` plus `npx expo export --platform web --output-dir dist` work on Windows: delete `scripts/patch-expo-windows.js` and remove `"postinstall": "node scripts/patch-expo-windows.js"` from `package.json`. Otherwise keep it and report the Metro error.

- [ ] **Step 2: Node version**

Expo 58 requires Node `^22.13.0 || ^24.3.0 || ^26 || >=27` (local: 24.12). CI uses `node-version: 22` (resolves to the latest 22.x, OK). No change unless `npm ci` in CI warns about engines.

- [ ] **Step 3: Security result**

```powershell
npm audit --json | ConvertFrom-Json | % { $_.metadata.vulnerabilities }
npm audit --omit=dev
```

Expected: far below the baseline (45). Every remaining finding: list package, severity, path and why it cannot be fixed (e.g. no patched release yet) in the final report. Do **not** run `npm audit fix --force`.

- [ ] **Step 4: Quality**

Run `npm run sonar:up` then `npm run sonar`; open http://localhost:9000/dashboard?id=biketrial-fantasy. Expected: 0 bugs, 0 vulnerabilities, 0 hotspots, coverage ≥ 80 %.

- [ ] **Step 5: Docs**

In `docs/dev-backend.md`, update any stated version (Expo SDK, Node) and add one line under the troubleshooting section: after `git pull` of this upgrade, run `npm ci` then `npx expo start --web --port 8081 --clear` (Metro cache from SDK 50 is incompatible).

- [ ] **Step 6: Final verification and commit**

Run: `npm run verify:all` and the **Manual web smoke test** one last time.

```powershell
git add -A package.json package-lock.json scripts docs .github
git commit -m "chore: post-upgrade cleanup (Windows patch, docs)"
```

- [ ] **Step 7: Hand-off**

Do not merge or push. Report: test counts, audit before/after, Dependabot alerts expected to close, warnings seen during the smoke tests, any Stop-rule events. The user decides merge into `main` and push (CI then re-runs on GitHub and Dependabot re-scans).
