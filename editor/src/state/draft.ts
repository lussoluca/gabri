// Bozza non salvata in localStorage: sopravvive a refresh e chiusura del tab.
import type { Project, SourceState } from '../types'

const KEY = 'gabri-editor.draft'

export interface Draft {
  savedAt: string
  source: SourceState
  baseline: Record<string, string>
  project: Project
}

export function saveDraft(draft: Draft): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft))
  } catch {
    // quota piena o storage disabilitato: la bozza è best-effort
  }
}

export function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as Draft
  } catch {
    return null
  }
}

export function clearDraft(): void {
  localStorage.removeItem(KEY)
}
