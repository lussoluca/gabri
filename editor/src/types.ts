import type { Item, Room, Rule } from '@game/engine/types'

// Modello editabile del progetto: array ordinati (l'ordine delle regole conta),
// dialoghi come sorgente Ink grezzo.
export interface Project {
  game: { start: { room: string } }
  rooms: Room[]
  items: Item[]
  rules: Rule[]
  dialogues: Dialogue[]
  variables: Variable[]
}

export interface Dialogue {
  name: string
  source: string
}

// Registro delle variabili (flag) di gioco: vive in content/variables.yaml,
// usato solo dall'editor (il motore crea i flag al primo set_flag).
export interface Variable {
  id: string
  description?: string
}

export interface Issue {
  severity: 'error' | 'warning'
  file: string
  message: string
}

// File di contenuto letto dal repo.
export interface LoadedFile {
  path: string
  sha: string
  text: string
}

// Stato della sorgente GitHub da cui è stato caricato il progetto.
export interface SourceState {
  ref: string
  headSha: string
  // Blob SHA per path al momento del load (per il check di staleness).
  shas: Record<string, string>
  // Nomi file disponibili in frontend/public/bg/.
  bgFiles: string[]
  // Branch su cui vanno i salvataggi (impostato al primo save o quando si
  // continua una PR aperta).
  saveBranch?: string
  prNumber?: number
  prUrl?: string
}
