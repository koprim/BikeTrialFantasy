# Super Fantasy Bike Trial

A game inspired from others super fantasy game in bike trial context.

## Langues

Le jeu existe en français, anglais et espagnol (interface et textes de jeu). La langue est détectée au premier lancement puis modifiable dans Règles ; la page `/regles/infos` montre la part traduite de chaque langue.

- **Registre** : `src/i18n/languages.js` est le seul fichier qui déclare les langues.
- **Textes** : un dossier par langue, `src/i18n/locales/<code>/ui.json` (interface) et `game.json` (cartes, effets, saisons, manches).
- **Français** : `fr/game.json` est généré par `npm run gen:seed` / `npm run build:seed`. Pour changer un texte de carte, de saison ou de manche en français, modifier les générateurs puis relancer ces commandes, jamais le fichier à la main.
- **Anglais et espagnol** : écrits à la main. Ce sont des brouillons, à faire relire par un locuteur natif.

### Ajouter une langue (exemple : allemand)

1. Copier `src/i18n/locales/fr/` vers `src/i18n/locales/de/` et traduire, même partiellement (une clé manquante s'affiche en anglais).
2. Ajouter la ligne `de` dans `src/i18n/languages.js`.
3. `npm run i18n:report` pour voir ce qui manque ; `npm run build:sql-seed` pour régénérer `supabase/seed.sql`.

Limite connue : les valeurs des effets s'écrivent avec une virgule décimale dans toutes les langues (`formatValue`, dans le moteur).
