<script lang="ts">
  import DialogueEditor from './components/dialogues/DialogueEditor.svelte'
  import ItemsEditor from './components/items/ItemsEditor.svelte'
  import RulesEditor from './components/interactions/RulesEditor.svelte'
  import BgEditor from './components/backgrounds/BgEditor.svelte'
  import RoomEditor from './components/rooms/RoomEditor.svelte'
  import VariablesEditor from './components/variables/VariablesEditor.svelte'
  import PlayDialog from './components/PlayDialog.svelte'
  import SavePanel from './components/SavePanel.svelte'
  import SettingsDialog from './components/SettingsDialog.svelte'
  import StartupDialog from './components/StartupDialog.svelte'
  import TopBar from './components/TopBar.svelte'
  import ValidationPanel from './components/ValidationPanel.svelte'
  import { saveDraft } from './state/draft'
  import { isDirty, store } from './state/store.svelte'

  // Autosave della bozza in localStorage: JSON.stringify legge in profondità
  // project/source/baseline, quindi l'effect ritraccia ogni modifica.
  $effect(() => {
    if (!store.project || !store.source) return
    const snapshot = JSON.stringify({
      source: store.source,
      baseline: store.baseline,
      project: store.project,
      bg: store.bg,
    })
    if (!isDirty()) return
    const timer = setTimeout(() => {
      saveDraft({ savedAt: new Date().toISOString(), ...JSON.parse(snapshot) })
    }, 800)
    return () => clearTimeout(timer)
  })
</script>

<svelte:window
  onbeforeunload={(e) => {
    // La bozza è comunque in localStorage, ma avvisa se ci sono modifiche.
    if (isDirty()) e.preventDefault()
  }}
/>

{#if !store.project}
  <StartupDialog />
{:else}
  <TopBar />
  <main class="content">
    {#if store.ui.tab === 'rooms'}
      <RoomEditor />
    {:else if store.ui.tab === 'items'}
      <ItemsEditor />
    {:else if store.ui.tab === 'interactions'}
      <RulesEditor />
    {:else if store.ui.tab === 'variables'}
      <VariablesEditor />
    {:else if store.ui.tab === 'backgrounds'}
      <BgEditor />
    {:else}
      <DialogueEditor />
    {/if}
  </main>
  <ValidationPanel />
{/if}

{#if store.ui.settingsOpen}
  <SettingsDialog />
{/if}
{#if store.ui.saveOpen}
  <SavePanel />
{/if}
{#if store.ui.playOpen && store.project}
  <PlayDialog />
{/if}
