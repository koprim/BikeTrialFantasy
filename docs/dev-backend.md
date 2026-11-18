# Backend local (Supabase)

CLI : `supabase` 3.2.0 (devDependency, version exacte, lancee via `npx supabase ...`).
Les images Docker sont tirees depuis public.ecr.aws / ghcr.io / Docker Hub.

## Moteur de conteneurs

### Podman (voie preferee)

```powershell
podman machine init     # premiere fois
podman machine start
$env:DOCKER_HOST = 'npipe:////./pipe/podman-machine-default'
npx supabase start
```

Sur cette machine : `podman 5.6.2` est installe mais `podman machine list` echoue avec
`Error: hyperv machines require admin authority` (machine Hyper-V : il faut un terminal
administrateur, ou `$env:CONTAINERS_MACHINE_PROVIDER='wsl'` pour utiliser WSL).

### Docker Desktop (repli)

```powershell
Remove-Item Env:DOCKER_HOST -ErrorAction SilentlyContinue
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
docker info             # attendre que le serveur reponde
npx supabase start
```

Sur cette machine : Docker 29.1.3 demarre, mais le premier `supabase start` (tirage des images,
plusieurs Go) a rempli le disque C: (1 Go libre) : `input/output error` pendant le pull puis
`Docker Desktop is unable to start` (distro WSL `docker-desktop` arretee). Liberer au moins
~10 Go sur C: (ou deplacer le disque virtuel Docker Desktop) avant de relancer.

Resolu le 2026-11-18 : disque virtuel deplace sur `F:\Docker` (Settings -> Resources ->
Advanced -> Disk image location). La stack demarre avec Docker Desktop 29.

### Images corrompues (`unable to find user nobody`, `exit 125`)

Les images tirees pendant la panne de disque peuvent etre incompletes : taille annoncee
normale mais fichiers vides (`/etc/passwd` a 0 octet). Symptome : `supabase start` echoue a
`Initialising schema...` avec `unable to find user nobody` ou `exec format error`.
Correctif : supprimer les images `public.ecr.aws/supabase/*` (`docker rmi ...`) et relancer
`npx supabase start`, qui les retelecharge.

Note : `~/.bashrc` contient `alias docker=podman` ; dans Git Bash, `docker` vise donc Podman.
Le CLI Supabase appelle `docker.exe` directement et n'est pas concerne.

## Commandes

```powershell
npx supabase start      # demarre la stack (URL API http://127.0.0.1:54321)
npx supabase status     # URLs et cles (-o json pour les scripts)
npx supabase stop       # arrete la stack
npx supabase db reset   # reapplique les migrations + seed
```

`supabase/config.toml` : auth anonyme activee, `analytics` desactive (le conteneur de logs
demande le socket Docker, incompatible Podman).

## Fichiers d'environnement

- `.env.example` -> copier en `.env.local` (charge par Expo, ignore par git).
- `supabase/functions/.env.example` -> copier en `supabase/functions/.env`.
- Coller l'anon key de `npx supabase status` dans `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

## Edge Functions

Les 6 fonctions (`open-starter`, `open-daily-pack`, `recycle`, `craft`, `save-team`,
`set-simulated-date`) sont des points d'entree d'une ligne (`serve('<nom>')` dans
`supabase/functions/_shared/serve.ts`). Elles importent `supabase/functions/_shared/backend.mjs`,
bundle genere par esbuild depuis `src/backend` + `src/engine` (source unique, jamais copiee).
`backend.mjs` est ignore par git : `npm run build:edge` le regenere (appele par `functions:serve`).

```powershell
Copy-Item supabase\functions\.env.example supabase\functions\.env   # premiere fois
npm run functions:serve    # build:edge puis supabase functions serve (long, laisser tourner)
npm run test:functions     # tests *.fn.test.js contre les fonctions servies
```

Deploiement : `npm run functions:deploy` (= `npm run build:edge && supabase functions deploy`).

Variables (`supabase/functions/.env`) : `PACK_TIMEZONE`, `ALLOW_SIMULATED_DATE`. `SUPABASE_URL` et
`SUPABASE_SERVICE_ROLE_KEY` sont injectees par la plateforme.

Auth : `verify_jwt` reste actif (defaut). Sans en-tete Authorization, la passerelle (Kong) repond
401 `UNAUTHORIZED_NO_AUTH_HEADER` ; avec un JWT sans utilisateur (cle anon), notre authentificateur
repond 401 `UNAUTHENTICATED`.

## App contre Supabase

`EXPO_PUBLIC_BACKEND` choisit l'adaptateur (`src/data/api/index.js`) : `supabase` utilise le
serveur ; toute autre valeur (ou absente) lance le mode demo, local, sans serveur.

```powershell
npx supabase start                       # si la stack ne tourne pas deja
npx supabase db reset                    # schema + catalogue a jour
Copy-Item .env.example .env.local        # premiere fois, puis editer (voir ci-dessous)
npm run functions:serve                  # terminal separe, laisser tourner
npx expo start --web --port 8081         # 8081 = URL de redirection autorisee par config.toml
```

`.env.local` :

```
EXPO_PUBLIC_BACKEND=supabase
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY de npx supabase status -o env>
EXPO_PUBLIC_ALLOW_SIMULATED_DATE=true    # optionnel : date simulee dans Regles & profil
```

Expo inline ces variables au demarrage : relancer `expo start` (avec `--clear`) apres modification.
Si `EXPO_PUBLIC_BACKEND=supabase` sans URL ou cle, l'app leve une erreur explicite au demarrage.

Au premier lancement l'app ouvre une session anonyme (compte invite). Les liens magiques de
« Sauvegarder mon compte » et « J'ai deja un compte » ne partent pas par e-mail reel : les lire
dans Mailpit (`MAILPIT_URL` de `supabase status`, http://127.0.0.1:54324) et ouvrir le lien dans le
meme navigateur.

## CI

`.github/workflows/ci.yml` : job `checks` (lint, format:check, jest) et job `backend` (stack Supabase
sans les services inutiles, `test:int`, fonctions servies, `test:functions`).
