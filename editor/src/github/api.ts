// Wrapper minimale e tipizzato della GitHub REST API (Git Data + Pulls).
// Solo gli endpoint che servono all'editor; niente Octokit.
import type { GhConfig } from './auth'

const API = 'https://api.github.com'

export class GhError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

async function gh<T>(cfg: GhConfig, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}/repos/${cfg.owner}/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { message?: string }
      if (body.message) message = body.message
    } catch {
      // body non JSON: tieni statusText
    }
    throw new GhError(res.status, `GitHub ${res.status}: ${message} (${path})`)
  }
  return (await res.json()) as T
}

export interface TreeEntry {
  path: string
  mode: string
  type: 'blob' | 'tree' | 'commit'
  sha: string
}

export async function getRefSha(cfg: GhConfig, branch: string): Promise<string> {
  const data = await gh<{ object: { sha: string } }>(cfg, `/git/ref/${encodeURIComponent(`heads/${branch}`)}`)
  return data.object.sha
}

export async function getCommitTreeSha(cfg: GhConfig, commitSha: string): Promise<string> {
  const data = await gh<{ tree: { sha: string } }>(cfg, `/git/commits/${commitSha}`)
  return data.tree.sha
}

export async function getTree(cfg: GhConfig, treeSha: string): Promise<TreeEntry[]> {
  const data = await gh<{ tree: TreeEntry[]; truncated: boolean }>(cfg, `/git/trees/${treeSha}?recursive=1`)
  if (data.truncated) throw new GhError(500, 'Tree troncato: repo troppo grande per la lettura ricorsiva')
  return data.tree
}

export async function getBlobText(cfg: GhConfig, blobSha: string): Promise<string> {
  const data = await gh<{ content: string; encoding: string }>(cfg, `/git/blobs/${blobSha}`)
  if (data.encoding !== 'base64') throw new GhError(500, `Encoding blob inatteso: ${data.encoding}`)
  return decodeBase64(data.content)
}

// Contenuto binario di un file a un ref (per le immagini di sfondo).
export async function getFileBlobUrl(cfg: GhConfig, ref: string, path: string, mime: string): Promise<string> {
  const res = await fetch(
    `${API}/repos/${cfg.owner}/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        Accept: 'application/vnd.github.raw+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  )
  if (!res.ok) throw new GhError(res.status, `GitHub ${res.status}: lettura di ${path} fallita`)
  const buf = await res.arrayBuffer()
  return URL.createObjectURL(new Blob([buf], { type: mime }))
}

export async function createBlob(cfg: GhConfig, text: string): Promise<string> {
  const data = await gh<{ sha: string }>(cfg, '/git/blobs', {
    method: 'POST',
    body: JSON.stringify({ content: encodeBase64(text), encoding: 'base64' }),
  })
  return data.sha
}

export interface TreeWrite {
  path: string
  // null = cancella il file dal tree.
  sha: string | null
}

export async function createTree(cfg: GhConfig, baseTreeSha: string, entries: TreeWrite[]): Promise<string> {
  const data = await gh<{ sha: string }>(cfg, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: entries.map((e) => ({ path: e.path, mode: '100644', type: 'blob', sha: e.sha })),
    }),
  })
  return data.sha
}

export async function createCommit(
  cfg: GhConfig,
  message: string,
  treeSha: string,
  parentSha: string,
): Promise<string> {
  const data = await gh<{ sha: string }>(cfg, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: treeSha, parents: [parentSha] }),
  })
  return data.sha
}

export async function createRef(cfg: GhConfig, branch: string, sha: string): Promise<void> {
  await gh(cfg, '/git/refs', {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
  })
}

export async function updateRef(cfg: GhConfig, branch: string, sha: string): Promise<void> {
  await gh(cfg, `/git/refs/${encodeURIComponent(`heads/${branch}`)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha, force: false }),
  })
}

export interface PullInfo {
  number: number
  title: string
  html_url: string
  head: { ref: string }
  base: { ref: string }
}

export async function listOpenPulls(cfg: GhConfig): Promise<PullInfo[]> {
  return gh<PullInfo[]>(cfg, '/pulls?state=open&per_page=100')
}

export async function createPull(
  cfg: GhConfig,
  head: string,
  base: string,
  title: string,
  body: string,
): Promise<PullInfo> {
  return gh<PullInfo>(cfg, '/pulls', {
    method: 'POST',
    body: JSON.stringify({ head, base, title, body }),
  })
}

function decodeBase64(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(bin)
}
