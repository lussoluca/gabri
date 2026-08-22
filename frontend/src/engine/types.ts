export type Rect = [number, number, number, number]

export interface Hotspot {
  id: string
  name: string
  rect: Rect
  description?: string
  leads_to?: string
}

// Scala prospettica: il personaggio ha scala `max` a max_y (in basso,
// vicino alla camera) e `min` a min_y (in fondo alla scena).
export interface DepthScale {
  min_y: number
  max_y: number
  min: number
  max: number
}

export interface Room {
  id: string
  name: string
  color?: string
  background?: string
  player_start?: [number, number]
  walkboxes?: Rect[]
  depth_scale?: DepthScale
  hotspots: Hotspot[]
}

export interface Item {
  id: string
  name: string
  description?: string
  icon?: string
}

// Un'azione è un oggetto a chiave singola: {say: "..."}, {set_flag: "x = true"}, ecc.
export type Action = Record<string, string>

// Una condizione è un oggetto a chiave singola: {flag: "x == true"} o {has_item: "id"}.
export type Condition = Record<string, string>

export interface Rule {
  verb: string
  object?: string
  target: string
  conditions?: Condition[]
  actions: Action[]
}

export interface GameContent {
  start: { room: string }
  rooms: Record<string, Room>
  items: Record<string, Item>
  interactions: Rule[]
  dialogues: Record<string, unknown>
}

export type FlagValue = boolean | number | string

export interface GameState {
  room: string
  inventory: string[]
  flags: Record<string, FlagValue>
}

export const VERBS = ['look', 'take', 'use', 'talk', 'walk'] as const
export type Verb = (typeof VERBS)[number]

// Verbo di default stile SCUMM: dopo ogni azione la frase torna a "Vai".
export const DEFAULT_VERB: Verb = 'walk'

// Etichette mostrate al giocatore: gli identificatori restano in inglese,
// i testi visibili in italiano.
export const VERB_LABELS: Record<Verb, string> = {
  look: 'Guarda',
  take: 'Prendi',
  use: 'Usa',
  talk: 'Parla',
  walk: 'Vai',
}

export interface Selection {
  verb: Verb
  item: string | null
}
