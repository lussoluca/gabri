<script lang="ts">
  import { knownFlags, store } from '../../state/store.svelte'
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

  let textareaEl = $state<HTMLTextAreaElement | null>(null)
  let insertName = $state('')
  let insertValue = $state('true')

  // Inserisce un tag "# set_flag: nome = valore" alla posizione del cursore,
  // su una riga propria, senza doverlo scrivere a mano.
  function insertSetFlag() {
    if (!dialogue || !insertName) return
    const tag = `# set_flag: ${insertName} = ${insertValue.trim() || 'true'}`
    const source = dialogue.source
    const pos = textareaEl?.selectionStart ?? source.length
    const before = source.slice(0, pos)
    const after = source.slice(pos)
    const prefix = before === '' || before.endsWith('\n') ? '' : '\n'
    const suffix = after.startsWith('\n') || after === '' ? '' : '\n'
    dialogue.source = before + prefix + tag + suffix + after
    const cursor = pos + prefix.length + tag.length
    requestAnimationFrame(() => {
      textareaEl?.focus()
      textareaEl?.setSelectionRange(cursor, cursor)
    })
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
        value={nameDraft}
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
        oninput={(e) => (nameDraft = e.currentTarget.value.toLowerCase())}
        onblur={applyName}
        onkeydown={(e) => e.key === 'Enter' && applyName()}
      />
      <span class="spacer" style="flex: 1"></span>
      <button class="danger" onclick={deleteDialogue}>Elimina dialogo</button>
    </div>
    <div class="toolbar">
      <span class="field-label" style="margin: 0">Imposta variabile al cursore:</span>
      <select style="width: 180px" bind:value={insertName}>
        <option value="">— variabile —</option>
        {#each knownFlags() as name (name)}
          <option value={name}>{name}</option>
        {/each}
      </select>
      <span class="note">=</span>
      <select style="width: 100px" bind:value={insertValue}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <button disabled={!insertName} onclick={insertSetFlag}>Inserisci # set_flag</button>
    </div>
    <div class="split">
      <div class="col">
        <textarea
          style="flex: 1; min-height: 300px"
          spellcheck="false"
          bind:this={textareaEl}
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
