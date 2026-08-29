<script lang="ts">
  import { saveConfig } from '../github/auth'
  import { listEditorPulls, loadContent } from '../github/contentRepo'
  import type { PullInfo } from '../github/api'
  import { parseProject } from '../model/parse'
  import { clearDraft, loadDraft, type Draft } from '../state/draft'
  import { resetBaseline, store } from '../state/store.svelte'

  let loading = $state(false)
  let error = $state('')
  let pulls = $state<PullInfo[] | null>(null)
  let draft = $state<Draft | null>(loadDraft())

  let token = $state(store.config.token)
  let owner = $state(store.config.owner)
  let repo = $state(store.config.repo)
  const hasToken = $derived(store.config.token.length > 0)

  function saveSettings() {
    store.config = { token: token.trim(), owner: owner.trim(), repo: repo.trim() }
    saveConfig(store.config)
    error = ''
  }

  async function refreshPulls() {
    try {
      pulls = await listEditorPulls(store.config)
    } catch (e) {
      error = String(e instanceof Error ? e.message : e)
    }
  }

  $effect(() => {
    if (hasToken && pulls === null) void refreshPulls()
  })

  async function open(ref: string, pr?: PullInfo) {
    loading = true
    error = ''
    try {
      const loaded = await loadContent(store.config, ref)
      store.project = parseProject(loaded.files)
      store.source = {
        ref,
        headSha: loaded.headSha,
        shas: Object.fromEntries(loaded.files.map((f) => [f.path, f.sha])),
        bgFiles: loaded.bgFiles,
        saveBranch: pr ? pr.head.ref : undefined,
        prNumber: pr?.number,
        prUrl: pr?.html_url,
      }
      resetBaseline()
      clearDraft()
      store.ui.selectedRoom = store.project.rooms[0]?.id ?? null
      store.ui.selectedDialogue = store.project.dialogues[0]?.name ?? null
    } catch (e) {
      error = String(e instanceof Error ? e.message : e)
    } finally {
      loading = false
    }
  }

  function restoreDraft() {
    if (!draft) return
    store.project = draft.project
    store.source = draft.source
    store.baseline = draft.baseline
    store.ui.selectedRoom = draft.project.rooms[0]?.id ?? null
    store.ui.selectedDialogue = draft.project.dialogues[0]?.name ?? null
  }

  function discardDraft() {
    clearDraft()
    draft = null
  }
</script>

<div class="centered-screen">
  <div class="dialog">
    <h1>Gabri — Editor</h1>
    {#if !hasToken}
      <p class="note">
        Per iniziare serve un fine-grained Personal Access Token GitHub con permessi
        <strong>Contents: Read/Write</strong> e <strong>Pull requests: Read/Write</strong>
        sul repository. Resta salvato solo in questo browser.
      </p>
      <label for="su-token">Token</label>
      <input id="su-token" type="password" bind:value={token} placeholder="github_pat_…" />
      <div class="grid-2">
        <div>
          <label for="su-owner">Owner</label>
          <input id="su-owner" bind:value={owner} />
        </div>
        <div>
          <label for="su-repo">Repository</label>
          <input id="su-repo" bind:value={repo} />
        </div>
      </div>
      <div class="actions">
        <button class="primary" disabled={!token.trim()} onclick={saveSettings}>Continua</button>
      </div>
    {:else}
      <p class="note">Repository: {store.config.owner}/{store.config.repo}</p>
      {#if draft}
        <h2>Bozza non salvata</h2>
        <p class="note">
          C'è una bozza del {new Date(draft.savedAt).toLocaleString('it-IT')} basata su
          <code>{draft.source.saveBranch ?? draft.source.ref}</code>.
        </p>
        <div class="actions" style="justify-content: flex-start">
          <button class="primary" onclick={restoreDraft}>Riprendi la bozza</button>
          <button class="danger" onclick={discardDraft}>Scarta</button>
        </div>
      {/if}
      <h2 style="margin-top: 14px">Apri</h2>
      <div class="actions" style="justify-content: flex-start">
        <button class="primary" disabled={loading} onclick={() => open('main')}>
          Parti da main
        </button>
      </div>
      {#if pulls && pulls.length > 0}
        <p class="note">Oppure continua una PR aperta dall'editor:</p>
        {#each pulls as pr (pr.number)}
          <div class="actions" style="justify-content: flex-start">
            <button disabled={loading} onclick={() => open(pr.head.ref, pr)}>
              #{pr.number} — {pr.title} <span class="note">({pr.head.ref})</span>
            </button>
          </div>
        {/each}
      {/if}
      {#if loading}
        <p class="note">Caricamento contenuti…</p>
      {/if}
      <div class="actions">
        <button onclick={() => (store.ui.settingsOpen = true)}>Impostazioni…</button>
      </div>
    {/if}
    {#if error}
      <p class="error-text">{error}</p>
    {/if}
  </div>
</div>
