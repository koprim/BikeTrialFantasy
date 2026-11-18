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

A completer par les taches suivantes.

## App contre Supabase

A completer par les taches suivantes.
