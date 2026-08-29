<script lang="ts">
  import type { PullInfo } from '../github/api'
  import { listEditorPulls } from '../github/contentRepo'
  import { isDirty, issues, openRef, store, type Tab } from '../state/store.svelte'

  const tabs: { id: Tab; label: string }[] = [
    { id: 'rooms', label: 'Stanze' },
    { id: 'items', label: 'Oggetti' },
    { id: 'interactions', label: 'Interazioni' },
    { id: 'dialogues', label: 'Dialoghi' },
    { id: 'variables', label: 'Variabili' },
  ]

  const errors = $derived(issues().filter((i) => i.severity === 'error').length)
  const dirty = $derived(isDirty())

  const currentBranch = $derived(store.source?.saveBranch ?? store.source?.ref ?? 'main')

  let pulls = $state<PullInfo[]>([])
  let switching = $state(false)

  async function refreshPulls() {
    try {
      pulls = await listEditorPulls(store.config)
    } catch {
      // solo per popolare la tendina: un errore qui non blocca nulla
    }
  }

  $effect(() => {
    void refreshPulls()
  })

  const branches = $derived.by(() => {
    const names = ['main', ...pulls.map((p) => p.head.ref)]
    if (!names.includes(currentBranch)) names.push(currentBranch)
    return names
  })

  async function switchBranch(event: Event & { currentTarget: HTMLSelectElement }) {
    const branch = event.currentTarget.value
    if (branch === currentBranch) return
    if (dirty && !confirm('Ci sono modifiche non salvate: cambiando ramo le perdi. Continuare?')) {
      event.currentTarget.value = currentBranch
      return
    }
    switching = true
    try {
      await openRef(branch, pulls.find((p) => p.head.ref === branch))
    } catch (e) {
      alert(String(e instanceof Error ? e.message : e))
      event.currentTarget.value = currentBranch
    } finally {
      switching = false
    }
  }
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
      <select
        class="branch-select"
        aria-label="Ramo"
        disabled={switching}
        value={currentBranch}
        onfocus={refreshPulls}
        onchange={switchBranch}
      >
        {#each branches as branch (branch)}
          <option value={branch}>{branch}</option>
        {/each}
      </select>
      {#if switching}
        …
      {:else if store.source.prUrl}
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
