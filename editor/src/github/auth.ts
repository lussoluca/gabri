// Config di accesso a GitHub, persistita solo in questo browser.
export interface GhConfig {
  token: string
  owner: string
  repo: string
}

const KEY = 'gabri-editor.github'

export const DEFAULT_OWNER = 'lussoluca'
export const DEFAULT_REPO = 'gabri'

export function loadConfig(): GhConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GhConfig>
      return {
        token: parsed.token ?? '',
        owner: parsed.owner || DEFAULT_OWNER,
        repo: parsed.repo || DEFAULT_REPO,
      }
    }
  } catch {
    // storage corrotto: riparti dai default
  }
  return { token: '', owner: DEFAULT_OWNER, repo: DEFAULT_REPO }
}

export function saveConfig(cfg: GhConfig): void {
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

export function forgetToken(): void {
  const cfg = loadConfig()
  saveConfig({ ...cfg, token: '' })
}
