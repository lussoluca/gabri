<script lang="ts">
  import { saveConfig } from '../github/auth'
  import { store } from '../state/store.svelte'

  let token = $state(store.config.token)
  let owner = $state(store.config.owner)
  let repo = $state(store.config.repo)

  function save() {
    store.config = { token: token.trim(), owner: owner.trim(), repo: repo.trim() }
    saveConfig(store.config)
    store.ui.settingsOpen = false
  }

  function forget() {
    token = ''
    store.config = { ...store.config, token: '' }
    saveConfig(store.config)
  }
</script>

<div class="dialog-backdrop">
  <div class="dialog">
    <h1>Impostazioni GitHub</h1>
    <label for="gh-token">Fine-grained Personal Access Token</label>
    <input id="gh-token" type="password" bind:value={token} placeholder="github_pat_…" />
    <p class="note">
      Serve un token limitato a questo repository con permessi <strong>Contents: Read/Write</strong>
      e <strong>Pull requests: Read/Write</strong>. Resta salvato solo in questo browser
      (localStorage), nessun server lo vede.
    </p>
    <p class="note">
      <a
        href="https://github.com/settings/personal-access-tokens/new"
        target="_blank"
        rel="noreferrer">Crea il token su GitHub ↗</a
      >: in «Repository access» scegli <em>Only select repositories</em> e seleziona questo
      repository, poi sotto «Repository permissions» imposta <em>Contents</em> e
      <em>Pull requests</em> su <em>Read and write</em>.
    </p>
    <div class="grid-2">
      <div>
        <label for="gh-owner">Owner</label>
        <input id="gh-owner" bind:value={owner} />
      </div>
      <div>
        <label for="gh-repo">Repository</label>
        <input id="gh-repo" bind:value={repo} />
      </div>
    </div>
    <div class="actions">
      <button class="danger" onclick={forget}>Dimentica token</button>
      <button onclick={() => (store.ui.settingsOpen = false)}>Annulla</button>
      <button class="primary" onclick={save}>Salva</button>
    </div>
  </div>
</div>
