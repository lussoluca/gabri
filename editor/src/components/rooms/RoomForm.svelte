<script lang="ts">
  import type { Room } from '@game/engine/types'
  import { store } from '../../state/store.svelte'
  import { ROOM_HEIGHT } from '../../vocab'

  interface Props {
    room: Room
    ondelete: () => void
  }

  let { room, ondelete }: Props = $props()

  // L'id si applica esplicitamente: rinominarlo cambia il file della stanza
  // (il vecchio path viene cancellato nel commit) e va tenuto in sync con la
  // selezione corrente.
  let idDraft = $state('')
  $effect(() => {
    idDraft = room.id
  })

  function applyId() {
    const next = idDraft.trim()
    if (!next || next === room.id) return
    room.id = next
    store.ui.selectedRoom = next
  }

  const hasDepth = $derived(Boolean(room.depth_scale))

  function toggleDepth(enabled: boolean) {
    if (enabled) {
      room.depth_scale = { min_y: Math.round(ROOM_HEIGHT * 0.7), max_y: ROOM_HEIGHT, min: 0.75, max: 1 }
    } else {
      delete room.depth_scale
    }
  }

  function toggleStart(enabled: boolean) {
    if (enabled) {
      room.player_start = [100, ROOM_HEIGHT - 40]
    } else {
      delete room.player_start
    }
  }
</script>

<h2>Stanza</h2>

<label for="room-id">Id (nome file)</label>
<div style="display: flex; gap: 6px">
  <input
    id="room-id"
    value={idDraft}
    autocapitalize="none"
    autocorrect="off"
    spellcheck="false"
    oninput={(e) => (idDraft = e.currentTarget.value.toLowerCase())}
    onblur={applyId}
    onkeydown={(e) => e.key === 'Enter' && applyId()}
  />
</div>

<label for="room-name">Nome</label>
<input id="room-name" bind:value={room.name} />

<label for="room-color">Colore di fondo</label>
<input id="room-color" bind:value={room.color} placeholder="#1d3a4a" />

<label for="room-bg">Sfondo (frontend/public/bg/)</label>
<select
  id="room-bg"
  value={room.background ?? ''}
  onchange={(e) => {
    const v = e.currentTarget.value
    if (v) room.background = v
    else delete room.background
  }}
>
  <option value="">— nessuno —</option>
  {#each store.source?.bgFiles ?? [] as file (file)}
    <option value={file}>{file}</option>
  {/each}
</select>

<label style="display: flex; align-items: center; gap: 6px; margin-top: 10px">
  <input
    type="checkbox"
    style="width: auto"
    checked={Boolean(room.player_start)}
    onchange={(e) => toggleStart(e.currentTarget.checked)}
  />
  player_start (posizionabile con lo strumento «Start»)
</label>
{#if room.player_start}
  <div class="grid-2">
    <div>
      <label for="start-x">x</label>
      <input id="start-x" type="number" bind:value={room.player_start[0]} />
    </div>
    <div>
      <label for="start-y">y</label>
      <input id="start-y" type="number" bind:value={room.player_start[1]} />
    </div>
  </div>
{/if}

<label style="display: flex; align-items: center; gap: 6px; margin-top: 10px">
  <input
    type="checkbox"
    style="width: auto"
    checked={hasDepth}
    onchange={(e) => toggleDepth(e.currentTarget.checked)}
  />
  depth_scale (scala prospettica)
</label>
{#if room.depth_scale}
  <div class="grid-2">
    <div>
      <label for="ds-miny">min_y (fondo scena)</label>
      <input id="ds-miny" type="number" bind:value={room.depth_scale.min_y} />
    </div>
    <div>
      <label for="ds-maxy">max_y (vicino camera)</label>
      <input id="ds-maxy" type="number" bind:value={room.depth_scale.max_y} />
    </div>
    <div>
      <label for="ds-min">scala min</label>
      <input id="ds-min" type="number" step="0.05" bind:value={room.depth_scale.min} />
    </div>
    <div>
      <label for="ds-max">scala max</label>
      <input id="ds-max" type="number" step="0.05" bind:value={room.depth_scale.max} />
    </div>
  </div>
{/if}

<div class="actions" style="justify-content: flex-start; margin-top: 16px">
  <button class="danger" onclick={ondelete}>Elimina stanza</button>
</div>
