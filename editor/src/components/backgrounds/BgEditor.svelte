<script lang="ts">
  import { getFileBlobUrl } from '../../github/api'
  import { BG_PREFIX } from '../../github/contentRepo'
  import { availableBgFiles, store } from '../../state/store.svelte'

  const MAX_SIZE = 8 * 1024 * 1024
  const ACCEPT = 'image/svg+xml,image/png,image/jpeg,image/webp'

  const files = $derived.by(() => {
    const names = new Set(availableBgFiles())
    for (const name of store.bg.deletes) names.add(name)
    return [...names].sort()
  })

  function usedBy(name: string): string[] {
    return (store.project?.rooms ?? []).filter((r) => r.background === name).map((r) => r.id)
  }

  function status(name: string): 'nuovo' | 'sostituito' | 'da eliminare' | null {
    if (store.bg.deletes.includes(name)) return 'da eliminare'
    if (name in store.bg.uploads) {
      return (store.source?.bgFiles ?? []).includes(name) ? 'sostituito' : 'nuovo'
    }
    return null
  }

  // Thumbnail: data URL per gli upload pendenti, blob via API per i file sul ref.
  const thumbCache = new Map<string, string>()
  let thumbs = $state<Record<string, string>>({})

  $effect(() => {
    if (!store.source) return
    const ref = store.source.saveBranch ?? store.source.ref
    for (const name of files) {
      const upload = store.bg.uploads[name]
      if (upload) {
        thumbs[name] = `data:${upload.mime};base64,${upload.base64}`
        continue
      }
      const key = `${ref}:${name}`
      const cached = thumbCache.get(key)
      if (cached) {
        thumbs[name] = cached
        continue
      }
      if (!(store.source?.bgFiles ?? []).includes(name)) continue
      getFileBlobUrl(store.config, ref, BG_PREFIX + name, mimeOf(name))
        .then((url) => {
          thumbCache.set(key, url)
          thumbs[name] = url
        })
        .catch(() => {
          // file assente sul ref: la card resta senza anteprima
        })
    }
  })

  function mimeOf(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (ext === 'svg') return 'image/svg+xml'
    if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
    if (ext === 'webp') return 'image/webp'
    return 'image/png'
  }

  function sanitizeName(raw: string): string {
    const dot = raw.lastIndexOf('.')
    const base = (dot > 0 ? raw.slice(0, dot) : raw)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
    const ext = dot > 0 ? raw.slice(dot + 1).toLowerCase() : 'png'
    return `${base || 'sfondo'}.${ext}`
  }

  async function readUpload(file: File, name: string) {
    if (file.size > MAX_SIZE) {
      alert(`File troppo grande (max ${MAX_SIZE / 1024 / 1024} MB).`)
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
    store.bg.uploads[name] = { base64, mime: file.type || mimeOf(name) }
    store.bg.deletes = store.bg.deletes.filter((n) => n !== name)
  }

  function uploadNew(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    void readUpload(file, sanitizeName(file.name))
  }

  function replaceFile(name: string, e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!file) return
    void readUpload(file, name)
  }

  function toggleDelete(name: string) {
    if (store.bg.deletes.includes(name)) {
      store.bg.deletes = store.bg.deletes.filter((n) => n !== name)
      return
    }
    const rooms = usedBy(name)
    if (rooms.length > 0 && !confirm(`"${name}" è usato dalle stanze: ${rooms.join(', ')}. Eliminare comunque?`)) {
      return
    }
    delete store.bg.uploads[name]
    if ((store.source?.bgFiles ?? []).includes(name)) {
      store.bg.deletes = [...store.bg.deletes, name]
    }
  }
</script>

<section class="editor-main">
  <div class="toolbar">
    <h2 style="margin: 0">Sfondi delle stanze</h2>
    <span class="spacer" style="flex: 1"></span>
    <label class="upload-button">
      + Carica sfondo
      <input type="file" accept={ACCEPT} onchange={uploadNew} />
    </label>
  </div>
  <p class="note">
    I file vivono in <code>frontend/public/bg/</code> e vengono committati col salvataggio.
    Le stanze li usano dal campo «Sfondo». Dimensione consigliata: 960x440, formato SVG o PNG.
  </p>

  <div class="bg-grid">
    {#each files as name (name)}
      <div class="bg-card" class:deleted={store.bg.deletes.includes(name)}>
        <div class="bg-thumb">
          {#if thumbs[name]}
            <img src={thumbs[name]} alt={name} />
          {:else}
            <span class="note">nessuna anteprima</span>
          {/if}
        </div>
        <div class="bg-meta">
          <code>{name}</code>
          {#if status(name)}
            <span class="badge dirty">{status(name)}</span>
          {/if}
          <span class="note">
            {usedBy(name).length > 0 ? `usato da: ${usedBy(name).join(', ')}` : 'non usato'}
          </span>
        </div>
        <div class="bg-actions">
          <label class="upload-button">
            Sostituisci
            <input type="file" accept={ACCEPT} onchange={(e) => replaceFile(name, e)} />
          </label>
          <button class="danger" onclick={() => toggleDelete(name)}>
            {store.bg.deletes.includes(name) ? 'Ripristina' : 'Elimina'}
          </button>
        </div>
      </div>
    {/each}
  </div>
  {#if files.length === 0}
    <p class="note">Nessuno sfondo presente.</p>
  {/if}
</section>
