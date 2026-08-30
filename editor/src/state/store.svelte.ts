// Store globale dell'editor (runes Svelte 5). Il modello è deep-reactive:
// i componenti mutano direttamente project; la dirtiness si calcola
// confrontando la serializzazione corrente con la baseline fatta al load.
import type { PullInfo } from '../github/api'
import type { GhConfig } from '../github/auth'
import { loadConfig } from '../github/auth'
import { BG_PREFIX, loadContent } from '../github/contentRepo'
import { parseProject } from '../model/parse'
import { serializeProject } from '../model/serialize'
import type { Issue, Project, SourceState } from '../types'
import { validate, validateBackgrounds } from '../model/validate'
import { parseFlagCondition, parseSetFlag } from '../vocab'
import { clearDraft } from './draft'

export type Tab = 'rooms' | 'items' | 'interactions' | 'dialogues' | 'variables' | 'backgrounds'

// Sfondo caricato o sostituito nell'editor, non ancora committato.
export interface BgUpload {
  base64: string
  mime: string
}

export interface BgState {
  uploads: Record<string, BgUpload>
  deletes: string[]
}

interface Store {
  config: GhConfig
  project: Project | null
  source: SourceState | null
  // Serializzazione del progetto com'era al load (o dopo l'ultimo save):
  // path -> testo. Ciò che differisce è "sporco".
  baseline: Record<string, string>
  // Modifiche binarie agli sfondi (frontend/public/bg/), fuori dalla baseline testuale.
  bg: BgState
  ui: {
    tab: Tab
    selectedRoom: string | null
    selectedDialogue: string | null
    settingsOpen: boolean
    saveOpen: boolean
    playOpen: boolean
  }
}

export const store: Store = $state({
  config: loadConfig(),
  project: null,
  source: null,
  baseline: {},
  bg: { uploads: {}, deletes: [] },
  ui: {
    tab: 'rooms',
    selectedRoom: null,
    selectedDialogue: null,
    settingsOpen: false,
    saveOpen: false,
    playOpen: false,
  },
})

export function currentFiles(): Record<string, string> {
  if (!store.project) return {}
  return serializeProject(store.project)
}

export interface Changes {
  writes: { path: string; content: string; encoding: 'utf-8' | 'base64'; added: boolean }[]
  deletes: string[]
}

export function pendingChanges(): Changes {
  const current = currentFiles()
  const writes: Changes['writes'] = Object.entries(current)
    .filter(([path, text]) => store.baseline[path] !== text)
    .map(([path, text]) => ({ path, content: text, encoding: 'utf-8', added: !(path in store.baseline) }))
  const existingBg = store.source?.bgFiles ?? []
  for (const [name, upload] of Object.entries(store.bg.uploads)) {
    writes.push({
      path: BG_PREFIX + name,
      content: upload.base64,
      encoding: 'base64',
      added: !existingBg.includes(name),
    })
  }
  const deletes = Object.keys(store.baseline).filter((path) => !(path in current))
  for (const name of store.bg.deletes) {
    if (existingBg.includes(name)) deletes.push(BG_PREFIX + name)
  }
  return { writes, deletes }
}

export function isDirty(): boolean {
  const { writes, deletes } = pendingChanges()
  return writes.length > 0 || deletes.length > 0
}

// Sfondi selezionabili: quelli sul ref, più i caricati, meno i cancellati.
export function availableBgFiles(): string[] {
  const names = new Set(store.source?.bgFiles ?? [])
  for (const name of Object.keys(store.bg.uploads)) names.add(name)
  for (const name of store.bg.deletes) names.delete(name)
  return [...names].sort()
}

export function issues(): Issue[] {
  if (!store.project) return []
  return [...validate(store.project), ...validateBackgrounds(store.project, availableBgFiles())]
}

// Chiamato dopo un load o un save riuscito: lo stato attuale diventa la baseline.
export function resetBaseline(): void {
  store.baseline = currentFiles()
}

// Carica i contenuti da un ref e li rende il progetto corrente.
// Scarta bozza e baseline precedenti: chi chiama gestisce la conferma.
export async function openRef(ref: string, pr?: PullInfo): Promise<void> {
  const loaded = await loadContent(store.config, ref)
  store.project = parseProject(loaded.files)
  store.bg = { uploads: {}, deletes: [] }
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
}

// Flag effettivamente usati in regole e dialoghi (tag Ink # set_flag).
export function usedFlags(): Set<string> {
  const names = new Set<string>()
  const project = store.project
  if (!project) return names
  for (const rule of project.rules) {
    for (const cond of rule.conditions ?? []) {
      if (typeof cond.flag === 'string') names.add(parseFlagCondition(cond.flag).name)
    }
    for (const action of rule.actions) {
      if (typeof action.set_flag === 'string') names.add(parseSetFlag(action.set_flag).name)
    }
  }
  for (const dialogue of project.dialogues) {
    for (const m of dialogue.source.matchAll(/#\s*set_flag:\s*(\w+)/g)) names.add(m[1])
  }
  names.delete('')
  return names
}

// Variabili selezionabili nelle tendine: dichiarate nel registro + già usate.
export function knownFlags(): string[] {
  const names = usedFlags()
  for (const variable of store.project?.variables ?? []) names.add(variable.id)
  return [...names].sort()
}
