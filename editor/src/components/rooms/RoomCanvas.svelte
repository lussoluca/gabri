<script lang="ts">
  import type { Rect, Room } from '@game/engine/types'
  import { getFileBlobUrl } from '../../github/api'
  import { BG_PREFIX } from '../../github/contentRepo'
  import { store } from '../../state/store.svelte'
  import { GAME_WIDTH, ROOM_HEIGHT } from '../../vocab'
  import RectBox from './RectBox.svelte'

  export type Mode = 'select' | 'hotspot' | 'walkbox' | 'start'
  export type Selection = { kind: 'hotspot' | 'walkbox'; index: number } | null

  interface Props {
    room: Room
    mode: Mode
    layers: { hotspots: boolean; walkboxes: boolean; depth: boolean }
    selection: Selection
    onselect: (sel: Selection) => void
  }

  let { room, mode, layers, selection, onselect }: Props = $props()

  let wrapper = $state<HTMLDivElement | null>(null)
  let stage = $state<HTMLDivElement | null>(null)
  let k = $state(1)
  let bgUrl = $state<string | null>(null)
  let rubber = $state<Rect | null>(null)

  $effect(() => {
    if (!wrapper) return
    const el = wrapper
    const obs = new ResizeObserver(() => {
      k = Math.max(0.2, el.clientWidth / GAME_WIDTH)
    })
    obs.observe(el)
    return () => obs.disconnect()
  })

  // Cache dei blob URL degli sfondi per ref+file (i blob URL restano validi
  // per tutta la sessione della pagina).
  const bgCache = new Map<string, string>()

  $effect(() => {
    const background = room.background
    bgUrl = null
    if (!background || !store.source) return
    // Sfondo caricato nell'editor ma non ancora committato: data URL diretto.
    const upload = store.bg.uploads[background]
    if (upload) {
      bgUrl = `data:${upload.mime};base64,${upload.base64}`
      return
    }
    if (store.bg.deletes.includes(background)) return
    const ref = store.source.saveBranch ?? store.source.ref
    const key = `${ref}:${background}`
    const cached = bgCache.get(key)
    if (cached) {
      bgUrl = cached
      return
    }
    const ext = background.split('.').pop() ?? ''
    const mime =
      ext === 'svg' ? 'image/svg+xml' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
    getFileBlobUrl(store.config, ref, BG_PREFIX + background, mime)
      .then((url) => {
        bgCache.set(key, url)
        if (room.background === background) bgUrl = url
      })
      .catch(() => {
        // sfondo mancante sul ref: resta il colore della stanza
      })
  })

  function toGame(e: PointerEvent): [number, number] {
    const rect = stage!.getBoundingClientRect()
    const x = Math.round((e.clientX - rect.left) / k)
    const y = Math.round((e.clientY - rect.top) / k)
    return [
      Math.max(0, Math.min(GAME_WIDTH, x)),
      Math.max(0, Math.min(ROOM_HEIGHT, y)),
    ]
  }

  function nextHotspotId(): string {
    let n = room.hotspots.length + 1
    while (room.hotspots.some((h) => h.id === `hotspot_${n}`)) n += 1
    return `hotspot_${n}`
  }

  function onStagePointerDown(e: PointerEvent) {
    if (e.button !== 0 || !stage) return
    if (mode === 'start') {
      room.player_start = toGame(e)
      return
    }
    if (mode === 'select') {
      onselect(null)
      return
    }
    // Modalità disegno: rubber band per un nuovo hotspot/walkbox.
    const [x0, y0] = toGame(e)
    rubber = [x0, y0, 0, 0]
    const onMove = (ev: PointerEvent) => {
      const [x1, y1] = toGame(ev)
      rubber = [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)]
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      const r = rubber
      rubber = null
      if (!r || r[2] < 8 || r[3] < 8) return
      if (mode === 'hotspot') {
        room.hotspots.push({ id: nextHotspotId(), name: 'Nuovo hotspot', rect: r })
        onselect({ kind: 'hotspot', index: room.hotspots.length - 1 })
      } else {
        room.walkboxes = [...(room.walkboxes ?? []), r]
        onselect({ kind: 'walkbox', index: room.walkboxes.length - 1 })
      }
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  function startGuideDrag(e: PointerEvent, which: 'min_y' | 'max_y') {
    if (e.button !== 0 || !room.depth_scale) return
    e.stopPropagation()
    const ds = room.depth_scale
    const start = ds[which]
    const sy = e.clientY
    const onMove = (ev: PointerEvent) => {
      ds[which] = Math.max(0, Math.min(ROOM_HEIGHT, Math.round(start + (ev.clientY - sy) / k)))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
</script>

<div class="canvas-wrap" bind:this={wrapper} style="height: {ROOM_HEIGHT * k}px">
  <!-- svelte-ignore a11y_no_static_element_interactions -- superficie di disegno col mouse, gli stessi valori sono editabili da form -->
  <div
    class="stage"
    bind:this={stage}
    style="width: {GAME_WIDTH}px; height: {ROOM_HEIGHT}px; transform: scale({k}); background: {room.color ??
      '#000'}"
    onpointerdown={onStagePointerDown}
  >
    {#if bgUrl}
      <img class="bg" src={bgUrl} alt="" draggable="false" />
    {/if}

    {#if layers.walkboxes}
      {#each room.walkboxes ?? [] as box, i (i)}
        <RectBox
          rect={box}
          kind="walkbox"
          label={selection?.kind === 'walkbox' && selection.index === i ? `walkbox #${i + 1}` : undefined}
          selected={selection?.kind === 'walkbox' && selection.index === i}
          {k}
          onselect={() => onselect({ kind: 'walkbox', index: i })}
          onchange={(rect) => {
            room.walkboxes![i] = rect
          }}
        />
      {/each}
    {/if}

    {#if layers.hotspots}
      {#each room.hotspots as hotspot, i (i)}
        <RectBox
          rect={hotspot.rect}
          kind="hotspot"
          label={hotspot.id}
          selected={selection?.kind === 'hotspot' && selection.index === i}
          {k}
          onselect={() => onselect({ kind: 'hotspot', index: i })}
          onchange={(rect) => {
            hotspot.rect = rect
          }}
        />
      {/each}
    {/if}

    {#if layers.depth && room.depth_scale}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="depth-guide"
        style="top: {room.depth_scale.min_y}px"
        onpointerdown={(e) => startGuideDrag(e, 'min_y')}
      >
        <span class="tag">min_y · scala {room.depth_scale.min}</span>
      </div>
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="depth-guide"
        style="top: {room.depth_scale.max_y}px"
        onpointerdown={(e) => startGuideDrag(e, 'max_y')}
      >
        <span class="tag">max_y · scala {room.depth_scale.max}</span>
      </div>
    {/if}

    {#if room.player_start}
      <div
        class="start-marker"
        style="left: {room.player_start[0]}px; top: {room.player_start[1]}px"
        title="player_start"
      ></div>
    {/if}

    {#if rubber}
      <div
        class="rubber"
        style="left:{rubber[0]}px;top:{rubber[1]}px;width:{rubber[2]}px;height:{rubber[3]}px"
      ></div>
    {/if}
  </div>
</div>
