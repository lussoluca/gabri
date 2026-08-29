// Project -> testo dei file di contenuto. La mappa risultante definisce anche
// quali file esistono: un path presente nella baseline ma assente qui va
// cancellato dal commit (stanza/dialogo rimossi o rinominati).
import type { Room, Rule } from '@game/engine/types'
import { Document, isScalar, visit } from 'yaml'
import type { Project } from '../types'

// Dump YAML con sequenze di soli numeri e mappe di soli numeri in flow style,
// per restare vicini alla formattazione a mano dei file esistenti
// (rect: [x, y, w, h], depth_scale: { min_y: ..., ... }).
export function dumpYaml(value: unknown): string {
  const doc = new Document(value)
  visit(doc, {
    Seq(_, node) {
      if (node.items.every((i) => isScalar(i) && typeof i.value === 'number')) {
        node.flow = true
      }
    },
    Map(_, node) {
      const scalarNumbers = node.items.every(
        (pair) => isScalar(pair.value) && typeof pair.value.value === 'number',
      )
      if (node.items.length > 0 && scalarNumbers && node !== doc.contents) {
        node.flow = true
      }
    },
  })
  return doc.toString({ lineWidth: 100 })
}

// Copia senza chiavi undefined/null e senza campi vuoti opzionali,
// così il YAML non si riempie di `conditions: null`.
function cleanRule(rule: Rule): Rule {
  const out: Rule = { verb: rule.verb, target: rule.target, actions: rule.actions }
  if (rule.object) out.object = rule.object
  if (rule.conditions && rule.conditions.length > 0) out.conditions = rule.conditions
  return out
}

function cleanRoom(room: Room): Room {
  const out: Room = { id: room.id, name: room.name, hotspots: [] }
  if (room.color) out.color = room.color
  if (room.background) out.background = room.background
  if (room.player_start) out.player_start = room.player_start
  if (room.walkboxes && room.walkboxes.length > 0) out.walkboxes = room.walkboxes
  if (room.depth_scale) out.depth_scale = room.depth_scale
  out.hotspots = room.hotspots.map((h) => {
    const hs: (typeof room.hotspots)[number] = { id: h.id, name: h.name, rect: h.rect }
    if (h.description) hs.description = h.description
    if (h.leads_to) hs.leads_to = h.leads_to
    return hs
  })
  return out
}

export function serializeProject(project: Project): Record<string, string> {
  const files: Record<string, string> = {}
  files['content/game.yaml'] = dumpYaml(project.game)
  files['content/items.yaml'] = dumpYaml(
    project.items.map((item) => {
      const out: typeof item = { id: item.id, name: item.name }
      if (item.description) out.description = item.description
      if (item.icon) out.icon = item.icon
      return out
    }),
  )
  files['content/interactions.yaml'] = dumpYaml(project.rules.map(cleanRule))
  for (const room of project.rooms) {
    files[`content/rooms/${room.id}.yaml`] = dumpYaml(cleanRoom(room))
  }
  for (const dialogue of project.dialogues) {
    files[`content/dialogues/${dialogue.name}.ink`] =
      dialogue.source.endsWith('\n') || dialogue.source === '' ? dialogue.source : dialogue.source + '\n'
  }
  return files
}
