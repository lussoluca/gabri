<script lang="ts">
  import { isDirty, issues, store, type Tab } from '../state/store.svelte'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'rooms', label: 'Stanze' },
    { id: 'items', label: 'Oggetti' },
    { id: 'interactions', label: 'Interazioni' },
    { id: 'dialogues', label: 'Dialoghi' },
    { id: 'variables', label: 'Variabili' },
  ]

  const errors = $derived(issues().filter((i) => i.severity === 'error').length)
  const dirty = $derived(isDirty())
</script>

<header class="topbar">
  <h1>Gabri — Editor</h1>
  <nav class="tabs">
    {#each tabs as tab (tab.id)}
      <button class:active={store.ui.tab === tab.id} onclick={() => (store.ui.tab = tab.id)}>
        {tab.label}
      </button>
    {/each}
  </nav>
  <span class="spacer"></span>
  {#if store.source}
    <span class="ref">
      {store.source.saveBranch ?? store.source.ref}
      {#if store.source.prUrl}
        · <a href={store.source.prUrl} target="_blank" rel="noreferrer">PR #{store.source.prNumber}</a>
      {/if}
    </span>
  {/if}
  {#if errors > 0}
    <span class="badge errors" title="Errori di validazione">{errors}</span>
  {/if}
  {#if dirty}
    <span class="badge dirty" title="Modifiche non salvate">●</span>
  {/if}
  <button class="primary" disabled={!dirty} onclick={() => (store.ui.saveOpen = true)}>
    Salva su GitHub…
  </button>
  <button title="Impostazioni" onclick={() => (store.ui.settingsOpen = true)}>⚙</button>
</header>
