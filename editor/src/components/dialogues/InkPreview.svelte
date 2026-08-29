<script lang="ts">
  interface Props {
    source: string
  }

  let { source }: Props = $props()

  // Sottoinsieme dell'API di runtime inkjs usato dalla preview.
  interface InkStory {
    canContinue: boolean
    Continue(): string | null
    currentTags: string[] | null
    currentChoices: { text: string }[]
    ChooseChoiceIndex(index: number): void
  }

  let inkModule: typeof import('inkjs/full') | null = null
  let error = $state('')
  let compiling = $state(false)
  let story: InkStory | null = null
  let output = $state<{ text: string; tags: string[] }[]>([])
  let choices = $state<string[]>([])
  let ended = $state(false)

  // Ricompila (debounced) a ogni modifica del sorgente.
  $effect(() => {
    const src = source
    compiling = true
    const timer = setTimeout(() => void compile(src), 400)
    return () => clearTimeout(timer)
  })

  async function compile(src: string) {
    try {
      // inkjs/full (compilatore incluso) è pesante: caricato solo qui, on demand.
      inkModule = inkModule ?? (await import('inkjs/full'))
      const compiled = new inkModule.Compiler(src).Compile() as unknown as InkStory
      error = ''
      story = compiled
      output = []
      choices = []
      ended = false
      advance()
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
      story = null
      output = []
      choices = []
    } finally {
      compiling = false
    }
  }

  function advance() {
    if (!story) return
    while (story.canContinue) {
      const text = (story.Continue() ?? '').trim()
      const tags = [...(story.currentTags ?? [])]
      if (text || tags.length > 0) output.push({ text, tags })
    }
    choices = story.currentChoices.map((c) => c.text)
    ended = choices.length === 0
  }

  function choose(index: number) {
    if (!story) return
    story.ChooseChoiceIndex(index)
    advance()
  }

  function restart() {
    void compile(source)
  }
</script>

<div class="ink-preview">
  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px">
    <h2 style="margin: 0">Preview</h2>
    <span class="spacer" style="flex: 1"></span>
    {#if compiling}<span class="note">compilo…</span>{/if}
    <button class="mini" onclick={restart}>⟲ Ricomincia</button>
  </div>

  {#if error}
    <p class="error-text">{error}</p>
  {:else}
    {#each output as entry, i (i)}
      {#if entry.text}
        <p>{entry.text}</p>
      {/if}
      {#each entry.tags as tag (tag)}
        <span class="tag-chip"># {tag}</span>
      {/each}
    {/each}
    {#each choices as choice, i (i)}
      <button class="choice" onclick={() => choose(i)}>{i + 1}. {choice}</button>
    {/each}
    {#if ended && output.length > 0}
      <p class="note">— fine del dialogo —</p>
    {/if}
  {/if}
</div>
