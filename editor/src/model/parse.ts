// File di contenuto -> Project editabile. Mappatura identica a
// scripts/build-content.mjs, ma i dialoghi restano sorgente Ink grezzo.
import type { Item, Room, Rule } from '@game/engine/types'
import { parse } from 'yaml'
import type { LoadedFile, Project, Variable } from '../types'

export function parseProject(files: LoadedFile[]): Project {
  const project: Project = {
    game: { start: { room: '' } },
    rooms: [],
    items: [],
    rules: [],
    dialogues: [],
    variables: [],
  }

  for (const file of files) {
    if (file.path === 'content/game.yaml') {
      const game = parse(file.text) as { start?: { room?: string } } | null
      project.game = { start: { room: game?.start?.room ?? '' } }
    } else if (file.path === 'content/variables.yaml') {
      project.variables = ((parse(file.text) as Variable[] | null) ?? []).map((v) => ({ ...v }))
    } else if (file.path === 'content/items.yaml') {
      project.items = ((parse(file.text) as Item[] | null) ?? []).map((item) => ({ ...item }))
    } else if (file.path === 'content/interactions.yaml') {
      project.rules = ((parse(file.text) as Rule[] | null) ?? []).map((rule) => ({
        ...rule,
        conditions: rule.conditions?.map((c) => ({ ...c })),
        actions: (rule.actions ?? []).map((a) => ({ ...a })),
      }))
    } else if (file.path.startsWith('content/rooms/') && file.path.endsWith('.yaml')) {
      const room = parse(file.text) as Room | null
      if (room && room.id) {
        room.hotspots = (room.hotspots ?? []).map((h) => ({ ...h }))
        project.rooms.push(room)
      }
    } else if (file.path.startsWith('content/dialogues/') && file.path.endsWith('.ink')) {
      const name = file.path.slice('content/dialogues/'.length, -'.ink'.length)
      project.dialogues.push({ name, source: file.text })
    }
  }

  project.rooms.sort((a, b) => a.id.localeCompare(b.id))
  project.dialogues.sort((a, b) => a.name.localeCompare(b.name))
  return project
}
