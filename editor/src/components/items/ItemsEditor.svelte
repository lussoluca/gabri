<script lang="ts">
  import { store } from '../../state/store.svelte'

  const project = $derived(store.project!)

  function addItem() {
    let n = project.items.length + 1
    while (project.items.some((i) => i.id === `item_${n}`)) n += 1
    project.items.push({ id: `item_${n}`, name: 'Nuovo oggetto' })
  }

  function removeItem(index: number) {
    const item = project.items[index]
    if (!confirm(`Eliminare l'oggetto "${item.id}"?`)) return
    project.items.splice(index, 1)
  }
</script>

<section class="editor-main">
  <div class="toolbar">
    <h2 style="margin: 0">Oggetti dell'inventario</h2>
    <span class="spacer" style="flex: 1"></span>
    <button onclick={addItem}>+ Nuovo oggetto</button>
  </div>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 160px">Id</th>
        <th style="width: 200px">Nome</th>
        <th>Descrizione</th>
        <th style="width: 40px"></th>
      </tr>
    </thead>
    <tbody>
      {#each project.items as item, i (i)}
        <tr>
          <td><input bind:value={item.id} /></td>
          <td><input bind:value={item.name} /></td>
          <td>
            <input
              value={item.description ?? ''}
              oninput={(e) => {
                const v = e.currentTarget.value
                if (v) item.description = v
                else delete item.description
              }}
            />
          </td>
          <td><button class="danger mini" onclick={() => removeItem(i)}>✕</button></td>
        </tr>
      {/each}
    </tbody>
  </table>
  {#if project.items.length === 0}
    <p class="note">Nessun oggetto definito.</p>
  {/if}
</section>
