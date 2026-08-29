<script lang="ts">
  import {
    createEditorBranch,
    findStaleFiles,
    newEditorBranchName,
    openPull,
    saveCommit,
    type StaleFile,
  } from '../github/contentRepo'
  import { clearDraft } from '../state/draft'
  import { issues, pendingChanges, resetBaseline, store } from '../state/store.svelte'

  const changes = $derived(pendingChanges())
  const errors = $derived(issues().filter((i) => i.severity === 'error'))

  let message = $state('content: modifiche dall\'editor')
  let prTitle = $state('content: modifiche dall\'editor')
  let override = $state(false)
  let saving = $state(false)
  let error = $state('')
  let stale = $state<StaleFile[] | null>(null)

  const isNewBranch = $derived(!store.source?.saveBranch)
  const canSave = $derived(
    (errors.length === 0 || override) &&
      (changes.writes.length > 0 || changes.deletes.length > 0) &&
      !saving,
  )

  async function save(ignoreStale = false) {
    if (!store.source || !store.project) return
    saving = true
    error = ''
    try {
      const cfg = store.config
      const source = store.source

      if (!ignoreStale) {
        // Sul branch di salvataggio (o su quello sorgente se il branch non
        // esiste ancora) qualcuno potrebbe aver toccato gli stessi file.
        const checkBranch = source.saveBranch ?? source.ref
        const found = await findStaleFiles(cfg, checkBranch, source.headSha, source.shas, [
          ...changes.writes.map((w) => w.path),
          ...changes.deletes,
        ])
        if (found.length > 0) {
          stale = found
          saving = false
          return
        }
      }

      let branch = source.saveBranch
      if (!branch) {
        branch = newEditorBranchName()
        await createEditorBranch(cfg, source.headSha, branch)
      }

      const result = await saveCommit(cfg, {
        branch,
        message,
        writes: changes.writes,
        deletes: changes.deletes,
      })

      let prNumber = source.prNumber
      let prUrl = source.prUrl
      if (!source.prNumber) {
        const pr = await openPull(cfg, branch, 'main', prTitle)
        prNumber = pr.number
        prUrl = pr.html_url
      }

      // Lo stato salvato diventa la nuova baseline.
      const shas = { ...source.shas, ...result.blobShas }
      for (const path of changes.deletes) delete shas[path]
      store.source = {
        ...source,
        ref: branch,
        headSha: result.commitSha,
        shas,
        saveBranch: branch,
        prNumber,
        prUrl,
      }
      resetBaseline()
      clearDraft()
      stale = null
      store.ui.saveOpen = false
    } catch (e) {
      error = String(e instanceof Error ? e.message : e)
    } finally {
      saving = false
    }
  }
</script>

<div class="dialog-backdrop">
  <div class="dialog">
    <h1>Salva su GitHub</h1>

    {#if stale}
      <p class="error-text">
        Questi file sono cambiati su GitHub dopo il caricamento: salvando li sovrascrivi.
      </p>
      <div class="file-list">
        {#each stale as s (s.path)}
          <div>{s.path}</div>
        {/each}
      </div>
      <div class="actions">
        <button onclick={() => (stale = null)}>Indietro</button>
        <button class="danger" disabled={saving} onclick={() => save(true)}>
          Sovrascrivi comunque
        </button>
      </div>
    {:else}
      <h2>File da committare</h2>
      <div class="file-list">
        {#each changes.writes as w (w.path)}
          <div class="add">~ {w.path}</div>
        {/each}
        {#each changes.deletes as path (path)}
          <div class="del">− {path}</div>
        {/each}
        {#if changes.writes.length === 0 && changes.deletes.length === 0}
          <div class="note">Nessuna modifica.</div>
        {/if}
      </div>

      {#if errors.length > 0}
        <p class="error-text">
          Ci sono {errors.length} errori di validazione: il contenuto potrebbe rompere il gioco.
        </p>
        <label style="display: flex; align-items: center; gap: 6px">
          <input type="checkbox" bind:checked={override} style="width: auto" />
          Salva lo stesso
        </label>
      {/if}

      <label for="save-msg">Messaggio di commit</label>
      <input id="save-msg" bind:value={message} />

      {#if isNewBranch}
        <label for="save-pr">Titolo della Pull Request (nuovo branch <code>editor/…</code>)</label>
        <input id="save-pr" bind:value={prTitle} />
      {:else}
        <p class="note">
          Il commit va sul branch <code>{store.source?.saveBranch}</code>
          {#if store.source?.prNumber}(PR #{store.source.prNumber}){/if}.
        </p>
      {/if}

      {#if error}
        <p class="error-text">{error}</p>
      {/if}

      <div class="actions">
        <button onclick={() => (store.ui.saveOpen = false)}>Annulla</button>
        <button class="primary" disabled={!canSave} onclick={() => save()}>
          {saving ? 'Salvataggio…' : isNewBranch ? 'Crea branch + PR' : 'Committa'}
        </button>
      </div>
    {/if}
  </div>
</div>
