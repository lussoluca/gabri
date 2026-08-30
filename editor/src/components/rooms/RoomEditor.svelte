<script lang="ts">
  import { store } from '../../state/store.svelte'
  import NumField from '../NumField.svelte'
  import HotspotForm from './HotspotForm.svelte'
  import RoomCanvas, { type Mode, type Selection } from './RoomCanvas.svelte'
  import RoomForm from './RoomForm.svelte'

  const project = $derived(store.project!)
  const room = $derived(project.rooms.find((r) => r.id === store.ui.selectedRoom) ?? null)

  let mode = $state<Mode>('select')
  let layers = $state({ hotspots: true, walkboxes: true, depth: true })
  let selection = $state<Selection>(null)

  function selectRoom(id: string) {
    store.ui.selectedRoom = id
    selection = null
  }

  function addRoom() {
    let n = project.rooms.length + 1
    while (project.rooms.some((r) => r.id === `room_${n}`)) n += 1
    const id = `room_${n}`
    project.rooms.push({ id, name: 'Nuova stanza', hotspots: [] })
    selectRoom(id)
  }

  function deleteRoom() {
    if (!room) return
    if (!confirm(`Eliminare la stanza "${room.id}"? Il file verrà rimosso dal commit.`)) return
    const index = project.rooms.findIndex((r) => r.id === room.id)
    project.rooms.splice(index, 1)
    selectRoom(project.rooms[0]?.id ?? '')
  }

  function deleteSelected() {
    if (!room || !selection) return
    if (selection.kind === 'hotspot') {
      room.hotspots.splice(selection.index, 1)
    } else {
      room.walkboxes?.splice(selection.index, 1)
      if (room.walkboxes && room.walkboxes.length === 0) delete room.walkboxes
    }
    selection = null
  }

  const selectedHotspot = $derived(
    room && selection?.kind === 'hotspot' ? (room.hotspots[selection.index] ?? null) : null,
  )
  const selectedWalkbox = $derived(
    room && selection?.kind === 'walkbox' ? (room.walkboxes?.[selection.index] ?? null) : null,
  )
</script>

<aside class="sidebar">
  <h2>Stanze</h2>
  {#each project.rooms as r (r.id)}
    <div class="row">
      <button class="item" class:selected={r.id === store.ui.selectedRoom} onclick={() => selectRoom(r.id)}>
        {r.id}
        {#if r.id === project.game.start.room}★{/if}
      </button>
    </div>
  {/each}
  <button onclick={addRoom}>+ Nuova stanza</button>
  <label for="start-room">Stanza iniziale</label>
  <select id="start-room" bind:value={project.game.start.room}>
    {#each project.rooms as r (r.id)}
      <option value={r.id}>{r.id}</option>
    {/each}
  </select>

  {#if room}
    <h2 style="margin-top: 14px">Hotspot</h2>
    {#each room.hotspots as hotspot, i (i)}
      <div class="row">
        <button
          class="item"
          class:selected={selection?.kind === 'hotspot' && selection.index === i}
          onclick={() => (selection = { kind: 'hotspot', index: i })}
        >
          {hotspot.id}
        </button>
      </div>
    {/each}
    {#if room.hotspots.length === 0}
      <span class="note">nessuno</span>
    {/if}

    <h2 style="margin-top: 10px">Walkbox</h2>
    {#each room.walkboxes ?? [] as box, i (i)}
      <div class="row">
        <button
          class="item"
          class:selected={selection?.kind === 'walkbox' && selection.index === i}
          onclick={() => (selection = { kind: 'walkbox', index: i })}
        >
          #{i + 1} [{box.join(', ')}]
        </button>
      </div>
    {/each}
    {#if !room.walkboxes || room.walkboxes.length === 0}
      <span class="note">nessuno</span>
    {/if}
  {/if}
</aside>

<section class="editor-main">
  {#if room}
    <div class="toolbar">
      <div class="group" role="radiogroup" aria-label="Strumento">
        <button class:active={mode === 'select'} onclick={() => (mode = 'select')}>Seleziona</button>
        <button class:active={mode === 'hotspot'} onclick={() => (mode = 'hotspot')}>+ Hotspot</button>
        <button class:active={mode === 'walkbox'} onclick={() => (mode = 'walkbox')}>+ Walkbox</button>
        <button class:active={mode === 'start'} onclick={() => (mode = 'start')}>Start</button>
      </div>
      <div class="group" aria-label="Layer">
        <button class:active={layers.hotspots} onclick={() => (layers.hotspots = !layers.hotspots)}>
          Hotspot
        </button>
        <button class:active={layers.walkboxes} onclick={() => (layers.walkboxes = !layers.walkboxes)}>
          Walkbox
        </button>
        <button class:active={layers.depth} onclick={() => (layers.depth = !layers.depth)}>
          Profondità
        </button>
      </div>
      {#if selection}
        <button class="danger" onclick={deleteSelected}>
          Elimina {selection.kind === 'hotspot' ? 'hotspot' : 'walkbox'}
        </button>
      {/if}
    </div>
    {#key room.id}
      <RoomCanvas {room} {mode} {layers} {selection} onselect={(sel) => (selection = sel)} />
    {/key}
    <p class="note">
      Trascina per spostare, usa le maniglie per ridimensionare. Con «+ Hotspot» / «+ Walkbox»
      disegna un rettangolo sul canvas; con «Start» clicca per posizionare il punto di partenza.
    </p>
  {:else}
    <p class="note">Nessuna stanza selezionata.</p>
  {/if}
</section>

<aside class="props">
  {#if selectedHotspot && room}
    <HotspotForm hotspot={selectedHotspot} ondelete={deleteSelected} />
  {:else if selectedWalkbox && room && selection}
    <h2>Walkbox #{selection.index + 1}</h2>
    <span class="field-label">Rettangolo [x, y, w, h]</span>
    <div class="grid-2">
      <NumField label="x" value={selectedWalkbox[0]} set={(n) => (selectedWalkbox[0] = n)} />
      <NumField label="y" value={selectedWalkbox[1]} set={(n) => (selectedWalkbox[1] = n)} />
      <NumField label="larghezza" value={selectedWalkbox[2]} set={(n) => (selectedWalkbox[2] = n)} />
      <NumField label="altezza" value={selectedWalkbox[3]} set={(n) => (selectedWalkbox[3] = n)} />
    </div>
    <div class="actions" style="justify-content: flex-start; margin-top: 16px">
      <button class="danger" onclick={deleteSelected}>Elimina walkbox</button>
    </div>
  {:else if room}
    <RoomForm {room} ondelete={deleteRoom} />
  {/if}
</aside>
