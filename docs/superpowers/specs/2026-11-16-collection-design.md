# Collection de cartes, packs quotidiens et effets — Design Spec

> État : validé (brainstorming 2026-11-16). Première version, appelée à évoluer.
> S'appuie sur la branche `feat/menu-date-seasons` (menu à onglets, saisons pilotées par les dates).

## Objectif

Le joueur débute avec des cartes communes. Chaque jour, il ouvre un pack pour viser des cartes plus rares, dont les effets rapportent plus de points. Il ne joue que les cartes qu'il possède. Le plaisir vient de la collection et du pari sur les cartes.

Contraintes d'équilibrage :
- **Jour 1** : une équipe complète.
- **Semaine 1** : de vrais choix dans chaque emplacement.
- **Mois 1** : toutes les Communes et la moitié des Rares.
- **Fin de saison (environ 4 mois)** : toutes les Rares et une bonne partie des Épiques.
- **Légendaires** : un objectif, quelques-unes par saison.

Toutes les valeurs chiffrées (raretés, probabilités, coûts, puissance des effets) sont des **données d'équilibrage**. Elles vivent dans `balance.json` et `cards.json`, jamais dans le code.

Les données restent simulées et locales (seed et AsyncStorage). Pas de backend.

## 1. Catalogue — `src/data/seed/cards.json`

```
CardDef = {
  id,                 // ex. 'pilot-2026-senior20-1'
  type,               // 'PILOT' | 'TECHNIQUE' | 'EQUIPMENT' | 'REFEREE'
  edition,            // id de saison = une année, ex. '2026'
  name,
  subject,            // riderId (PILOT), nom de technique, marque, nom d'arbitre
  rarities,           // raretés disponibles, ex. ['C','R','E'] (pas de 'L' pour tous)
  effects: Effect[]   // déclaratifs, voir §3
}
```

- **Rareté** : `C` (Commune), `R` (Rare), `E` (Épique), `L` (Légendaire). Une carte possédée = `cardId` + rareté.
- **Versions** : chaque saison (`edition`) peut publier une nouvelle carte pour un même pilote, avec d'autres effets.
- **Légendes** : pilotes retraités. Ils figurent dans `riders.json` avec `active: false` et une catégorie. Ils occupent l'emplacement de leur catégorie, ne marquent aucun point de classement et ne marquent que par leurs effets.
- **Présence non requise** : un pilote absent de la manche marque 0 point de classement, mais ses effets s'évaluent quand même (un effet qui dépend de son résultat ne se déclenche pas).
- **Arbitres** : cartes nommées qui fonctionnent comme les cartes pilotes (plusieurs raretés, doublons, recyclage, fabrication). La composition n'a qu'**un seul emplacement arbitre**. Un arbitre n'a pas besoin d'officier sur la manche.

### Saisons en année simple

Une saison = une année : `2025`, `2026`, puis `2027`. La saison simulée `2026-27` est renommée `2026` (id, nom, ids de manches `2026-r1`…, `demoPlayer.json`). Ses dates ne changent pas. Une sauvegarde qui contient des équipes sous les anciens ids `2026-27-rN` est migrée vers `2026-rN`.

## 2. Équilibrage — `src/data/seed/balance.json`

```
{
  "rarityMultiplier": { "C": 1, "R": 1.5, "E": 2, "L": 3 },
  "pack": {
    "size": 5,
    "guaranteedMinRarity": "R",
    "odds": { "C": 0.70, "R": 0.22, "E": 0.07, "L": 0.01 },
    "typeWeights": { "PILOT": 0.55, "TECHNIQUE": 0.25, "EQUIPMENT": 0.15, "REFEREE": 0.05 }
  },
  "pity": { "E": 10, "L": 60 },
  "fragments": { "perDuplicate": { "C": 5, "R": 15, "E": 50, "L": 200 },
                 "craftCost":    { "C": 40, "R": 120, "E": 400, "L": 1600 } },
  "slots": { "techniquesByPilotRarity": { "C": 1, "R": 1, "E": 2, "L": 3 },
             "equipment": 2, "referee": 1 }
}
```

- `rarityMultiplier` multiplie la valeur des récompenses d'effet (pas le score de base).
- **Pity** : si les N−1 derniers packs n'ont donné aucune carte de rareté ≥ X, le N-ième en contient une. Les compteurs se remettent à zéro dès qu'une carte de cette rareté tombe.
- Si une rareté tirée n'existe pas pour la carte tirée, on prend la rareté disponible la plus proche en dessous.

Les valeurs ci-dessus sont un point de départ. Elles seront ajustées avec le simulateur (§8).

## 3. Moteur d'effets — `src/engine/effects.js` (pur, CommonJS)

```
Effect = { description: string, trigger: Trigger, reward: Reward }
```

- `trigger` et `reward` servent au calcul.
- `description` est le texte affiché au joueur (carte, détail du score). Il peut contenir `{value}`, remplacé par la valeur de la récompense à la rareté affichée. Exemple : `"+{value} pts si au moins 3 Français finissent dans le top 5 Seniors 20\""` donne « +40 pts… » en Commune et « +120 pts… » en Légendaire. Pour un multiplicateur, `{value}` s'affiche en pourcentage (« +30 % »).
- Une description manquante est une erreur de validation du catalogue.

**Déclencheurs** :

| `type` | Paramètres | Vrai si |
|---|---|---|
| `ALWAYS` | — | toujours |
| `RIDER_TOP_N` | `n` | le pilote porteur finit dans le top `n` de sa catégorie |
| `RIDER_DID_TECHNIQUE` | `technique` | le pilote porteur a réussi cette technique |
| `RIDER_CLEAN_MIN` | `min` | le pilote porteur a au moins `min` zones sans pénalité |
| `NATION_COUNT_IN_TOP` | `nation`, `category`, `top`, `min` | au moins `min` pilotes de `nation` dans le top `top` de `category` |
| `CATEGORY_WINNER_NATION` | `category`, `nation` | le vainqueur de `category` est de `nation` |
| `TEAM_BRAND_COUNT` | `brand`, `min` | au moins `min` pilotes de l'équipe roulent pour `brand` |
| `CATEGORY_WINNER_OUTSIDER` | `category`, `minCote` | le vainqueur de `category` a une cote ≥ `minCote` |

**Récompenses** :

| `type` | Paramètres | Effet |
|---|---|---|
| `FLAT_POINTS` | `value` | + `value` × multiplicateur de rareté |
| `RIDER_MULTIPLIER` | `value` (ex. 0.1) | points du pilote × (1 + `value` × mult.) |
| `CATEGORY_MULTIPLIER` | `category`, `value` | idem, sur les pilotes de l'équipe dans `category` |
| `TEAM_MULTIPLIER` | `value` | idem, sur toute l'équipe |

**Portée** : une carte pilote agit sur son pilote ; une technique sur le pilote auquel elle est attachée ; équipement et arbitre sur l'équipe.

**Ordre de calcul** (déterministe) :
1. Base de chaque pilote = points de classement × cote (inchangé).
2. Multiplicateurs pilote.
3. Multiplicateurs de catégorie.
4. Multiplicateur d'équipe.
5. Points fixes.

Les multiplicateurs d'une même étape s'additionnent avant d'être appliqués. Chaque effet déclenché est listé dans le détail du score : carte, rareté, libellé, points gagnés.

Exemple :
```json
{ "description": "+{value} pts si au moins 3 Français finissent dans le top 5 Seniors 20\"",
  "trigger": { "type": "NATION_COUNT_IN_TOP", "nation": "FRA", "category": "SENIOR_20", "top": 5, "min": 3 },
  "reward":  { "type": "FLAT_POINTS", "value": 40 } }
```

Un déclencheur ou une récompense inconnus sont ignorés (ils ne cassent pas le score) et signalés par un test de validation du catalogue.

## 4. Statistiques de course simulées

`scripts/gen-dev-seed.js` est étendu :
- chaque résultat de pilote gagne `techniques: string[]` et `cleanSections: number` ;
- chaque manche gagne `referee` (nom d'un arbitre du catalogue) ;
- chaque pilote de `riders.json` gagne `brand` ; les nations existent déjà ;
- trois légendes (`active: false`) sont ajoutées.

Génération déterministe, comme aujourd'hui.

## 5. Collection et économie — `src/engine/collection.js` (pur, RNG à graine)

```
state.collection = {
  owned: { [cardId]: { [rarity]: count } },
  fragments: number,
  pity: { E: number, L: number },   // packs ouverts depuis la dernière carte ≥ E / L
  lastPackDate: 'YYYY-MM-DD' | null,
  starterGiven: boolean
}
```

- **Pack de départ** (une fois) : 6 cartes pilotes Communes couvrant tous les emplacements (dont 2 Elite Femmes différentes), 3 techniques, 1 équipement.
- **Pack du jour** : disponible si `lastPackDate < now` (fonctionne avec la date simulée). Les packs ne s'accumulent pas. 5 cartes, au moins une Rare. La graine du tirage = hash de (`now`, nombre de packs ouverts).
- **Recycler** : un doublon (count > 1) rapporte des fragments selon sa rareté.
- **Fabriquer** : une carte et une rareté choisies, contre des fragments.

Actions du reducer : `OPEN_STARTER`, `OPEN_DAILY_PACK { now }`, `RECYCLE { cardId, rarity }`, `CRAFT { cardId, rarity }`. Chacune est refusée (état inchangé) si ses conditions ne sont pas remplies.

## 6. Composition d'équipe

```
Team = {
  slots: { [slotId]: { cardId, rarity, techniques: [{ cardId, rarity }] } },
  equipment: [{ cardId, rarity }],   // 0 à 2
  referee: { cardId, rarity } | null
}
```

Validation (`team.js`) :
- chaque emplacement contient une carte pilote possédée de la bonne catégorie ;
- nombre de techniques ≤ `techniquesByPilotRarity[rareté du pilote]` ;
- équipement et arbitre facultatifs, dans les limites de `balance.json` ;
- une même carte (`cardId` + rareté) n'est utilisée qu'une fois par équipe ;
- les cartes se réutilisent d'une manche à l'autre.

**Migration** : un état sauvegardé à l'ancien format (`picks` = riderIds) est converti : chaque pilote devient sa carte Commune de l'édition courante, et le joueur Démo reçoit une collection de départ qui couvre ses équipes passées.

**Rivaux** : ils jouent des cartes pilotes Communes, avec leurs effets, sans technique, équipement ni arbitre. Les ligues (spec suivante) ajusteront leur niveau.

## 7. Interface

- **Nouvel onglet 🃏 Collection** (5 onglets) : grille filtrable par type et par rareté, compteurs, cartes manquantes grisées, solde de fragments.
- Bouton **« Ouvrir le pack du jour »** → écran de révélation des 5 cartes. Désactivé avec « Prochain pack demain » si déjà ouvert.
- **Détail d'une carte** : description de l'effet à chaque rareté, exemplaires possédés, boutons **Fabriquer** et **Recycler**.
- **Compose** : choix parmi les cartes possédées de la catégorie ; ajout de techniques au pilote ; section équipe pour l'équipement et l'arbitre.
- **Résultat d'une manche** : le détail du score liste les effets déclenchés.
- **Règles** : section sur les cartes, raretés et packs.

## 8. Simulateur d'économie — `npm run sim:economy`

`scripts/sim-economy.js` lit `balance.json` et `cards.json`, simule 1 000 joueurs ouvrant un pack par jour pendant 365 jours (recyclage et fabrication inclus), et affiche le **nombre médian de jours pour posséder 50 % et 100 % de chaque rareté**. Il sert à vérifier les objectifs de rythme ci-dessus.

## 9. Contenu v1 (édition 2026)

- 40 cartes pilotes (une par pilote actif), dont certaines sans Légendaire ;
- 3 légendes ;
- 8 techniques, 8 équipements, 4 arbitres ;
- un effet par carte, avec sa description, couvrant chaque déclencheur et chaque récompense au moins une fois.

## 10. Documentation (tâches finales du plan)

- `docs/guide-joueur.md` : comment on joue (composer, score, saisons, collection, packs, fabrication). Écrit pour les joueurs.
- `docs/fonctionnalites.md` : descriptif des fonctionnalités, en distinguant **livré** et **prévu**. Écrit pour l'équipe et les futurs collaborateurs.

Les deux documents sont mis à jour à la fin de chaque EPIC.

## Tests

- Chaque déclencheur et chaque récompense, avec un cas vrai et un cas faux.
- Ordre de calcul des effets sur un exemple chiffré.
- Packs : taille, Rare garantie, probabilités (graine fixe), pity E et L.
- Descriptions : `{value}` remplacé selon la rareté (points et pourcentage).
- Renommage de la saison `2026-27` → `2026` et migration des anciens ids de manches.
- Fragments : recyclage, fabrication, refus si fonds insuffisants.
- Validation d'équipe contre la collection (carte non possédée, mauvaise catégorie, trop de techniques, carte en double).
- Migration de l'ancien format.
- Catalogue : chaque carte référence un sujet existant et n'utilise que des déclencheurs et récompenses connus.
- Intégration : ouvrir le pack du jour, composer avec une nouvelle carte, voir l'effet dans le résultat.

## Hors périmètre

- **Ligues** (spec suivante) : puissance de collection, paliers, rivaux par ligue.
- Packs gagnés (objectifs, résultats), rotation des collections par saison, animations élaborées.
- Corrections reportées de la relecture du menu (voir la spec du menu).
