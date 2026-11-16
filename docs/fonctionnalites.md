# Fonctionnalités — Super Fantasy Bike Trial

Mis à jour à la fin de chaque EPIC. Données simulées et locales (pas de serveur).

## Livré

| Domaine | Fonctionnalité |
|---|---|
| Équipe | 6 emplacements typés, cartes pilotes possédées, techniques par pilote selon la rareté, 2 équipements, 1 arbitre |
| Score | points de classement × cote, puis effets de cartes dans un ordre fixe, détail des effets déclenchés |
| Effets | 8 déclencheurs (toujours, top N, technique réussie, zones sans pénalité, nation dans le top, vainqueur d'une nation, marque dans l'équipe, vainqueur outsider), 4 récompenses (points fixes, multiplicateur pilote, catégorie, équipe), description affichée avec la valeur selon la rareté |
| Collection | 4 types, 4 raretés, grille filtrable, cartes manquantes grisées, fiche de carte |
| Packs | pack de départ, pack du jour (5 cartes, une Rare garantie), garanties Épique (10 packs) et Légendaire (60 packs) |
| Économie | recyclage des doublons en fragments, fabrication d'une carte choisie, simulateur `npm run sim:economy` |
| Saisons | saisons annuelles pilotées par les dates, verrouillage au départ, résultats à l'arrivée, archivage, date simulée pour tester |
| Rivaux | 10 rivaux (favoris, équilibrés, outsiders, aléatoires) jouant des cartes Communes |
| Navigation | onglets Jouer, Collection, Classement, Historique, Règles & profil |
| Données | catalogue `cards.json` (63 cartes, édition 2026), équilibrage `balance.json`, statistiques de course simulées |

## Prévu

| Domaine | Fonctionnalité |
|---|---|
| Ligues | séparer les joueurs selon la puissance de leur collection, rivaux par ligue |
| Packs gagnés | packs en récompense d'objectifs et de résultats |
| Saisons | nouvelles éditions de cartes chaque saison, rotation des collections |
| Administration | outil pour ajouter compétitions et manches, corriger les résultats |
| En ligne | comptes, sauvegarde serveur, vraies données UCI |
| Menu | corrections reportées de la relecture (voir la spec du menu) |
