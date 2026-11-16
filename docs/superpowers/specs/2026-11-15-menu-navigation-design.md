# Menu de navigation & saisons pilotées par les dates — Design Spec

> État : validé (brainstorming 2026-11-15). Première version, appelée à évoluer.
> Remplace la boucle linéaire du MVP (`currentIndex` / `ADVANCE` / « Terminer la saison »).

## Objectif

1. Ajouter un menu persistant (onglets) : jouer, classement, historique, règles & profil.
2. Faire piloter la saison **par les dates**, pas par le joueur : ouverture / verrouillage des compositions, révélation des résultats et archivage des saisons sont automatiques.
3. Conserver les saisons passées et les scores du joueur.

Les données restent **simulées et locales** (seed + AsyncStorage). Pas de backend.

## Données simulées

`src/data/seed/seasons.json` remplace `season.json` :

```
Season = { id, name, events: Event[] }
Event  = { id, name, venue, country, round, dateFrom, dateTo, results }   // dates 'YYYY-MM-DD'
```

Contenu généré par `scripts/gen-dev-seed.js` (déterministe) :

| Saison | Manches | Dates |
|--------|---------|-------|
| `2025` — archivée | 4 | toutes en 2025 |
| `2026-27` — en cours | 4 | 2026-10-18, 2026-11-08 (passées) · 2026-11-29, 2026-12-20 (à venir) |

Chaque manche dure 2 jours (`dateTo = dateFrom + 1`). Toutes ont des `results` (simulés) : ils ne sont **affichés** qu'une fois la manche terminée.

`src/data/seed/demoPlayer.json` : `{ name: 'Démo', picks: { [eventId]: Team } }` — équipes fictives pour les 4 manches 2025 et les 2 manches passées de 2026-27. C'est l'état de départ du joueur.

`riders.json` est inchangé et partagé par toutes les saisons.

## Calendrier (pur, `src/engine/calendar.js`)

`now` est une date `'YYYY-MM-DD'`.

- `eventStatus(event, now)` :
  - `'open'` si `now < dateFrom` — composition ouverte, modifiable ;
  - `'live'` si `dateFrom ≤ now ≤ dateTo` — équipe verrouillée, résultats cachés ;
  - `'done'` si `now > dateTo` — résultats et score révélés.
- `seasonStatus(season, now)` : `'archived'` si `now >` dernière `dateTo` ; `'upcoming'` si `now <` première `dateFrom` ; sinon `'current'`.
- `currentSeason(seasons, now)` : la saison `'current'` ; à défaut la prochaine `'upcoming'` ; à défaut la plus récente.

## Horloge

- `state.simulatedDate` : `null` (date réelle) ou `'YYYY-MM-DD'`.
- `useNow()` : renvoie `simulatedDate ?? today()`. Tous les écrans passent par lui.
- Réglable dans l'onglet Règles & profil (champ + bouton « Revenir à aujourd'hui »).

## État du jeu

```
state = { player: { name }, picks: { [eventId]: Team }, simulatedDate }
```

- État initial = `demoPlayer` (`player.name`, `picks`) + `simulatedDate: null`.
- Les scores ne sont **pas** stockés : `computeOutcome(event, team, rivals)` les dérive des `results` via le moteur existant (`scoring`, `bots`). Rivaux : `createRivals()` déterministe, identiques pour toutes les saisons.
- Actions :
  - `SAVE_TEAM { eventId, team, now }` — ignorée si `eventStatus !== 'open'` ;
  - `SET_NAME { name }` ;
  - `SET_SIMULATED_DATE { date | null }` ;
  - `RESET` — retour à l'état initial (démo) ;
  - `HYDRATE` — un état sauvegardé à l'ancien format (présence de `currentIndex`) est ignoré.
- Supprimés : `START_SEASON`, `LOCK_TEAM`, `ADVANCE`, `currentIndex`, `outcomes`.
- Une manche `'done'` sans équipe compte 0 pt et s'affiche « non jouée ».

## Navigation

Barre d'onglets (`@react-navigation/bottom-tabs@^6`), `headerShown: false` au niveau des onglets, chaque onglet est une stack avec ses en-têtes.

| Onglet | Stack |
|--------|-------|
| 🎮 Jouer | `SeasonHome → Briefing(eventId) → Compose(eventId)` ; `EventResult(eventId)` |
| 🏆 Classement | `Standings` |
| 📜 Historique | `SeasonList → SeasonDetail(seasonId) → EventResult(eventId)` |
| 📖 Règles | `Rules` |

## Écrans

- **SeasonHome** (remplace `HomeScreen`) : nom de la saison courante, score cumulé du joueur, liste des manches avec statut (« Ouverte · équipe prête / à composer », « En cours », « Terminée · X pts », « Non jouée »). Manche ouverte → `Briefing` ; en cours → `EventResult` en mode « résultats à venir » montrant l'équipe verrouillée ; terminée → `EventResult`.
- **Briefing / Compose** : reçoivent `eventId` en paramètre. Compose pré-remplit l'équipe existante ; le bouton devient « Enregistrer l'équipe » ; retour à `SeasonHome` après enregistrement. Si la manche n'est plus ouverte, Compose affiche « Composition fermée ».
- **EventResult** : rendu par `OutcomeView({ event, outcome })` (extrait de l'écran actuel), réutilisé dans Historique. Plus de bouton « classement saison ».
- **Standings** : classement cumulé de la saison courante sur ses manches `'done'` (`aggregateStandings`), composant `StandingsList` extrait de `SeasonStandingsScreen` (écran supprimé).
- **SeasonList** : saison courante en tête, puis archivées (plus récentes d'abord) : nom, rang final, score.
- **SeasonDetail** : les manches de la saison avec score ; manche terminée → `EventResult`.
- **Rules** : règles (6 slots typés, `points = PointsClassement(position) × cote`, cote élevée = outsider, verrouillage à `dateFrom`), pseudo modifiable, date simulée, « Réinitialiser la partie » (confirmation).

## Confirmations

`src/ui/confirm.js` : `confirm(message): Promise<boolean>` — `window.confirm` sur web, `Alert.alert` à deux boutons sur natif.

## Tests

- `calendar` : les 3 statuts d'event aux bornes (`dateFrom`, `dateTo`, lendemain) ; statuts de saison ; `currentSeason`.
- Reducer : `SAVE_TEAM` accepté si ouverte, ignoré sinon ; `SET_SIMULATED_DATE` ; `RESET` ; `HYDRATE` ignore l'ancien format.
- Seed : 2 saisons, dates conformes au tableau, `demoPlayer.picks` valides (`validateTeam`).
- Intégration : 4 onglets visibles ; SeasonHome affiche les statuts au 2026-11-15 (date simulée) ; Historique liste la saison 2025.
- Les tests existants sont adaptés à la nouvelle forme d'état.

## Hors périmètre

- **Dashboard d'administration** (ajout d'événements/compétitions, corrections) : spec séparée — il suppose une source de données partagée.
- Liste des pilotes, records personnels, comptes, synchronisation serveur.

## Relecture finale — clôturée le 2026-11-16, corrections reportées

Aucun problème bloquant. Les corrections ci-dessous sont **reportées** : on y reviendra quand la direction produit sera plus claire. La branche `feat/menu-date-seasons` reste en l'état.

Importantes :
1. `ComposeScreen` : calculer `now` dans `save()` et ne pas revenir à l'accueil si l'enregistrement est refusé (la manche peut se verrouiller écran ouvert).
2. Équipes des rivaux identiques d'une saison à l'autre (`selectors.js`, `seed: event.round`) : utiliser un hash de `event.id`.
3. Résultats recalculés plusieurs fois par rendu : constante `RIDERS_BY_CATEGORY`, `useScoring` mémoïsé, passer les résultats à `eventLabel`.
4. `calendar.js` plante sur une saison sans manche : filtrer les saisons vides dans `data/index.js`.

Mineures : griser les manches ouvertes non cliquables dans SeasonDetail ; masquer « Composer » dans Briefing si la manche n'est plus ouverte ; refuser les dates impossibles dans Règles (ex. 2026-02-31) ; l'en-tête d'EventResult affiche « Résultats » en mode « en cours » ; paramètres de route inconnus non gérés.

Le parcours manuel (tâche 11 du plan) n'a pas été fait.
