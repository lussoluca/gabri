<script lang="ts">
  import type { GameContent } from '@game/engine/types'
  import { getFileDataUrl } from '../github/api'
  import { BG_PREFIX } from '../github/contentRepo'
  import { availableBgFiles, knownFlags, store } from '../state/store.svelte'

  const project = $derived(store.project!)

  let roomId = $state('')
  $effect(() => {
    if (!roomId) roomId = project.game.start.room || (project.rooms[0]?.id ?? '')
  })

  // 'unset' = il flag parte non impostato, come in una partita nuova.
  let flagValues = $state<Record<string, 'unset' | 'true' | 'false'>>({})
  let inventory = $state<Record<string, boolean>>({})

  let starting = $state(false)
  let error = $state('')
  let running = $state(false)
  let iframeEl = $state<HTMLIFrameElement | null>(null)
  let payload: Record<string, unknown> | null = null

  // In produzione il gioco è pubblicato un livello sopra l'editor
  // (/gabri/ vs /gabri/editor/); in dev gira sul suo dev server.
  const gameUrl = import.meta.env.DEV
    ? 'http://localhost:5173/?preview=1'
    : new URL('..', window.location.href).toString() + '?preview=1'

  function mimeOf(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'svg') return 'image/svg+xml'
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'webp') return 'image/webp'
    return 'image/png'
  }

  // Il gioco in preview chiede i contenuti con 'gabri-preview-ready':
  // risponde sia al primo avvio sia ai riavvii (reload dell'iframe).
  $effect(() => {
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | undefined)?.type !== 'gabri-preview-ready') return
      if (payload && iframeEl?.contentWindow) {
        iframeEl.contentWindow.postMessage(payload, '*')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  })

  async function buildPayload(): Promise<Record<string, unknown>> {
    // Contenuti nello stesso formato di scripts/build-content.mjs.
    const snapshot = $state.snapshot(project)
    const dialogues: Record<string, unknown> = {}
    if (snapshot.dialogues.length > 0) {
      const mod = await import('inkjs/full')
      for (const dialogue of snapshot.dialogues) {
        const story = new mod.Compiler(dialogue.source).Compile()
        const json = story.ToJson()
        if (!json) throw new Error(`Dialogo "${dialogue.name}": compilazione Ink fallita`)
        dialogues[dialogue.name] = JSON.parse(json)
      }
    }
    const content: GameContent = {
      start: { room: roomId },
      rooms: Object.fromEntries(snapshot.rooms.map((r) => [r.id, r])),
      items: Object.fromEntries(snapshot.items.map((i) => [i.id, i])),
      interactions: snapshot.rules,
      dialogues,
    }

    const backgrounds: Record<string, string> = {}
    const wanted = new Set(
      snapshot.rooms.map((r) => r.background).filter((b): b is string => Boolean(b)),
    )
    const ref = store.source!.saveBranch ?? store.source!.ref
    for (const name of wanted) {
      const upload = store.bg.uploads[name]
      if (upload) {
        backgrounds[name] = `data:${upload.mime};base64,${upload.base64}`
        continue
      }
      if (!availableBgFiles().includes(name)) continue
      backgrounds[name] = await getFileDataUrl(store.config, ref, BG_PREFIX + name, mimeOf(name))
    }

    const flags: Record<string, boolean> = {}
    for (const [name, value] of Object.entries(flagValues)) {
      if (value === 'true') flags[name] = true
      if (value === 'false') flags[name] = false
    }
    const state = {
      room: roomId,
      inventory: Object.keys(inventory).filter((id) => inventory[id]),
      flags,
    }

    return { type: 'gabri-preview', content, backgrounds, state }
  }

  async function start() {
    starting = true
    error = ''
    try {
      payload = await buildPayload()
      running = true
    } catch (e) {
      error = String(e instanceof Error ? e.message : e)
    } finally {
      starting = false
    }
  }

  async function restart() {
    if (!iframeEl) return
    payload = await buildPayload()
    // Il reload fa ripartire l'handshake gabri-preview-ready.
    iframeEl.src = gameUrl
  }

  function close() {
    running = false
    payload = null
    store.ui.playOpen = false
  }
</script>

<div class="dialog-backdrop">
  {#if !running}
    <div class="dialog">
      <h1>Prova la partita</h1>
      <p class="note">
        Simula il gioco con i contenuti correnti dell'editor (ramo
        <code>{store.source?.saveBranch ?? store.source?.ref}</code>, incluse le modifiche non
        salvate).
      </p>

      <label for="play-room">Stanza di partenza</label>
      <select id="play-room" bind:value={roomId}>
        {#each project.rooms as room (room.id)}
          <option value={room.id}>{room.id} — {room.name}</option>
        {/each}
      </select>

      {#if knownFlags().length > 0}
        <span class="field-label">Variabili iniziali</span>
        {#each knownFlags() as name (name)}
          <div class="kv-row" style="align-items: center">
            <code style="width: 160px; flex: none">{name}</code>
            <select
              style="width: 140px"
              value={flagValues[name] ?? 'unset'}
              onchange={(e) => (flagValues[name] = e.currentTarget.value as 'unset' | 'true' | 'false')}
            >
              <option value="unset">non impostata</option>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
        {/each}
      {/if}

      {#if project.items.length > 0}
        <span class="field-label">Inventario iniziale</span>
        {#each project.items as item (item.id)}
          <label style="display: flex; align-items: center; gap: 6px; margin: 2px 0">
            <input
              type="checkbox"
              style="width: auto"
              checked={inventory[item.id] ?? false}
              onchange={(e) => (inventory[item.id] = e.currentTarget.checked)}
            />
            <code>{item.id}</code> — {item.name}
          </label>
        {/each}
      {/if}

      {#if error}
        <p class="error-text">{error}</p>
      {/if}

      <div class="actions">
        <button onclick={close}>Annulla</button>
        <button class="primary" disabled={starting || !roomId} onclick={start}>
          {starting ? 'Preparo…' : '▶ Avvia'}
        </button>
      </div>
    </div>
  {:else}
    <div class="play-frame">
      <div class="toolbar" style="padding: 8px">
        <strong>Prova — {roomId}</strong>
        <span class="spacer" style="flex: 1"></span>
        <button onclick={restart}>⟲ Riavvia</button>
        <button onclick={close}>✕ Chiudi</button>
      </div>
      <iframe bind:this={iframeEl} src={gameUrl} title="Anteprima del gioco"></iframe>
    </div>
  {/if}
</div>
