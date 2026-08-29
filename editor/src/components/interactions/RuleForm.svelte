<script lang="ts">
  import type { Rule } from '@game/engine/types'
  import { store } from '../../state/store.svelte'
  import { ACTION_KEYS, CONDITION_KEYS, VERBS } from '../../vocab'

  interface Props {
    rule: Rule
  }

  let { rule }: Props = $props()

  const project = $derived(store.project!)
  const itemIds = $derived(project.items.map((i) => i.id))
  const roomIds = $derived(project.rooms.map((r) => r.id))
  const dialogueNames = $derived(project.dialogues.map((d) => d.name))

  function keyOf(entry: Record<string, string>): string {
    return Object.keys(entry)[0] ?? ''
  }

  function valueOf(entry: Record<string, string>): string {
    const key = keyOf(entry)
    return key ? entry[key] : ''
  }

  // Le azioni/condizioni sono oggetti a chiave singola: cambiare tipo
  // significa sostituire l'oggetto.
  function setKey(list: Record<string, string>[], index: number, key: string) {
    list[index] = { [key]: valueOf(list[index]) }
  }

  function setValue(list: Record<string, string>[], index: number, value: string) {
    const key = keyOf(list[index])
    if (key) list[index] = { [key]: value }
  }

  function addCondition() {
    rule.conditions = [...(rule.conditions ?? []), { flag: '' }]
  }

  function removeCondition(index: number) {
    rule.conditions?.splice(index, 1)
    if (rule.conditions && rule.conditions.length === 0) delete rule.conditions
  }

  function addAction() {
    rule.actions.push({ say: '' })
  }

  function removeAction(index: number) {
    rule.actions.splice(index, 1)
  }
</script>

{#snippet valueEditor(list: Record<string, string>[], index: number)}
  {@const key = keyOf(list[index])}
  {@const value = valueOf(list[index])}
  {#if key === 'say'}
    <textarea
      rows="2"
      placeholder="Testo detto dal personaggio"
      {value}
      oninput={(e) => setValue(list, index, e.currentTarget.value)}
    ></textarea>
  {:else if key === 'set_flag'}
    <input
      placeholder="nome = valore (es. door_open = true)"
      {value}
      oninput={(e) => setValue(list, index, e.currentTarget.value)}
    />
  {:else if key === 'flag'}
    <input
      placeholder="nome == valore (es. door_open != true)"
      {value}
      oninput={(e) => setValue(list, index, e.currentTarget.value)}
    />
  {:else if key === 'add_item' || key === 'remove_item' || key === 'has_item'}
    <select {value} onchange={(e) => setValue(list, index, e.currentTarget.value)}>
      <option value="">— oggetto —</option>
      {#each itemIds as id (id)}
        <option value={id}>{id}</option>
      {/each}
    </select>
  {:else if key === 'goto_room'}
    <select {value} onchange={(e) => setValue(list, index, e.currentTarget.value)}>
      <option value="">— stanza —</option>
      {#each roomIds as id (id)}
        <option value={id}>{id}</option>
      {/each}
    </select>
  {:else if key === 'dialogue'}
    <select {value} onchange={(e) => setValue(list, index, e.currentTarget.value)}>
      <option value="">— dialogo —</option>
      {#each dialogueNames as name (name)}
        <option value={name}>{name}</option>
      {/each}
    </select>
  {/if}
{/snippet}

<h2>Regola</h2>

<label for="rule-verb">Verbo</label>
<select id="rule-verb" bind:value={rule.verb}>
  {#each VERBS as verb (verb)}
    <option value={verb}>{verb}</option>
  {/each}
</select>

<label for="rule-object">Oggetto usato (object, per «use»)</label>
<select
  id="rule-object"
  value={rule.object ?? ''}
  onchange={(e) => {
    const v = e.currentTarget.value
    if (v) rule.object = v
    else delete rule.object
  }}
>
  <option value="">— nessuno —</option>
  {#each itemIds as id (id)}
    <option value={id}>{id}</option>
  {/each}
</select>

<label for="rule-target">Target</label>
<select id="rule-target" bind:value={rule.target}>
  <option value="">— target —</option>
  {#each project.rooms as room (room.id)}
    {#if room.hotspots.length > 0}
      <optgroup label="Stanza: {room.id}">
        {#each room.hotspots as hotspot (hotspot.id)}
          <option value={hotspot.id}>{hotspot.id}</option>
        {/each}
      </optgroup>
    {/if}
  {/each}
  {#if itemIds.length > 0}
    <optgroup label="Oggetti">
      {#each itemIds as id (id)}
        <option value={id}>{id}</option>
      {/each}
    </optgroup>
  {/if}
</select>

<span class="field-label">Condizioni (tutte vere perché la regola scatti)</span>
{#each rule.conditions ?? [] as condition, i (i)}
  <div class="kv-row">
    <select class="key" value={keyOf(condition)} onchange={(e) => setKey(rule.conditions!, i, e.currentTarget.value)}>
      {#each CONDITION_KEYS as key (key)}
        <option value={key}>{key}</option>
      {/each}
    </select>
    <div style="flex: 1">
      {@render valueEditor(rule.conditions!, i)}
    </div>
    <button class="danger mini" onclick={() => removeCondition(i)}>✕</button>
  </div>
{/each}
<button onclick={addCondition}>+ Condizione</button>

<span class="field-label">Azioni (eseguite in ordine)</span>
{#each rule.actions as action, i (i)}
  <div class="kv-row">
    <select class="key" value={keyOf(action)} onchange={(e) => setKey(rule.actions, i, e.currentTarget.value)}>
      {#each ACTION_KEYS as key (key)}
        <option value={key}>{key}</option>
      {/each}
    </select>
    <div style="flex: 1">
      {@render valueEditor(rule.actions, i)}
    </div>
    <button class="danger mini" onclick={() => removeAction(i)}>✕</button>
  </div>
{/each}
<button onclick={addAction}>+ Azione</button>
