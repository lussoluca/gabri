# AGENTS.md

Istruzioni per agenti di coding che lavorano su questo repository.

## Project Overview

Gabri è un'avventura grafica punta-e-clicca in stile Monkey Island che gira nel
browser. La storia è descritta come dati (YAML + Ink) e il motore resta
generico: aggiungere contenuti non richiede di toccare il codice.

**Tech stack:** Phaser 4 + TypeScript + Vite (gioco), Svelte 5 + Vite
(editor contenuti), Hono su Node + Firestore (API salvataggi), Ink/inkjs
(dialoghi), GitHub Actions + GitHub Pages (CI e deploy), Cloud Run (backend).

## Architettura

Monorepo npm workspaces: `frontend`, `backend`, `editor`.

```
content/  ──(scripts/build-content.mjs)──►  frontend/public/content/game.json  ──►  motore nel browser
   ▲                                                                                    │
   └───────────────  editor/ (legge/scrive content/ via GitHub API + PR)  ◄─────────────┘
```

- `content/` — la fonte di verità della storia. `rooms/*.yaml` (stanze:
  sfondo, hotspot, walkbox, `player_start`, `depth_scale`), `items.yaml`
  (oggetti inventario), `interactions.yaml` (regole
  `(verb, object?, target) + conditions -> actions`, vince la PRIMA che
  matcha: l'ordine è semantica), `dialogues/*.ink` (dialoghi Ink),
  `game.yaml` (stanza iniziale).
- `scripts/build-content.mjs` — compila `content/` (YAML + Ink) in un unico
  `game.json` servito al frontend. `frontend/public/content/` è generato e
  gitignorato: non committarlo mai.
- `frontend/` — il gioco. `src/engine/` è il motore puro (tipi in
  `types.ts`, regole/azioni/condizioni in `engine.ts`, pathfinding sui
  walkbox in `walk.ts`, salvataggi in `saves.ts`); `src/scenes/` le scene
  Phaser (Boot, Room, UI); `src/config.ts` le dimensioni (960x600, area
  stanza 960x440).
- `editor/` — editor online dei contenuti (Svelte 5, runes). Legge
  `content/` dal repo GitHub e salva su branch `editor/*` + Pull Request
  (Git Data API, PAT dell'utente in localStorage). Importa i tipi del motore
  via alias `@game` → `frontend/src`. Il vocabolario di azioni/condizioni in
  `editor/src/vocab.ts` deve restare allineato a `frontend/src/engine/engine.ts`.
- `backend/` — API salvataggi (`GET/PUT /api/saves/:slot`). Firestore su
  Cloud Run, mappa in memoria in locale. Nessuna autenticazione: non esporlo
  pubblicamente così com'è.

Convenzione linguistica dei contenuti: identificatori, chiavi dello schema,
flag e verbi in inglese; i testi mostrati al giocatore in italiano.

## Setup

Sviluppo locale, niente Docker per il lavoro quotidiano (il Dockerfile serve
solo al deploy del backend su Cloud Run).

```bash
npm install
npm run dev:backend    # API su :8080
npm run dev:frontend   # compila i contenuti e avvia Vite su :5173
npm run dev:editor     # editor contenuti su :5174
```

Dopo ogni modifica manuale a `content/`: `npm run content` (o
`npm run content:watch`).

## Key Conventions

- Il motore resta generico: la logica di gioco vive in `content/`, non nel
  codice. Se una feature richiede codice nuovo, estendi il motore in modo
  data-driven.
- Le regole in `interactions.yaml` sono valutate in ordine: le regole
  condizionate vanno PRIMA dei default.
- I tag Ink (`# set_flag: nome = valore`) vengono eseguiti come azioni del
  motore.
- Commenti e prose in italiano, codice e identificatori in inglese.
- Non modificare a mano `frontend/public/content/` né le directory `dist/`.

## Git Workflow

### Commit

[Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
`<type>(<scope>): <description>` — tipi: `feat`, `fix`, `refactor`, `docs`,
`test`, `chore`, `ci`, `perf`, `build`. Descrizione minuscola, imperativa,
senza punto finale. Ogni commit assistito da AI include il trailer
`Assisted-by: <modello>`.

### Branch

- Prefissi: `feat/`, `fix/`, `chore/`, `docs/` + descrizione kebab-case.
- I branch `editor/*` sono riservati all'editor online: li crea lui con le
  relative PR; non usarli per lavoro manuale.
- Attenzione: ogni push su `main` fa partire il deploy su GitHub Pages.
  Per lavoro non banale apri una PR (la CI builda frontend, backend ed
  editor).

### Rebase

- Rebase su `main` prima del push, niente merge commit.
- Dopo un rebase: `--force-with-lease`, mai `--force`.

## Package Management

### Node (npm workspaces)

- Aggiungere una dipendenza: `npm install <package> --workspace <frontend|backend|editor>`
- Dev dependency: `npm install --save-dev <package> --workspace <...>`
- Il lockfile è unico alla root: committare sempre `package-lock.json`
  aggiornato dopo ogni modifica ai manifest.

### Dependency Safety

Prima di aggiungere o aggiornare qualsiasi dipendenza:

1. **Mai assumere di conoscere l'ultima versione.** Verifica sempre sul
   registry:

   ```bash
   curl -s https://registry.npmjs.org/<package>/latest | jq '{version: .version, engines: .engines}'
   ```

2. Usa la major stabile più recente compatibile col runtime (Node 22 in CI,
   controlla `engines.node`).
3. Evita release pubblicate negli ultimi 5 giorni (rischio supply chain).
4. Rigenera sempre il lockfile dopo aver toccato un manifest e installa dal
   lock.

## Testing

Non esiste una test suite. I check equivalenti alla CI, da eseguire prima di
committare:

```bash
npm run content                                   # i contenuti compilano
cd frontend && npx tsc --noEmit && npx vite build
cd backend && npx tsc
cd editor && npx svelte-check --tsconfig ./tsconfig.json && npx vite build
```

Per verifiche manuali nel browser è disponibile `playwright-cli`; il gioco
espone `window.__engine` / `window.__game` come hook di debug.

## CI/CD

GitHub Actions:

| Workflow    | Trigger                 | Cosa fa                                                                                                         |
| ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ci.yml`    | push su `main`, ogni PR | `npm run content`, typecheck + build di frontend/backend/editor, build immagine Docker del backend (senza push) |
| `pages.yml` | push su `main`          | builda gioco (`--base=/gabri/`) ed editor (`--base=/gabri/editor/`) e deploya su GitHub Pages                   |

Deploy: gioco su `https://lussoluca.github.io/gabri/`, editor su
`https://lussoluca.github.io/gabri/editor/`. Il backend si builda con
`docker build -f backend/Dockerfile .` (target `linux/amd64`) e si deploya a
mano su Cloud Run.

## Command Safety

### Sicuri (esegui liberamente)

`npm run content`, `npm run dev:*`, `npx tsc --noEmit`, `npx svelte-check`,
`npx vite build`, `git status`, `git log`, `git diff`.

### Pericolosi (chiedi prima)

`npm install` con modifiche ai manifest, `git push`, `docker build`, deploy
su Cloud Run, qualsiasi scrittura via GitHub API verso il repo.

### Distruttivi (mai)

`rm -rf`, `git push --force`, cancellazione di branch remoti non `editor/*`,
cancellazione di dati Firestore.

## Important Rules

- L'ordine delle regole in `interactions.yaml` è semantica: non riordinarle
  senza motivo.
- Non committare `frontend/public/content/` o `dist/`.
- Ogni push su `main` deploya su Pages: assicurati che la build passi prima.
- `editor/src/vocab.ts` e `frontend/src/engine/engine.ts` devono restare
  allineati quando si aggiungono azioni o condizioni.
- Verifica le versioni delle dipendenze sul registry, mai a memoria.
- Conventional commits con trailer `Assisted-by` per il lavoro assistito da AI.
