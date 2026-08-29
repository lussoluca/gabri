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

export { VERBS, VERB_LABELS } from '@game/engine/types'
export { GAME_WIDTH, ROOM_HEIGHT } from '@game/config'
