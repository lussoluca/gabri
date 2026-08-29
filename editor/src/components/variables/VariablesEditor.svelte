<script lang="ts">
  import { store, usedFlags } from '../../state/store.svelte'

  const project = $derived(store.project!)
  const declared = $derived(new Set(project.variables.map((v) => v.id)))
  const undeclared = $derived([...usedFlags()].filter((name) => !declared.has(name)).sort())

  function addVariable(id = '') {
    if (!id) {
      let n = project.variables.length + 1
      while (project.variables.some((v) => v.id === `variable_${n}`)) n += 1
      id = `variable_${n}`
    }
    if (project.variables.some((v) => v.id === id)) return
    project.variables.push({ id })
  }

  function removeVariable(index: number) {
    const variable = project.variables[index]
    if (!confirm(`Eliminare la variabile "${variable.id}" dal registro?`)) return
    project.variables.splice(index, 1)
  }
</script>

<section class="editor-main">
  <div class="toolbar">
    <h2 style="margin: 0">Variabili di gioco (flag)</h2>
    <span class="spacer" style="flex: 1"></span>
    <button onclick={() => addVariable()}>+ Nuova variabile</button>
  </div>
  <p class="note">
    Il registro vive in <code>content/variables.yaml</code> e alimenta le tendine di
    interazioni e dialoghi. Il motore crea comunque i flag al primo <code>set_flag</code>:
    il registro serve a te per non perderli di vista.
  </p>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 220px">Id</th>
        <th>Descrizione</th>
        <th style="width: 40px"></th>
      </tr>
    </thead>
    <tbody>
      {#each project.variables as variable, i (i)}
        <tr>
          <td>
            <input
              value={variable.id}
              autocapitalize="none"
              autocorrect="off"
              spellcheck="false"
              oninput={(e) => (variable.id = e.currentTarget.value.toLowerCase())}
            />
          </td>
          <td>
            <input
              value={variable.description ?? ''}
              oninput={(e) => {
                const v = e.currentTarget.value
                if (v) variable.description = v
                else delete variable.description
              }}
            />
          </td>
          <td><button class="danger mini" onclick={() => removeVariable(i)}>✕</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if project.variables.length === 0}
    <p class="note">Nessuna variabile nel registro.</p>
  {/if}

  {#if undeclared.length > 0}
    <h2 style="margin-top: 16px">Usate ma non nel registro</h2>
    <p class="note">Flag trovati in interazioni o dialoghi ma non dichiarati:</p>
    <div class="toolbar">
      {#each undeclared as name (name)}
        <button onclick={() => addVariable(name)}>+ {name}</button>
      {/each}
    </div>
  {/if}
</section>
