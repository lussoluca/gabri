// Store globale dell'editor (runes Svelte 5). Il modello è deep-reactive:
// i componenti mutano direttamente project; la dirtiness si calcola
// confrontando la serializzazione corrente con la baseline fatta al load.
import type { GhConfig } from '../github/auth'
import { loadConfig } from '../github/auth'
import { serializeProject } from '../model/serialize'
import type { Issue, Project, SourceState } from '../types'
import { validate, validateBackgrounds } from '../model/validate'
import { parseFlagCondition, parseSetFlag } from '../vocab'

export type Tab = 'rooms' | 'items' | 'interactions' | 'dialogues' | 'variables'

interface Store {
  config: GhConfig
  project: Project | null
  source: SourceState | null
  // Serializzazione del progetto com'era al load (o dopo l'ultimo save):
  // path -> testo. Ciò che differisce è "sporco".
  baseline: Record<string, string>
  ui: {
    tab: Tab
    selectedRoom: string | null
    selectedDialogue: string | null
    settingsOpen: boolean
    saveOpen: boolean
  }
}

export const store: Store = $state({
  config: loadConfig(),
  project: null,
  source: null,
  baseline: {},
  ui: {
    tab: 'rooms',
    selectedRoom: null,
    selectedDialogue: null,
    settingsOpen: false,
    saveOpen: false,
  },
})

export function currentFiles(): Record<string, string> {
  if (!store.project) return {}
  return serializeProject(store.project)
}

export interface Changes {
  writes: { path: string; text: string }[]
  deletes: string[]
}

export function pendingChanges(): Changes {
  const current = currentFiles()
  const writes = Object.entries(current)
    .filter(([path, text]) => store.baseline[path] !== text)
    .map(([path, text]) => ({ path, text }))
  const deletes = Object.keys(store.baseline).filter((path) => !(path in current))
  return { writes, deletes }
}

export function isDirty(): boolean {
  const { writes, deletes } = pendingChanges()
  return writes.length > 0 || deletes.length > 0
}

export function issues(): Issue[] {
  if (!store.project) return []
  return [...validate(store.project), ...validateBackgrounds(store.project, store.source?.bgFiles ?? [])]
}

// Chiamato dopo un load o un save riuscito: lo stato attuale diventa la baseline.
export function resetBaseline(): void {
  store.baseline = currentFiles()
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
