<script lang="ts">
  import { store } from '../../state/store.svelte'
  import InkPreview from './InkPreview.svelte'

  const project = $derived(store.project!)
  const dialogue = $derived(
    project.dialogues.find((d) => d.name === store.ui.selectedDialogue) ?? null,
  )

  let nameDraft = $state('')
  $effect(() => {
    nameDraft = dialogue?.name ?? ''
  })

  function applyName() {
    if (!dialogue) return
    const next = nameDraft.trim()
    if (!next || next === dialogue.name) return
    dialogue.name = next
    store.ui.selectedDialogue = next
  }

  function addDialogue() {
    let n = project.dialogues.length + 1
    while (project.dialogues.some((d) => d.name === `dialogo_${n}`)) n += 1
    const name = `dialogo_${n}`
    project.dialogues.push({
      name,
      source: '// Dialogo Ink. Tag come "# set_flag: nome = valore" vengono eseguiti dal motore.\nCiao!\n-> END\n',
    })
    store.ui.selectedDialogue = name
  }

  function deleteDialogue() {
    if (!dialogue) return
    if (!confirm(`Eliminare il dialogo "${dialogue.name}"? Il file .ink verrà rimosso dal commit.`)) return
    const index = project.dialogues.findIndex((d) => d.name === dialogue.name)
    project.dialogues.splice(index, 1)
    store.ui.selectedDialogue = project.dialogues[0]?.name ?? null
  }
</script>

<aside class="sidebar">
  <h2>Dialoghi (Ink)</h2>
  {#each project.dialogues as d (d.name)}
    <div class="row">
      <button
        class="item"
        class:selected={d.name === store.ui.selectedDialogue}
        onclick={() => (store.ui.selectedDialogue = d.name)}
      >
        {d.name}
      </button>
    </div>
  {/each}
  <button onclick={addDialogue}>+ Nuovo dialogo</button>
</aside>

<section class="editor-main">
  {#if dialogue}
    <div class="toolbar">
      <label for="dlg-name" style="margin: 0">Nome (file .ink)</label>
      <input
        id="dlg-name"
        style="width: 220px"
        bind:value={nameDraft}
        onblur={applyName}
        onkeydown={(e) => e.key === 'Enter' && applyName()}
      />
      <span class="spacer" style="flex: 1"></span>
      <button class="danger" onclick={deleteDialogue}>Elimina dialogo</button>
    </div>
    <div class="split">
      <div class="col">
        <textarea
          style="flex: 1; min-height: 300px"
          spellcheck="false"
          bind:value={dialogue.source}
        ></textarea>
      </div>
      <div class="col">
        <InkPreview source={dialogue.source} />
      </div>
    </div>
  {:else}
    <p class="note">Nessun dialogo selezionato. Creane uno nuovo a sinistra.</p>
  {/if}
</section>
