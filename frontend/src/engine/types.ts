export type Rect = [number, number, number, number]

export interface Hotspot {
  id: string
  nome: string
  rect: Rect
  descrizione?: string
  porta_a?: string
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
  nome: string
  color?: string
  background?: string
  player_start?: [number, number]
  walkboxes?: Rect[]
  depth_scale?: DepthScale
  hotspots: Hotspot[]
}

export interface Item {
  id: string
  nome: string
  descrizione?: string
  icona?: string
}

// Un'azione è un oggetto a chiave singola: {say: "..."}, {set_flag: "x = true"}, ecc.
export type Action = Record<string, string>

// Una condizione è un oggetto a chiave singola: {flag: "x == true"} o {has_item: "id"}.
export type Condition = Record<string, string>

export interface Rule {
  verbo: string
  oggetto?: string
  target: string
  condizioni?: Condition[]
  azioni: Action[]
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
  inventario: string[]
  flags: Record<string, FlagValue>
}

export const VERBS = ['guarda', 'prendi', 'usa', 'parla', 'vai'] as const
export type Verb = (typeof VERBS)[number]

// Verbo di default stile SCUMM: dopo ogni azione la frase torna a "Vai".
export const DEFAULT_VERB: Verb = 'vai'

export interface Selection {
  verb: Verb
  item: string | null
}
