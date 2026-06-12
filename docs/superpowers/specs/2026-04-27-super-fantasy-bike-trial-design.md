# Super Fantasy Bike Trial — Design Spec

> État: **Périmètre MVP figé** — boucle core validée pour le POC (voir §1bis). Vision complète conservée comme cible post-MVP.
> Prochaine étape: réunir les données (Coupe du Monde UCI + ranking), puis rédiger le plan d'implémentation.

---

## 1. Vue d'ensemble

**Super Fantasy Bike Trial** est un jeu fantasy de prédiction basé sur les compétitions UCI de Trial VTT. Avant chaque compétition internationale, le joueur compose une équipe de 6 pilotes réels, équipe chaque pilote avec des cartes techniques et d'équipement, choisit des objectifs bonus, puis accumule des points selon les performances réelles des pilotes sur les zones.

**Phase actuelle**: POC / démo sectorielle — montrer aux acteurs du milieu (pilotes, fédérations, sponsors) pour valider l'intérêt avant développement complet.

**Plateforme**: Application mobile (iOS/Android via Expo React Native) + site web — même codebase.

**Modèle**: Free-to-play, collection permanente, progression méritocratique.

**Compétitions sources**: UCI internationales uniquement (World Cup, Championnats du Monde).

---

## 1bis. Périmètre MVP (POC démo sectorielle)

> **Ceci est la source de vérité pour ce qu'on construit en premier.** Les sections 4–8 décrivent la vision complète (cartes, synergies, collection, ligues, pipeline) — **reportée post-MVP**.

### Décisions de cadrage

| Axe | Choix MVP | Reporté |
|-----|-----------|---------|
| **Périmètre** | Boucle core seule : composer une équipe, scorer `classement × cote`, classement | Cartes (techniques, équipement, synergies), objectifs, collection/packs |
| **Architecture** | Démo mono-appareil : données seedées en local, adversaires simulés | Backend, comptes joueurs, classement partagé, ligues privées |
| **Données** | Plusieurs manches d'une Coupe du Monde UCI récente, seedées en dur | Import semi-auto, crowdsourcing |
| **Scoring** | Uniquement `classement × cote` (le scoring zones/sections n'a aucun consommateur sans cartes/objectifs → retiré du MVP) | Indice de performance zones, bonus techniques/objectifs |
| **Visuel** | Non bloquant pour le MVP fonctionnel ; style final à choisir plus tard | Choix Bento/Neumorphism/Premium White |

### Boucle de démo (saison d'events seedés)

1. **Saisie joueur** — un pseudo, pas de compte.
2. Pour chaque event de la saison, dans l'ordre chronologique :
   1. **Briefing** — event (nom, date, lieu, n° de manche) + roster disponible par catégorie, cote de chaque pilote affichée.
   2. **Composition** — le joueur remplit ses 6 slots typés.
   3. **Lock** — confirmation de l'équipe (verrouillée pour l'event).
   4. **Reveal** — affichage des résultats réels + calcul du score joueur.
   5. **Classement de l'event** — joueur vs rivaux simulés.
   6. **Classement saison** — cumul depuis le début de la saison.
3. Event suivant jusqu'à la fin de la saison seedée.

### Composition d'équipe

6 slots typés, 1 catégorie par slot. **5 catégories distinctes** (Elite Femme occupe 2 slots) :

| Slot | Catégorie | Roue |
|------|-----------|------|
| 1 | Senior | 26" |
| 2 | Junior | 26" |
| 3 | Senior | 20" |
| 4 | Junior | 20" |
| 5 | Elite Femme | 20" |
| 6 | Elite Femme | 20" |

Contrainte : les 2 pilotes Elite Femme doivent être **différents**.

### Moteur de score

```
Cote(pilote)          = palier dérivé du ranking UCI (constante sur la saison pour le MVP)
PointsClassement(pos) = table de points selon la position finale dans la catégorie
Score pilote (event)  = PointsClassement(position) × Cote(pilote)
Score joueur (event)  = Σ des 6 pilotes
Score saison          = Σ des events joués
```

**Points de classement** (proposition, à affiner après test) :

| Pos | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | au-delà |
|-----|---|---|---|---|---|---|---|---|---|----|---------|
| Pts |100|80 |65 |52 |42 |34 |27 |21 |16 |12 | dégressif, min 4 |

**Cote** (inversement liée au ranking UCI) :

| Profil UCI | Top 3 | Top 4–10 | Top 11–25 | Top 26–50 | Hors top 50 / NC |
|------------|-------|----------|-----------|-----------|------------------|
| Cote | ×1.0 | ×1.3 | ×1.6 | ×2.0 | ×2.5 |

> **Hook** : favori qui gagne = 100×1.0 = **100**. Outsider (×2.5) 3e = 65×2.5 = **162**. Outsider dernier = 4×2.5 = **10**. Risque/récompense lisible, récompense la connaissance du milieu.
> **Cote constante par pilote** sur la saison seedée (son standing général) — choisi pour simplifier le seed ; un snapshot par event reste possible post-MVP.

### Adversaires simulés

8–12 rivaux, chacun avec une **stratégie** générant son équipe à chaque event :

| Stratégie | Comportement |
|-----------|--------------|
| Favoris | Prend les pilotes les mieux classés (cotes basses) |
| Équilibré | Mix favoris / outsiders |
| Outsider | Privilégie les cotes hautes |
| Aléatoire | Sélection au hasard parmi les éligibles |

Objectif : un joueur qui pioche intelligemment doit pouvoir battre les bots « Favoris » → preuve visible du hook.

### Modèle de données (seed)

- **Rider** : id, nom, pays (ISO), catégorie (`SENIOR_26` | `JUNIOR_26` | `SENIOR_20` | `JUNIOR_20` | `ELITE_WOMEN`), rankingUCI (int), cote (dérivée).
- **Event** : id, nom, date, lieu, n° de manche, résultats = pour chaque catégorie, liste ordonnée d'identifiants pilotes (classement final).
- **Team** (pick joueur par event) : eventId, 6 slots → riderId (Elite Femme ×2 distincts).
- **Rival** : id, nom, stratégie.

### Données à fournir (dépendance)

Pour seeder : une Coupe du Monde UCI récente, plusieurs manches. Par manche : **classement final ordonné par catégorie**. Par pilote : nom, pays, **ranking UCI** (→ je dérive la cote). Saison/manches précises à confirmer.

### Hors périmètre MVP (rappel explicite)

Cartes techniques, cartes équipement/marques, synergies, objectifs joueur, collection/packs/progression, ligues privées, backend/comptes, pipeline d'import, crowdsourcing, choix du style visuel final.

---

## 2. Composition d'équipe

6 slots typés, miroir du format équipes nationales UCI :

| Slot | Catégorie | Roue |
|------|-----------|------|
| 1 | Senior | 26" |
| 2 | Junior | 26" |
| 3 | Senior | 20" |
| 4 | Junior | 20" |
| 5 | Elite Femme | 20" |
| 6 | Elite Femme | 20" |

Chaque slot n'accepte que la catégorie correspondante.

---

## 3. Système de scoring

### 3.1 Score de base par pilote

```
Score pilote = Points de classement × Multiplicateur de cote
```

**Points de classement** (position finale dans la catégorie ce jour-là) :

| Position | Points |
|----------|--------|
| 1er | 100 pts |
| 2ème | 80 pts |
| 3ème | 65 pts |
| 4ème | 50 pts |
| 5ème | 38 pts |
| ... | dégressif |
| Dernier | 5 pts |

**Multiplicateur de cote** (inversement lié au ranking UCI) :

| Profil UCI | Cote |
|------------|------|
| Top 3 mondial | ×1.0 |
| Top 4–10 | ×1.3 |
| Top 11–25 | ×1.6 |
| Top 26–50 | ×2.0 |
| Hors top 50 / non classé | ×2.5 |

Objectif: récompenser la connaissance du milieu, rendre les pilotes peu connus stratégiquement intéressants.

### 3.2 Scoring des zones (stat secondaire)

- Chaque zone contient **6 sections**, chacune valant **10 pts** si franchie sans pénalité (0 pts si pénalité)
- **Maximum par zone**: 60 pts (6 × 10)
- Si le pilote atteint **5 pénalités** dans la zone → il s'arrête, mais **conserve les points des sections déjà validées**
- Les valeurs de pénalité (1, 2, 3, 5) → alimentent un **indice de performance** utilisé par les cartes Technique et les objectifs

### 3.3 Score final du joueur

```
Score joueur = Σ(classement × cote)  ← les 6 pilotes
             + Σ(bonus cartes techniques activées)
             + Σ(bonus synergies marques/composants)
             + Σ(bonus objectifs réalisés)
```

---

## 4. Système de cartes

### 4.1 Types de cartes

**Cartes Pilote**
- Représente un pilote UCI réel
- Stats: ranking UCI, cote, clean rate, affinités
- **Affinités**: 2–3 techniques maîtrisées + marques/composants préférés
- **3 slots** pour attacher des cartes Technique/Équipement

**Cartes Technique**
- Exemples: Latéral, Bunny Hop Up, Sidehop, Step Up, Trackstand, Gap...
- Attachée à un pilote avant l'event
- **Activation conditionnelle**: si le pilote réalise la technique en compétition → bonus
- Si affinité pilote ↔ technique → bonus amplifié

**Cartes Équipement** (Composants & Marques)
- Marques: Monty, Echo, Inspired, Jitsie, Montesa...
- Composants: Freins Magura, Freins Hope, Pneus Monty...
- **Synergies**: 2+ pilotes même marque → bonus équipe; 3+ → bonus renforcé
- Si affinité pilote ↔ marque → multiplicateur supplémentaire

### 4.2 Rarités

| Rareté | Couleur accent | Multiplicateur | Disponibilité |
|--------|---------------|----------------|---------------|
| Commune | Gris | ×1.0 | Starter pack + gratuit |
| Rare | Bleu | ×1.5 | Packs standards |
| Épique | Violet | ×2.0 | Packs premium / récompenses |
| Légendaire | Or | ×3.0 | Récompenses top classement |

### 4.3 Structure d'une carte Pilote (visuel)

```
┌──────────────────────┐
│ [Logo marque] [★ Rareté] │  ← badges top-left/right
│                      │
│   [Zone photo/image] │  ← grande zone centrale
│                      │
│   Nom du pilote      │  ← bas de la photo
│   Équipe · Pays      │
│ ─────────────────── │
│  Clean  Cote   UCI  │  ← 3 stats
│  82%    ×1.3   #5   │
│ ─────────────────── │
│   [○]   [○]   [○]  │  ← 3 slots technique/équipement
│ ─────────────────── │
│  🇫🇷              ÉPIQUE │  ← drapeau + badge rareté
└──────────────────────┘
```

---

## 5. Objectifs d'équipe

- Le joueur choisit **ses propres objectifs** avant chaque compétition parmi une liste disponible
- Les objectifs sont liés aux forces de son équipe et à ses cartes
- Exemples:
  - "2 latéraux dans une zone → +30 pts"
  - "3 sections clean consécutives → +20 pts"
  - "Un pilote finit dans le top 5 de sa catégorie → +40 pts"
  - "Ton Junior 20" bat un Senior 20" → +50 pts"

---

## 6. Collection & Progression

- **Free-to-play**: pas de paiement requis pour jouer
- **Starter pack**: set de cartes communes + quelques rares pour démarrer
- **Progression méritocratique**:
  - Meilleure performance → plus de packs gagnés
  - Top classements event → packs épiques/légendaires
  - Objectifs quotidiens/hebdomadaires → récompenses régulières
  - Fabrication: détruire des doublons pour créer de nouvelles cartes

---

## 7. Compétition & Ligues

- **Classement global**: leaderboard commun à tous les joueurs par event + cumulé saison
- **Ligues privées**: création/rejoindre des ligues (amis, communautés)
- **Ligue officielle**: ligue publique gérée par les organisateurs

---

## 8. Pipeline de données

### Phase 1 (POC)
Import semi-automatique: parsing des fichiers de résultats UCI (PDF/Excel) → validation admin → publication des scores

### Phase 2 (évolution)
Crowdsourcing: arbitres/observateurs de confiance saisissent les données en quasi-temps réel depuis l'app

---

## 9. Design system (WIP — en cours de validation)

**Typographie**: Russo One (titres/noms) + Chakra Petch (stats/corps)

**Style visuel**: En cours de choix entre 3 directions (voir maquettes browser):
- A: Bento/Apple (fond gris clair, cartes blanches, barre latérale colorée)
- B: Neumorphism (fond argile, double ombre extrudée)
- C: Premium White (fond blanc, ombres profondes, bandeau gradient rareté)

**Palette (base)**: Fond clair · Rareté commune gris · Rare bleu · Épique violet · Légendaire or

**Maquettes**: `.superpowers/brainstorm/571-1777242051/content/card-pilot-v3.html`

---

## 10. Architecture technique — Phases

### Phase 1 (POC/démo)
- Sélection de pilotes par slot
- Scoring classement × cote
- Classement global
- Ligues de base
- Import résultats semi-auto (admin)

### Phase 2
- Cartes Technique (système d'activation)
- Objectifs joueur (choix pré-event)

### Phase 3
- Synergies Marques/Composants
- Progression collection complète
- Crowdsourcing résultats

---

## À valider / décisions ouvertes

### Bloquant pour le MVP
- [ ] **Données** : confirmer la saison/manches de Coupe du Monde UCI à seeder + récupérer classements par catégorie et rankings UCI
- [ ] Valider les valeurs des points de classement (table proposée à affiner après test)
- [ ] Nombre exact de rivaux simulés et répartition des stratégies

### Post-MVP (vision complète)
- [ ] Style visuel final des cartes (A/B/C ou hybride)
- [ ] Nombre exact de slots par pilote (3 confirmé ?)
- [ ] Liste complète des techniques disponibles
- [ ] Liste des marques/composants à inclure au lancement
- [ ] Nombre d'objectifs disponibles par event et par joueur
- [ ] Cote : snapshot par event vs constante saison (MVP = constante)
