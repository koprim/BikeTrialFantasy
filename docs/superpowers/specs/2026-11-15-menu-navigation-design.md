# Menu de navigation — Design Spec

> État : validé (brainstorming 2026-11-15). Première version, appelée à évoluer.

## Objectif

Ajouter un menu persistant pour sortir de la boucle linéaire, permettre de **reprendre** une saison sauvegardée (aujourd'hui l'Accueil relance toujours une nouvelle saison), et consulter classement / historique / règles à tout moment.

## Navigation

Barre d'onglets en bas (`@react-navigation/bottom-tabs@^6`), 4 onglets :

| Onglet | Nom de route | Contenu |
|--------|--------------|---------|
| 🎮 Jouer | `PlayTab` | Stack existante : `Home → Briefing → Compose → EventResult → SeasonStandings` (inchangée) |
| 🏆 Classement | `StandingsTab` | Classement saison en lecture seule |
| 📜 Historique | `HistoryTab` | Stack : `HistoryList → HistoryDetail` |
| 📖 Règles | `RulesTab` | Règles du scoring + profil |

Les en-têtes de stack restent gérés par chaque stack ; la tab bar masque son propre header (`headerShown: false`).

## Écrans

### Accueil (onglet Jouer) — 3 états

Dérivés de l'état du jeu :

- **Aucune saison** (`player === null`) : écran actuel (pseudo, calendrier, « Commencer la saison »).
- **Saison en cours** (`player` défini, `finished` faux) : carte « Manche X / N · {score} pts » + bouton **Reprendre** ; lien secondaire **Nouvelle saison** avec confirmation.
  - Reprendre → `SeasonStandings` si la manche courante a déjà un résultat (`outcomes[event.id]` existe), sinon `Briefing`.
- **Saison terminée** (`finished` vrai) : récap final (rang + score du joueur) + bouton **Nouvelle saison** (sans confirmation).

### Classement (onglet)

Liste du classement saison (`aggregateStandings`) sans bouton d'action. Composant de liste extrait de `SeasonStandingsScreen` et partagé (`StandingsList`).

### Historique (onglet)

- `HistoryList` : manches ayant un résultat, ordre chronologique — « Manche N · lieu · score ».
- `HistoryDetail` (param `eventId`) : équipe alignée + détail des points + classement de la manche. Rendu par un composant `OutcomeView({ event, outcome })` extrait de `EventResultScreen`, qui l'utilise aussi.

### Règles & profil (onglet)

- Texte : les 6 slots typés, `points = PointsClassement(position) × cote`, cote élevée = outsider.
- Pseudo actuel (si saison).
- Bouton **Réinitialiser la partie** → confirmation → `RESET`, retour à l'onglet Jouer.

### États vides

Classement et Historique sans saison : « Commence une saison pour voir ton classement / historique » + bouton qui ouvre l'onglet Jouer.

## État du jeu

- Nouveau champ `finished: false` dans `initialState`.
- Nouvelle action `FINISH_SEASON` → `finished: true`. `START_SEASON` remet `finished: false`.
- `SeasonStandingsScreen` : « Terminer la saison » dispatch `FINISH_SEASON` (au lieu de `RESET`) puis revient à `Home`, qui affiche le récap.

## Confirmations

`Alert.alert` n'agit pas sur web : helper `confirm(message)` dans `src/ui/confirm.js` — `window.confirm` sur web, `Alert.alert` avec boutons sur natif, renvoyant une Promise<boolean>.

## Tests

- Reducer : `FINISH_SEASON`, `START_SEASON` remet `finished` à faux.
- Intégration : les 4 onglets sont visibles et navigables ; avec un état hydraté en cours, l'Accueil affiche « Reprendre ».
- Rendu : `HistoryList` (avec et sans résultats), `RulesScreen`.
- Les tests existants (smoke, Home→Briefing→Compose) restent verts.

## Hors périmètre

Liste des pilotes, vue calendrier séparée, réglages avancés, cartes/collection/ligues.
