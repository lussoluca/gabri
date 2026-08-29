// Operazioni ad alto livello sul repo: caricamento dei contenuti a un ref
// e salvataggio come commit atomico multi-file su un branch editor + PR.
import type { LoadedFile } from '../types'
import {
  createBlob,
  createCommit,
  createPull,
  createRef,
  createTree,
  getBlobText,
  getCommitTreeSha,
  getRefSha,
  getTree,
  listOpenPulls,
  updateRef,
  type PullInfo,
  type TreeWrite,
} from './api'
import type { GhConfig } from './auth'

export const CONTENT_PREFIX = 'content/'
export const BG_PREFIX = 'frontend/public/bg/'
export const EDITOR_BRANCH_PREFIX = 'editor/'

export interface LoadedContent {
  headSha: string
  files: LoadedFile[]
  bgFiles: string[]
}

function isContentFile(path: string): boolean {
  return path.startsWith(CONTENT_PREFIX) && (path.endsWith('.yaml') || path.endsWith('.ink'))
}

export async function loadContent(cfg: GhConfig, ref: string): Promise<LoadedContent> {
  const headSha = await getRefSha(cfg, ref)
  const treeSha = await getCommitTreeSha(cfg, headSha)
  const tree = await getTree(cfg, treeSha)

  const contentEntries = tree.filter((e) => e.type === 'blob' && isContentFile(e.path))
  const files = await Promise.all(
    contentEntries.map(async (e) => ({
      path: e.path,
      sha: e.sha,
      text: await getBlobText(cfg, e.sha),
    })),
  )
  const bgFiles = tree
    .filter((e) => e.type === 'blob' && e.path.startsWith(BG_PREFIX))
    .map((e) => e.path.slice(BG_PREFIX.length))

  return { headSha, files, bgFiles }
}

// PR aperte create dall'editor (head = editor/*).
export async function listEditorPulls(cfg: GhConfig): Promise<PullInfo[]> {
  const pulls = await listOpenPulls(cfg)
  return pulls.filter((p) => p.head.ref.startsWith(EDITOR_BRANCH_PREFIX))
}

export interface StaleFile {
  path: string
  upstreamSha: string | null
}

// Confronta gli SHA blob registrati al load con quelli attuali del branch:
// ritorna i path (tra quelli che stiamo per scrivere) cambiati upstream.
export async function findStaleFiles(
  cfg: GhConfig,
  branch: string,
  knownHeadSha: string,
  loadedShas: Record<string, string>,
  pathsToWrite: string[],
): Promise<StaleFile[]> {
  const headSha = await getRefSha(cfg, branch)
  if (headSha === knownHeadSha) return []
  const treeSha = await getCommitTreeSha(cfg, headSha)
  const tree = await getTree(cfg, treeSha)
  const upstream = new Map(tree.filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]))
  const stale: StaleFile[] = []
  for (const path of pathsToWrite) {
    const loaded = loadedShas[path]
    const current = upstream.get(path) ?? null
    if (loaded !== undefined && current !== loaded) stale.push({ path, upstreamSha: current })
    if (loaded === undefined && current !== null) stale.push({ path, upstreamSha: current })
  }
  return stale
}

export interface SaveRequest {
  branch: string
  message: string
  writes: { path: string; text: string }[]
  deletes: string[]
}

export interface SaveResult {
  commitSha: string
  // SHA dei blob scritti, per aggiornare lo stato locale senza ricaricare.
  blobShas: Record<string, string>
}

// Un salvataggio = un commit: blob per ogni file scritto, tree con base_tree
// sull'head del branch, commit, avanzamento del ref.
export async function saveCommit(cfg: GhConfig, req: SaveRequest): Promise<SaveResult> {
  const parentSha = await getRefSha(cfg, req.branch)
  const parentTreeSha = await getCommitTreeSha(cfg, parentSha)

  const blobShas: Record<string, string> = {}
  await Promise.all(
    req.writes.map(async (w) => {
      blobShas[w.path] = await createBlob(cfg, w.text)
    }),
  )

  const entries: TreeWrite[] = [
    ...req.writes.map((w) => ({ path: w.path, sha: blobShas[w.path] })),
    ...req.deletes.map((path) => ({ path, sha: null })),
  ]
  const treeSha = await createTree(cfg, parentTreeSha, entries)
  const commitSha = await createCommit(cfg, req.message, treeSha, parentSha)
  await updateRef(cfg, req.branch, commitSha)
  return { commitSha, blobShas }
}

export function newEditorBranchName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    EDITOR_BRANCH_PREFIX +
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `-${pad(now.getHours())}${pad(now.getMinutes())}`
  )
}

export async function createEditorBranch(cfg: GhConfig, fromSha: string, branch: string): Promise<void> {
  await createRef(cfg, branch, fromSha)
}

export async function openPull(
  cfg: GhConfig,
  branch: string,
  base: string,
  title: string,
): Promise<PullInfo> {
  const body = [
    'Modifiche ai contenuti create con l\'editor online (`/editor`).',
    '',
    'Nota: i file YAML riscritti dall\'editor perdono i commenti; i file non toccati restano invariati.',
  ].join('\n')
  return createPull(cfg, branch, base, title, body)
}
