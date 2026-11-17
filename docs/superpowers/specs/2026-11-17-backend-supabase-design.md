# Backend Supabase — conception

Date : 2026-11-17 · Statut : validée en brainstorming, en attente de relecture

## Objectif

Passer d'une app 100 % locale (JSON + AsyncStorage) à un vrai backend : base relationnelle pour les données sportives réelles, données joueurs hébergées, logique de jeu faisant autorité côté serveur, import des résultats officiels à partir des PDF ChronoRace.

Cible de dimensionnement : 500 à 5 000 joueurs actifs, architecture capable de monter au-delà sans réécriture.

Hors périmètre : modèle économique et coûts (chantier C), ligues, tableau de bord admin complet, style (chantier D).

## Décisions

| Sujet | Décision |
|---|---|
| Plateforme | Supabase (Postgres, Auth, Edge Functions, Storage). Deux projets : `dev` et `prod`. |
| Comptes | Compte invité anonyme créé au premier lancement, rattaché ensuite (lien magique e-mail, Google, Apple) via l'écran « Sauvegarder mon compte ». |
| Autorité | Le serveur décide : tirages, sauvegarde d'équipe, recyclage, craft, calcul des points. L'app ne fait que lire et prévisualiser. |
| Moteur | `src/engine/*` devient un paquet partagé, utilisé par l'app (affichage) et les Edge Functions (décision). |
| Calcul des points | À froid : une fois par import validé, stocké, puis seulement lu. Provisoire après chaque phase, définitif après le classement général. |
| Import | PDF → Edge Function `extract-import` (API d'un modèle d'IA) → JSON au schéma d'import strict → validations → aperçu admin → enregistrement transactionnel. Pas de n8n. |
| Temps | L'heure serveur fait foi. La date simulée n'existe que sur `dev` (réglage en base). |
| Techniques | Rebranchées sur les statistiques réelles (déclencheur `RIDER_STAT`). Les techniques observées (vidéo, saisie) viendront plus tard via `observations`. |
| Cartes | Écrites pilote par pilote pour chaque saison. Un pilote importé peut n'avoir aucune carte : ses stats existent, il n'est pas sélectionnable. |
| Conteneurs locaux | Supabase CLI sur Podman (préférence), Docker en repli si incompatibilité. |

## Architecture

```
 App Expo (joueurs)            Pages admin (rôle admin)
   │ lecture directe (RLS)       │ upload PDF → extract-import (IA → JSON)
   │                             │ aperçu + anomalies → commit-import
   ▼ actions sensibles           ▼
 ┌──────────────── Supabase ────────────────────────────┐
 │ Auth : anonyme → rattachement                         │
 │ Edge Functions : open-starter · open-daily-pack ·     │
 │   recycle · craft · save-team · extract-import ·      │
 │   commit-import → score-competition                   │
 │ Postgres + RLS · Storage (PDF archivés)               │
 └───────────────────────────────────────────────────────┘
```

Règles d'accès : référentiel et catalogue lisibles par tous ; données joueurs lisibles par leur seul propriétaire ; aucune écriture client directe sur les tables de jeu (seules les Edge Functions, avec la clé service, écrivent).

## Schéma

### Référentiel sportif (lecture publique, écriture admin)

- `riders` : `id`, `uci_id` (unique), `last_name`, `first_name`, `nation`, `birth_year`, `brand`, `active`, `legend`.
- `seasons` : `id` ('2025', '2026'…).
- `categories` : `id` (ex. `men-elite-20`), libellé.
- `competitions` : `id`, `season_id`, `name`, `city`, `country`, `date_from`, `date_to`, `referee_id`, `status` (`open` → `live` → `provisional` → `final`).
- `phases` : `id`, `competition_id`, `category_id`, `kind` (`QF` | `SF` | `F`), `laps`, `zones`, `date`.
- `phase_results` : `phase_id`, `rider_id`, `group` (A–D ou null), `rank`, `total`, `penalty`, `time_remaining_s`, `tiebreak` (texte, ex. « 3x60 »), `status` (`Q` | `LL` | null), `bib`.
- `zone_scores` : `phase_result_id`, `lap`, `zone`, `score` (0–60, pas de 10).
- `overall_results` : `competition_id`, `category_id`, `rider_id`, `rank`, `phase_reached`, `result`, `uci_points`.
- `rider_stats` (vue) : par pilote × compétition × catégorie — `perfectZones`, `zeroZones`, `lapImproved`, `luckyLoser`, `phaseReached`, `timeRemaining`, `age`, `rank`, `nation`, `brand`. C'est l'unique source lue par les effets.
- `observations` : `rider_id`, `phase_id`, `key`, `value`, `source`. Vide au départ ; réservée aux futures techniques.
- `referees` : `id`, nom, nation.
- `rider_odds` : `competition_id`, `category_id`, `rider_id`, `cote`. Figée à l'ouverture de la compétition ; la cote affichée au choix est celle du calcul.

### Catalogue (lecture publique, écriture admin)

- `cards` : `id`, `type`, `edition`, `name`, `subject_id`, `rarities`, `effects` (JSON déclaratif actuel, avec `description`).
- `balance` : `version`, `data` (JSON : probabilités, poids, fragments, coûts). Les scores mémorisent la version utilisée.

### Joueurs (lecture propriétaire, écriture serveur)

- `profiles` : `user_id`, `display_name`, `is_anonymous`, `created_at`.
- `owned_cards` : `user_id`, `card_id`, `rarity`, `count` — clé (`user_id`, `card_id`, `rarity`).
- `wallets` : `user_id`, `fragments` (≥ 0), `pity_e`, `pity_l`, `packs_opened`, `last_pack_date`, `starter_given`.
- `pack_openings` : `id`, `user_id`, `kind` (`starter` | `daily`), `pack_date`, `cards` (JSON), `opened_at`. Unicité (`user_id`, `kind`, `pack_date`) pour `daily` ; une seule ligne `starter` par joueur.
- `teams` : `user_id`, `competition_id`, `team` (JSON, format actuel), `updated_at`.
- `team_scores` : `user_id`, `competition_id`, `total`, `breakdown`, `effects`, `provisional`, `engine_version`, `balance_version`, `computed_at`.
- `standings` : `season_id`, `user_id`, `points`, `rank`.

### Import

- `imports` : `id`, `file_path` (Storage), `payload` (JSON extrait), `anomalies`, `status` (`draft` → `validated` → `committed`), `created_at`, `committed_at`.

Volume estimé : ~3 000 lignes de résultats par compétition ; quelques centaines de milliers de lignes au total à 5 000 joueurs.

## Fonctions serveur

Chaque fonction s'exécute en une transaction et revalide tout côté serveur.

| Fonction | Garanties |
|---|---|
| `open-starter` | Un seul starter par compte. |
| `open-daily-pack` | Un pack par jour (date serveur), tirage serveur, pity, historique. |
| `recycle` / `craft` | Possession vérifiée, fragments jamais négatifs. |
| `save-team` | Possession, règles d'emplacement (`validateCardTeam`), refus si la compétition a commencé. |
| `extract-import` | PDF → JSON conforme au schéma d'import ; archive le PDF. Réservée admin. |
| `commit-import` | Revalide, crée les pilotes inconnus (par UCIID), enregistre la phase ou le classement, déclenche `score-competition`. Réservée admin. |
| `score-competition` | Pour chaque équipe : `teamEventScore` avec `rider_stats`, `rider_odds`, `cards`, `balance` ; écrit `team_scores` puis `standings`. Rejouable (remplace). |

## Import des résultats

1. **Extraction** : le PDF ChronoRace (classement général ou résultats d'une phase) est envoyé à l'API d'un modèle d'IA avec le schéma d'import ; sortie JSON stricte.
2. **Validations automatiques** :
   - somme des zones = total de chaque tour ;
   - tours + pénalité = total ;
   - rangs cohérents avec les scores ;
   - scores de zone entre 0 et 60 par pas de 10 ;
   - UCIID connus, nouveaux pilotes signalés ;
   - nombre de tours et de zones conforme à la phase.
3. **Aperçu admin** : anomalies listées, correction manuelle possible, puis validation.
4. **Enregistrement** : transaction unique, puis calcul des points.

Les PDF de Rzeszów 2026 (Men Elite 20", classement général et quarts de finale) servent de jeu de test de référence.

## Effets

- Nouveau déclencheur générique `RIDER_STAT { stat, op, value }`, `op` ∈ `>=`, `<=`, `=`. Il remplace `RIDER_DID_TECHNIQUE` et `RIDER_CLEAN_MIN`.
- Stats disponibles : `perfectZones`, `zeroZones`, `lapImproved`, `luckyLoser`, `phaseReached`, `timeRemaining`, `age`.
- Les cartes Technique 2026 deviennent des gestes statistiques (Sans faute, Régulier, Finisseur, Chrono, Miraculé, Pépite).
- Les autres déclencheurs et récompenses sont inchangés.
- Futur : `RIDER_OBSERVATION { key, value }` lira `observations`.
- Les bots ne subsistent qu'en mode démo.

## App

- Couche `src/data/api` avec deux implémentations derrière une interface unique : `demo` (JSON + AsyncStorage + date simulée, l'existant) et `supabase`.
- TanStack Query pour le cache ; lecture hors ligne des dernières données, actions en ligne uniquement.
- Compte invité silencieux au premier lancement ; écran « Sauvegarder mon compte » (lien magique, Google, Apple). L'app prévient qu'un compte invité est lié à ce navigateur ou cet appareil.
- Pages admin minimales (rôle `admin`, web) : envoi PDF, aperçu et anomalies, validation, liste « pilotes sans carte cette saison ».

## Migration

- Script : JSON actuels (pilotes, saisons, cartes, balance) → données de départ de `dev`.
- Les sauvegardes locales ne sont pas migrées (aucun vrai joueur).

## Tests

- Moteur : tests Jest existants, étendus à `RIDER_STAT`.
- Import : schéma et validations testés sur les PDF de Rzeszów.
- Fonctions serveur : contre Supabase local (CLI sur Podman, Docker en repli), sinon contre le projet `dev`.

## Découpage en plans

1. **B1** — Supabase (schéma, RLS), comptes invités et rattachement, couche `src/data/api`, fonctions joueurs (starter, pack, recycle, craft, save-team).
2. **B2** — Import (extraction, validations, enregistrement), `rider_stats`, `RIDER_STAT`, calcul des points, classements.
3. **B3** — Pages admin minimales.

## Notes pour les autres chantiers

- C : coûts Supabase (gratuit puis ~25 $/mois), appels IA (quelques centimes par import), domaine, stores.
- D : compatibilité multi-navigateurs (Chrome, Safari, Firefox, mobile).
