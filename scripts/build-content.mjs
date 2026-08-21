// Compila i contenuti di gioco (YAML + Ink) in un singolo JSON servito al frontend.
// Output: frontend/public/content/game.json
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import yaml from 'js-yaml'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const contentDir = path.join(root, 'content')
const outDir = path.join(root, 'frontend', 'public', 'content')

function loadYaml(file) {
  return yaml.load(readFileSync(file, 'utf8'))
}

function listFiles(dir, ext) {
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(ext))
      .map((f) => path.join(dir, f))
  } catch {
    return []
  }
}

const rooms = {}
for (const file of listFiles(path.join(contentDir, 'rooms'), '.yaml')) {
  const room = loadYaml(file)
  rooms[room.id] = room
}

const items = {}
for (const item of loadYaml(path.join(contentDir, 'items.yaml')) ?? []) {
  items[item.id] = item
}

const interactions = loadYaml(path.join(contentDir, 'interactions.yaml')) ?? []
const game = loadYaml(path.join(contentDir, 'game.yaml'))

// Dialoghi Ink: compilati in JSON con il compilatore inkjs.
const dialogues = {}
const inkFiles = listFiles(path.join(contentDir, 'dialogues'), '.ink')
if (inkFiles.length > 0) {
  let Compiler
  try {
    const mod = await import('inkjs/full')
    Compiler = mod.Compiler ?? mod.default?.Compiler
  } catch (err) {
    console.error('inkjs/full non disponibile, dialoghi saltati:', err.message)
  }
  if (Compiler) {
    for (const file of inkFiles) {
      const name = path.basename(file, '.ink')
      const source = readFileSync(file, 'utf8')
      const story = new Compiler(source).Compile()
      dialogues[name] = JSON.parse(story.ToJson())
    }
  }
}

const output = { start: game.start, rooms, items, interactions, dialogues }
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'game.json'), JSON.stringify(output, null, 2))
console.log(
  `game.json: ${Object.keys(rooms).length} stanze, ${Object.keys(items).length} oggetti, ` +
    `${interactions.length} interazioni, ${Object.keys(dialogues).length} dialoghi`,
)
