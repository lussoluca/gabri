// Vocabolario di azioni e condizioni riconosciute dal motore.
// Deve restare allineato a frontend/src/engine/engine.ts (runAction/checkCondition).
export const ACTION_KEYS = [
  'say',
  'set_flag',
  'add_item',
  'remove_item',
  'goto_room',
  'dialogue',
] as const

export const CONDITION_KEYS = ['flag', 'has_item'] as const

export type ActionKey = (typeof ACTION_KEYS)[number]
export type ConditionKey = (typeof CONDITION_KEYS)[number]

// Sintassi delle espressioni, come i regex del motore.
export const FLAG_CONDITION_RE = /^(\w+)\s*(==|!=)\s*(.+)$/
export const SET_FLAG_RE = /^(\w+)\s*=\s*(.+)$/

// Rappresentazione strutturata delle espressioni, per l'editing a tendine.
export interface FlagExpr {
  name: string
  op: '==' | '!='
  value: string
}

export function parseFlagCondition(raw: string): FlagExpr {
  const m = raw.match(FLAG_CONDITION_RE)
  if (m) return { name: m[1], op: m[2] as '==' | '!=', value: m[3].trim() }
  // Forma abbreviata del motore: il solo nome equivale a "nome == true".
  return { name: raw.trim(), op: '==', value: 'true' }
}

export function composeFlagCondition(expr: FlagExpr): string {
  return `${expr.name} ${expr.op} ${expr.value}`
}

export function parseSetFlag(raw: string): { name: string; value: string } {
  const m = raw.match(SET_FLAG_RE)
  if (m) return { name: m[1], value: m[2].trim() }
  return { name: raw.trim(), value: 'true' }
}

export function composeSetFlag(name: string, value: string): string {
  return `${name} = ${value}`
}

export { VERBS, VERB_LABELS } from '@game/engine/types'
export { GAME_WIDTH, ROOM_HEIGHT } from '@game/config'
