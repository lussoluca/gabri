import Phaser from 'phaser'
import type {
  Action,
  Condition,
  FlagValue,
  GameContent,
  GameState,
  Rule,
} from './types'

// Eventi emessi: 'say' (string), 'room' (roomId), 'inventory', 'dialogue' (nome), 'state'.
export class GameEngine extends Phaser.Events.EventEmitter {
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
      inventario: [],
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

  interact(verbo: string, targetId: string, oggettoId?: string) {
    const rule = this.findRule(verbo, targetId, oggettoId)
    if (rule) {
      this.runActions(rule.azioni)
      return
    }
    this.defaultResponse(verbo, targetId, oggettoId)
  }

  private findRule(
    verbo: string,
    target: string,
    oggetto?: string,
  ): Rule | undefined {
    return this.content.interactions.find(
      (r) =>
        r.verbo === verbo &&
        r.target === target &&
        (r.oggetto ?? null) === (oggetto ?? null) &&
        (r.condizioni ?? []).every((c) => this.evalCondition(c)),
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
    if (cond.has_item) return this.state.inventario.includes(cond.has_item)
    return true
  }

  runActions(azioni: Action[]) {
    for (const a of azioni) this.runAction(a)
  }

  runAction(a: Action) {
    if (a.say) this.emit('say', a.say)
    if (a.set_flag) {
      const m = a.set_flag.match(/^(\w+)\s*=\s*(.+)$/)
      if (m) this.state.flags[m[1]] = parseValue(m[2].trim())
      else this.state.flags[a.set_flag.trim()] = true
      this.emit('state')
    }
    if (a.add_item && !this.state.inventario.includes(a.add_item)) {
      this.state.inventario.push(a.add_item)
      this.emit('inventory')
    }
    if (a.remove_item) {
      this.state.inventario = this.state.inventario.filter(
        (i) => i !== a.remove_item,
      )
      this.emit('inventory')
    }
    if (a.goto_room) {
      this.previousRoom = this.state.room
      this.state.room = a.goto_room
      this.emit('room', a.goto_room)
    }
    if (a.dialogo) this.emit('dialogue', a.dialogo)
  }

  private defaultResponse(verbo: string, targetId: string, oggettoId?: string) {
    const hotspot = this.room.hotspots.find((h) => h.id === targetId)
    const item = this.content.items[targetId]
    switch (verbo) {
      case 'guarda':
        this.emit(
          'say',
          hotspot?.descrizione ?? item?.descrizione ?? 'Niente di speciale.',
        )
        break
      case 'vai':
        if (hotspot?.porta_a) {
          this.previousRoom = this.state.room
          this.state.room = hotspot.porta_a
          this.emit('room', hotspot.porta_a)
        } else {
          this.emit('say', 'Non posso andare lì.')
        }
        break
      case 'prendi':
        this.emit('say', 'Non posso prenderlo.')
        break
      case 'parla':
        this.emit('say', 'Non ottengo risposta.')
        break
      case 'usa':
        this.emit(
          'say',
          oggettoId ? 'Non funziona.' : 'Usare... con cosa?',
        )
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
