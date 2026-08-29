# Gabri

Avventura grafica punta-e-clicca in stile Monkey Island. Phaser 4 nel browser,
backend su Cloud Run per i salvataggi, storia descritta in YAML + Ink.

## Struttura

- `content/` — la storia: stanze, oggetti, interazioni (YAML) e dialoghi (Ink).
  Si scrive solo qui, il motore resta generico.
- `frontend/` — Phaser 4 + TypeScript + Vite. `src/engine/` è il motore
  (stato, regole, salvataggi), `src/scenes/` le scene Phaser.
- `backend/` — API salvataggi (Hono su Node). Firestore su Cloud Run,
  mappa in memoria in locale.
- `editor/` — editor online dei contenuti (Svelte 5 + Vite). Legge `content/`
  da GitHub e salva le modifiche aprendo una Pull Request; pubblicato su
  GitHub Pages sotto `/editor/`.
- `scripts/build-content.mjs` — compila `content/` in
  `frontend/public/content/game.json` (compila anche i file `.ink`).

## Avvio

```bash
npm install
npm run dev:backend    # API su :8080
npm run dev:frontend   # compila i contenuti e avvia Vite su :5173
```

Vite fa da proxy di `/api` verso il backend locale.

## Editor dei contenuti

`npm run dev:editor` avvia l'editor su :5174 (in produzione:
`https://lussoluca.github.io/gabri/editor/`). L'editor lavora direttamente
sul repository GitHub: legge `content/` da `main` (o da un branch `editor/*`
con PR aperta) e ogni salvataggio crea un commit su un branch `editor/*` con
relativa Pull Request. Serve un fine-grained PAT con permessi
Contents: Read/Write e Pull requests: Read/Write su questo repository; il
token resta nel localStorage del browser.

Cosa si edita: stanze su canvas visuale (hotspot, walkbox, player_start,
guide `depth_scale` trascinabili), oggetti dell'inventario, regole di
interazione (con riordino: vince la prima che matcha), dialoghi Ink con
preview giocabile, variabili di gioco e sfondi delle stanze
(caricamento/sostituzione dei file in `frontend/public/bg/`). Un pannello di validazione segnala riferimenti rotti e
regole irraggiungibili; gli errori bloccano il salvataggio (con override).
I file YAML riscritti dall'editor perdono i commenti; i file non toccati
non vengono riscritti.

## Modello dati della storia

Il modello segue SCUMM: l'input del giocatore è sempre una tripla
`(verb, object?, target)`. Verbi: `look`, `take`, `use`, `talk`, `walk`.

Convenzione linguistica: identificatori, chiavi dello schema, flag e nomi dei
verbi in inglese; i testi mostrati al giocatore (`say`, `name`, `description`,
etichette dei verbi in interfaccia) in italiano.

- **Stanza** (`content/rooms/*.yaml`): sfondo, hotspot cliccabili con
  rettangolo, descrizione, eventuale uscita (`leads_to`). `walkboxes` è la
  lista dei rettangoli calpestabili: il personaggio si muove solo lì dentro e
  il percorso tra box adiacenti viene calcolato automaticamente (BFS sul
  grafo di adiacenza, waypoint sui bordi condivisi). `depth_scale` scala il
  personaggio in base alla profondità (più in alto = più lontano = più
  piccolo). Senza `walkboxes` il movimento è libero in orizzontale.
- **Oggetti** (`content/items.yaml`): gli oggetti raccoglibili dell'inventario.
- **Variabili** (`content/variables.yaml`): registro dei flag di gioco con
  descrizione, usato dall'editor per le tendine. Il motore lo ignora: i flag
  nascono comunque al primo `set_flag`.
- **Interazioni** (`content/interactions.yaml`): regole
  `verb + object? + target + conditions -> actions`. Vince la prima regola che
  matcha, quindi le regole condizionate vanno prima dei default. Azioni
  disponibili: `say`, `set_flag`, `add_item`, `remove_item`, `goto_room`,
  `dialogue`.
- **Dialoghi** (`content/dialogues/*.ink`): scritti in
  [Ink](https://www.inklestudios.com/ink/), eseguiti nel browser con `inkjs`.
  Un tag Ink come `# set_flag: indizio = true` viene eseguito come azione del
  motore.
- **Stato di gioco** (ciò che viene salvato): stanza corrente, inventario e
  flag. Un solo oggetto JSON.

Dopo ogni modifica ai contenuti: `npm run content` (il task `dev:frontend` lo
esegue già all'avvio).

## Deploy

- **Frontend**: `npm run build`, poi pubblica `frontend/dist/` su Firebase
  Hosting o un bucket GCS.
- **Backend**: `docker build -f backend/Dockerfile -t gabri-backend .` dal root
  del repo (piattaforma target: `linux/amd64`), poi deploy su Cloud Run. Su
  Cloud Run usa Firestore (collezione `saves`); serve un service account con
  ruolo `datastore.user`.

Il backend non ha autenticazione: prima di esporlo pubblicamente aggiungere
Firebase Auth (o simile) e legare gli slot di salvataggio all'utente.

## Demo inclusa

Tre stanze (molo, città, magazzino) e un puzzle: parla con la vedetta per
avere l'indizio, guarda il barile per trovare la chiave, usa la chiave sulla
porta del magazzino, prendi il tesoro.
