// Controlli di coerenza incrociata sul progetto. Gli errori bloccano il
// salvataggio (con override esplicito); i warning sono informativi.
import type { Rect } from '@game/engine/types'
import type { Issue, Project } from '../types'
import {
  ACTION_KEYS,
  CONDITION_KEYS,
  FLAG_CONDITION_RE,
  GAME_WIDTH,
  ROOM_HEIGHT,
  SET_FLAG_RE,
  VERBS,
} from '../vocab'

const ID_RE = /^[a-z][a-z0-9_]*$/

function rectInside(rect: Rect): boolean {
  const [x, y, w, h] = rect
  return x >= 0 && y >= 0 && x + w <= GAME_WIDTH && y + h <= ROOM_HEIGHT
}

function pointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect[0] && x <= rect[0] + rect[2] && y >= rect[1] && y <= rect[1] + rect[3]
}

export function validate(project: Project): Issue[] {
  const issues: Issue[] = []
  const error = (file: string, message: string) => issues.push({ severity: 'error', file, message })
  const warning = (file: string, message: string) => issues.push({ severity: 'warning', file, message })

  const roomIds = new Set<string>()
  const hotspotIds = new Set<string>()
  const itemIds = new Set<string>()
  const dialogueNames = new Set(project.dialogues.map((d) => d.name))

  for (const item of project.items) {
    const file = 'content/items.yaml'
    if (!ID_RE.test(item.id)) error(file, `Id oggetto non valido: "${item.id}"`)
    if (itemIds.has(item.id)) error(file, `Id oggetto duplicato: "${item.id}"`)
    itemIds.add(item.id)
    if (!item.name) error(file, `L'oggetto "${item.id}" non ha un nome`)
  }

  for (const room of project.rooms) {
    const file = `content/rooms/${room.id}.yaml`
    if (!ID_RE.test(room.id)) error(file, `Id stanza non valido: "${room.id}"`)
    if (roomIds.has(room.id)) error(file, `Id stanza duplicato: "${room.id}"`)
    roomIds.add(room.id)
    if (!room.name) error(file, `La stanza "${room.id}" non ha un nome`)

    const seen = new Set<string>()
    for (const h of room.hotspots) {
      if (!ID_RE.test(h.id)) error(file, `Id hotspot non valido: "${h.id}"`)
      if (seen.has(h.id)) error(file, `Id hotspot duplicato nella stanza "${room.id}": "${h.id}"`)
      seen.add(h.id)
      hotspotIds.add(h.id)
      if (!rectInside(h.rect)) {
        warning(file, `L'hotspot "${h.id}" esce dall'area di gioco ${GAME_WIDTH}x${ROOM_HEIGHT}`)
      }
    }
    for (const [i, box] of (room.walkboxes ?? []).entries()) {
      if (!rectInside(box)) {
        warning(file, `Il walkbox #${i + 1} esce dall'area di gioco ${GAME_WIDTH}x${ROOM_HEIGHT}`)
      }
    }
    if (room.player_start && room.walkboxes && room.walkboxes.length > 0) {
      const [x, y] = room.player_start
      if (!room.walkboxes.some((box) => pointInRect(x, y, box))) {
        warning(file, `player_start della stanza "${room.id}" è fuori da tutti i walkbox`)
      }
    }
  }

  // Riferimenti tra stanze (leads_to) dopo aver raccolto tutti gli id.
  for (const room of project.rooms) {
    const file = `content/rooms/${room.id}.yaml`
    for (const h of room.hotspots) {
      if (h.leads_to && !roomIds.has(h.leads_to)) {
        error(file, `L'hotspot "${h.id}" porta a una stanza inesistente: "${h.leads_to}"`)
      }
    }
  }

  if (!project.game.start.room) {
    error('content/game.yaml', 'Stanza iniziale non impostata')
  } else if (!roomIds.has(project.game.start.room)) {
    error('content/game.yaml', `Stanza iniziale inesistente: "${project.game.start.room}"`)
  }

  const rulesFile = 'content/interactions.yaml'
  const unconditioned = new Set<string>()
  project.rules.forEach((rule, index) => {
    const label = `Regola #${index + 1} (${rule.verb} ${rule.object ?? ''} ${rule.target})`.replace(/\s+/g, ' ')
    if (!(VERBS as readonly string[]).includes(rule.verb)) {
      error(rulesFile, `${label}: verbo sconosciuto "${rule.verb}"`)
    }
    if (!rule.target) {
      error(rulesFile, `${label}: target mancante`)
    } else if (!hotspotIds.has(rule.target) && !itemIds.has(rule.target)) {
      error(rulesFile, `${label}: target "${rule.target}" non è né un hotspot né un oggetto`)
    }
    if (rule.object && !itemIds.has(rule.object)) {
      error(rulesFile, `${label}: object "${rule.object}" non è un oggetto dell'inventario`)
    }

    for (const cond of rule.conditions ?? []) {
      const keys = Object.keys(cond)
      if (keys.length !== 1) {
        error(rulesFile, `${label}: una condizione deve avere esattamente una chiave`)
        continue
      }
      const key = keys[0]
      const value = cond[key]
      if (!(CONDITION_KEYS as readonly string[]).includes(key)) {
        error(rulesFile, `${label}: condizione sconosciuta "${key}"`)
      } else if (key === 'flag' && !FLAG_CONDITION_RE.test(value) && !/^\w+$/.test(value)) {
        error(rulesFile, `${label}: espressione flag non valida "${value}" (atteso "nome == valore")`)
      } else if (key === 'has_item' && !itemIds.has(value)) {
        error(rulesFile, `${label}: has_item su oggetto inesistente "${value}"`)
      }
    }

    if (rule.actions.length === 0) warning(rulesFile, `${label}: nessuna azione`)
    for (const action of rule.actions) {
      const keys = Object.keys(action)
      if (keys.length !== 1) {
        error(rulesFile, `${label}: un'azione deve avere esattamente una chiave`)
        continue
      }
      const key = keys[0]
      const value = action[key]
      if (!(ACTION_KEYS as readonly string[]).includes(key)) {
        error(rulesFile, `${label}: azione sconosciuta "${key}"`)
      } else if (key === 'set_flag' && !SET_FLAG_RE.test(value)) {
        error(rulesFile, `${label}: espressione set_flag non valida "${value}" (atteso "nome = valore")`)
      } else if ((key === 'add_item' || key === 'remove_item') && !itemIds.has(value)) {
        error(rulesFile, `${label}: ${key} su oggetto inesistente "${value}"`)
      } else if (key === 'goto_room' && !roomIds.has(value)) {
        error(rulesFile, `${label}: goto_room verso stanza inesistente "${value}"`)
      } else if (key === 'dialogue' && !dialogueNames.has(value)) {
        error(rulesFile, `${label}: dialogo inesistente "${value}"`)
      }
    }

    // Shadowing: una regola precedente senza condizioni con la stessa tripla
    // rende questa irraggiungibile (vince la prima che matcha).
    const tripleKey = `${rule.verb}|${rule.object ?? ''}|${rule.target}`
    if (unconditioned.has(tripleKey)) {
      warning(rulesFile, `${label}: irraggiungibile, oscurata da una regola precedente senza condizioni`)
    }
    if (!rule.conditions || rule.conditions.length === 0) unconditioned.add(tripleKey)
  })

  return issues
}

// Warning sui background mancanti: richiede la lista dei file in bg/.
export function validateBackgrounds(project: Project, bgFiles: string[]): Issue[] {
  const issues: Issue[] = []
  for (const room of project.rooms) {
    if (room.background && !bgFiles.includes(room.background)) {
      issues.push({
        severity: 'warning',
        file: `content/rooms/${room.id}.yaml`,
        message: `Sfondo "${room.background}" non trovato in frontend/public/bg/`,
      })
    }
  }
  return issues
}
