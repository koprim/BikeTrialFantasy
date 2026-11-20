# Vérifier la qualité du code

Deux outils SonarQube, complémentaires :

| Outil | Où | Quand |
|---|---|---|
| **SonarQube for IDE** (extension VS Code) | soulignés dans l'éditeur + onglet « Problems » | en continu, pendant qu'on écrit |
| **SonarQube Community** (serveur local Docker) | tableau de bord http://localhost:9000 | analyse complète du projet, à la demande |

Le serveur mesure : bugs, vulnérabilités, points sensibles de sécurité, « code smells » (code difficile à maintenir), duplication et couverture par les tests. La « Quality Gate » (vert / rouge) résume l'état.

## Lancer une analyse

Prérequis : Docker Desktop démarré.

```bash
npm run sonar:up     # démarre SonarQube (1re fois : ~1 min avant que http://localhost:9000 réponde)
npm run sonar        # lance les tests unitaires avec couverture, puis l'analyse
npm run sonar:down   # arrête SonarQube (les résultats sont conservés)
```

Le lien du rapport s'affiche à la fin : http://localhost:9000/dashboard?id=biketrial-fantasy

## Première connexion

- Identifiant `admin`, mot de passe `admin` : SonarQube demande de le changer.
- Le jeton d'analyse est dans le fichier `.sonar-token` (ignoré par git). Pour en recréer un : *My Account → Security → Generate Token* (type « Global Analysis »), puis le coller dans `.sonar-token`.

## Lire les résultats

- **Issues** : chaque problème avec le fichier, la ligne et une explication (« Why is this an issue? »).
- Un problème peut être un faux positif : le marquer *False positive* ou *Accept* avec un commentaire. Exemple connu : `src/engine/rng.js` utilise `| 0` exprès (arithmétique 32 bits du générateur aléatoire) ; `Math.trunc` changerait le résultat.
- **Measures → Coverage** : les fichiers peu testés.

## Ce qui est analysé

Défini dans `sonar-project.properties` : `src`, `scripts`, les migrations SQL et les Edge Functions. Les tests (`*.test.js`, `test/`) sont reconnus comme tests ; le bundle généré `backend.mjs` est exclu. La couverture vient des tests unitaires (les tests d'intégration ne sont pas comptés).

## Dépendances : vulnérabilités acceptées

État au 2026-11-20 (Expo SDK 58) : `npm audit` = 22 modérées, 0 haute, 0 critique ; `npm audit --omit=dev` = 3 modérées. Le seul correctif proposé est `npm audit fix --force`, qui **rétrograde** (Jest 29, Expo 52) : ne pas l'utiliser.

| Paquet | Gravité | Avis | Dev / prod | Pourquoi accepté |
|---|---|---|---|---|
| `glob` (via `test-exclude`, `@jest/reporters`, `jest-config`, `jest-runtime`) et toute la chaîne `jest` / `@jest/*` / `babel-jest` / `babel-plugin-istanbul` / `jest-expo` / `jest-watch-typeahead` (19 entrées) | modérée | GHSA-3g3m-2fjr-6pw4 | dev | outillage de test de Jest 30, jamais livré dans l'app ; seul correctif : rétrograder vers Jest 29 |
| `minimatch` (via `@expo/fingerprint`, donc `expo` ; aussi plusieurs copies dans l'arbre Jest) | modérée | GHSA-g3hv-75wg-m249 | prod (arbre de `expo`) | outil de build (empreinte du projet), absent du bundle de l'app ; seul correctif : rétrograder vers Expo 52 |

Corrigé : `zod` 3.25.76 (haute, GHSA-mrhx-c7xc-m3w5), dépendance de dev via `eslint-config-expo` → `eslint-plugin-react-hooks`. Forcé en `^4.6.6` par un `overrides` **ciblé** dans `package.json` (`"eslint-plugin-react-hooks": { "zod": "^4.6.6" }`). À retirer quand `eslint-config-expo` embarquera une version corrigée (vérifier avec `npm ls zod`).

À revérifier (`npm audit`) :

- à la prochaine version mineure de Jest (`glob`) ;
- au prochain correctif Expo, via `npx expo install --fix` (`minimatch` / `@expo/fingerprint`).

## Monter de version Expo

Leçons de la montée SDK 50 → 58 :

1. **Un SDK à la fois**, chaque étape verte et commitée (régression bisectable).
2. `npx expo install expo@^N` puis `npx expo install --fix`.
3. À la main : `eslint-config-expo` (version exacte du SDK) et `react-test-renderer` (= version de `react`).
4. Garder `jest-expo` et `babel-preset-expo` dans les `devDependencies`.
5. npm 11 peut imbriquer des paquets Expo : si un module Expo « cannot be found », `npx expo install <paquet>`. Exception : ne **jamais** garder `expo-modules-core` en dépendance directe (`expo-doctor` l'interdit).
6. Erreur `ERESOLVE` : désinstaller ensemble `react-test-renderer`, `@testing-library/react-native` et `@types/react`, puis les réinstaller.
7. Nouvelles dépréciations React Native (avertissements au chargement dans Jest) : ajouter le nom de l'export à `EXPORTS_THAT_WARN_WHEN_LOADED` dans `test/preloadReactNative.js`.
8. Vérifier : `npx expo-doctor`, puis `npm run verify:all` (fonctions servies : `npm run functions:serve`).
9. Après la montée, chaque poste : `npm ci` puis `npx expo start --web --port 8081 --clear`.
