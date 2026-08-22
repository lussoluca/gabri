import type {
  Action,
  Condition,
  FlagValue,
  GameContent,
  GameState,
  Rule,
} from './types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Listener = (...args: any[]) => void

// Emitter minimale: il motore non dipende da Phaser, così gira anche
// headless (test in Node).
class Emitter {
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return this
  }

  once(event: string, fn: Listener) {
    const wrapper: Listener = (...args) => {
      this.off(event, wrapper)
      fn(...args)
    }
    return this.on(event, wrapper)
  }

  off(event: string, fn: Listener) {
    this.listeners.get(event)?.delete(fn)
    return this
  }

  emit(event: string, ...args: unknown[]) {
    for (const fn of [...(this.listeners.get(event) ?? [])]) fn(...args)
    return this
  }
}

// Eventi emessi: 'say' (string), 'room' (roomId), 'inventory', 'dialogue' (nome), 'state'.
export class GameEngine extends Emitter {
  readonly content: GameContent
  state: GameState
  // Stanza di provenienza dell'ultimo cambio stanza: serve per far comparire
  // il personaggio accanto alla porta da cui è entrato. Null = usa player_start.
  previousRoom: string | null = null

  constructor(content: GameContent, saved?: GameState) {
    super()
    this.content = content
    this.state = saved ?? {
      room: content.start.room,
      inventory: [],
      flags: {},
    }
  }

  get room() {
    return this.content.rooms[this.state.room]
  }

  loadState(saved: GameState) {
    this.state = saved
    this.previousRoom = null
    this.emit('inventory')
    this.emit('room', saved.room)
  }

  interact(verb: string, targetId: string, objectId?: string) {
    const rule = this.findRule(verb, targetId, objectId)
    if (rule) {
      this.runActions(rule.actions)
      return
    }
    this.defaultResponse(verb, targetId, objectId)
  }

  private findRule(
    verb: string,
    target: string,
    object?: string,
  ): Rule | undefined {
    return this.content.interactions.find(
      (r) =>
        r.verb === verb &&
        r.target === target &&
        (r.object ?? null) === (object ?? null) &&
        (r.conditions ?? []).every((c) => this.evalCondition(c)),
    )
  }

  evalCondition(cond: Condition): boolean {
    if (cond.flag) {
      const m = cond.flag.match(/^(\w+)\s*(==|!=)\s*(.+)$/)
      if (!m) return Boolean(this.state.flags[cond.flag.trim()])
      const [, name, op, raw] = m
      const value = parseValue(raw.trim())
      const current = this.state.flags[name] ?? false
      return op === '==' ? current === value : current !== value
    }
    if (cond.has_item) return this.state.inventory.includes(cond.has_item)
    return true
  }

  runActions(actions: Action[]) {
    for (const a of actions) this.runAction(a)
  }

  runAction(a: Action) {
    if (a.say) this.emit('say', a.say)
    if (a.set_flag) {
      const m = a.set_flag.match(/^(\w+)\s*=\s*(.+)$/)
      if (m) this.state.flags[m[1]] = parseValue(m[2].trim())
      else this.state.flags[a.set_flag.trim()] = true
      this.emit('state')
    }
    if (a.add_item && !this.state.inventory.includes(a.add_item)) {
      this.state.inventory.push(a.add_item)
      this.emit('inventory')
    }
    if (a.remove_item) {
      this.state.inventory = this.state.inventory.filter(
        (i) => i !== a.remove_item,
      )
      this.emit('inventory')
    }
    if (a.goto_room) {
      this.previousRoom = this.state.room
      this.state.room = a.goto_room
      this.emit('room', a.goto_room)
    }
    if (a.dialogue) this.emit('dialogue', a.dialogue)
  }

  private defaultResponse(verb: string, targetId: string, objectId?: string) {
    const hotspot = this.room.hotspots.find((h) => h.id === targetId)
    const item = this.content.items[targetId]
    switch (verb) {
      case 'look':
        this.emit(
          'say',
          hotspot?.description ?? item?.description ?? 'Niente di speciale.',
        )
        break
      case 'walk':
        if (hotspot?.leads_to) {
          this.previousRoom = this.state.room
          this.state.room = hotspot.leads_to
          this.emit('room', hotspot.leads_to)
        } else {
          this.emit('say', 'Non posso andare lì.')
        }
        break
      case 'take':
        this.emit('say', 'Non posso prenderlo.')
        break
      case 'talk':
        this.emit('say', 'Non ottengo risposta.')
        break
      case 'use':
        this.emit('say', objectId ? 'Non funziona.' : 'Usare... con cosa?')
        break
      default:
        this.emit('say', 'Non succede niente.')
    }
  }
}

function parseValue(raw: string): FlagValue {
  if (raw === 'true') return true
  if (raw === 'false') return false
  const n = Number(raw)
  if (!Number.isNaN(n)) return n
  return raw.replace(/^"|"$/g, '')
}
