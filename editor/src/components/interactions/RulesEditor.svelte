<script lang="ts">
  import { store } from '../../state/store.svelte'
  import RuleForm from './RuleForm.svelte'

  const project = $derived(store.project!)
  let selected = $state<number | null>(null)

  function summary(index: number): string {
    const rule = project.rules[index]
    const conditions = rule.conditions?.length ? ` [${rule.conditions.length} cond]` : ''
    return `${rule.verb}${rule.object ? ` ${rule.object} →` : ''} ${rule.target}${conditions}`
  }

  // L'ordine è semantica: vince la prima regola che matcha.
  function move(index: number, delta: number) {
    const next = index + delta
    if (next < 0 || next >= project.rules.length) return
    const [rule] = project.rules.splice(index, 1)
    project.rules.splice(next, 0, rule)
    if (selected === index) selected = next
    else if (selected === next) selected = index
  }

  function addRule() {
    project.rules.push({ verb: 'look', target: '', actions: [{ say: '' }] })
    selected = project.rules.length - 1
  }

  function removeRule(index: number) {
    if (!confirm('Eliminare questa regola?')) return
    project.rules.splice(index, 1)
    if (selected === index) selected = null
    else if (selected !== null && selected > index) selected -= 1
  }
</script>

<aside class="sidebar" style="width: 340px">
  <h2>Regole (in ordine di priorità)</h2>
  {#each project.rules as rule, i (i)}
    <div class="rule-row" class:selected={selected === i}>
      <button class="summary" onclick={() => (selected = i)} title={summary(i)}>
        {i + 1}. {summary(i)}
      </button>
      <button class="mini" disabled={i === 0} onclick={() => move(i, -1)}>↑</button>
      <button class="mini" disabled={i === project.rules.length - 1} onclick={() => move(i, 1)}>↓</button>
      <button class="mini danger" onclick={() => removeRule(i)}>✕</button>
    </div>
  {/each}
  <button onclick={addRule}>+ Nuova regola</button>
  <p class="note">
    Il motore usa la prima regola che matcha (verb, object, target) con tutte le condizioni vere:
    metti le regole condizionate prima dei default.
  </p>
</aside>

<section class="editor-main">
  {#if selected !== null && project.rules[selected]}
    {#key selected}
      <div style="max-width: 560px">
        <RuleForm rule={project.rules[selected]} />
      </div>
    {/key}
  {:else}
    <p class="note">Seleziona una regola a sinistra o creane una nuova.</p>
  {/if}
</section>
