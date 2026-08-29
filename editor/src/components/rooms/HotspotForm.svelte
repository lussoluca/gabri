<script lang="ts">
  import type { Hotspot } from '@game/engine/types'
  import { store } from '../../state/store.svelte'

  interface Props {
    hotspot: Hotspot
    ondelete: () => void
  }

  let { hotspot, ondelete }: Props = $props()

  const roomIds = $derived(store.project?.rooms.map((r) => r.id) ?? [])
</script>

<h2>Hotspot</h2>

<label for="hs-id">Id</label>
<input
  id="hs-id"
  value={hotspot.id}
  autocapitalize="none"
  autocorrect="off"
  spellcheck="false"
  oninput={(e) => (hotspot.id = e.currentTarget.value.toLowerCase())}
/>

<label for="hs-name">Nome (mostrato al giocatore)</label>
<input id="hs-name" bind:value={hotspot.name} />

<label for="hs-desc">Descrizione (verbo «Guarda»)</label>
<textarea
  id="hs-desc"
  rows="3"
  value={hotspot.description ?? ''}
  oninput={(e) => {
    const v = e.currentTarget.value
    if (v) hotspot.description = v
    else delete hotspot.description
  }}
></textarea>

<label for="hs-leads">Uscita verso (leads_to)</label>
<select
  id="hs-leads"
  value={hotspot.leads_to ?? ''}
  onchange={(e) => {
    const v = e.currentTarget.value
    if (v) hotspot.leads_to = v
    else delete hotspot.leads_to
  }}
>
  <option value="">— nessuna —</option>
  {#each roomIds as id (id)}
    <option value={id}>{id}</option>
  {/each}
</select>

<span class="field-label">Rettangolo [x, y, w, h]</span>
<div class="grid-2">
  <input type="number" aria-label="x" bind:value={hotspot.rect[0]} />
  <input type="number" aria-label="y" bind:value={hotspot.rect[1]} />
  <input type="number" aria-label="larghezza" bind:value={hotspot.rect[2]} />
  <input type="number" aria-label="altezza" bind:value={hotspot.rect[3]} />
</div>

<div class="actions" style="justify-content: flex-start; margin-top: 16px">
  <button class="danger" onclick={ondelete}>Elimina hotspot</button>
</div>
