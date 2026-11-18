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
