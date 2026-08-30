<script lang="ts">
  import type { Hotspot } from '@game/engine/types'
  import { store } from '../../state/store.svelte'
  import NumField from '../NumField.svelte'

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
  <NumField label="x" value={hotspot.rect[0]} set={(n) => (hotspot.rect[0] = n)} />
  <NumField label="y" value={hotspot.rect[1]} set={(n) => (hotspot.rect[1] = n)} />
  <NumField label="larghezza" value={hotspot.rect[2]} set={(n) => (hotspot.rect[2] = n)} />
  <NumField label="altezza" value={hotspot.rect[3]} set={(n) => (hotspot.rect[3] = n)} />
</div>

<div class="actions" style="justify-content: flex-start; margin-top: 16px">
  <button class="danger" onclick={ondelete}>Elimina hotspot</button>
</div>
