import Phaser from 'phaser'
import { GAME_WIDTH, ROOM_HEIGHT } from '../config'
import type { GameEngine } from '../engine/engine'
import type { Hotspot, Selection } from '../engine/types'
import { DEFAULT_VERB } from '../engine/types'
import { findPath, nearestWalkable } from '../engine/walk'

export class RoomScene extends Phaser.Scene {
  private engine!: GameEngine
  private player!: Phaser.GameObjects.Rectangle
  private walkChain?: Phaser.Tweens.TweenChain
  private speech?: Phaser.GameObjects.Text
  private speechTimer?: Phaser.Time.TimerEvent

  constructor() {
    super('room')
  }

  create() {
    this.engine = this.registry.get('engine') as GameEngine
    this.input.mouse?.disableContextMenu()
    this.input.setDefaultCursor('crosshair')

    this.engine.once('room', () => this.scene.restart())
    const sayHandler = (text: string) => this.showSpeech(text)
    this.engine.on('say', sayHandler)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.engine.off('say', sayHandler)
      this.game.events.emit('hover', null)
    })

    this.drawRoom()
  }

  update() {
    // Scala prospettica: più il personaggio è in alto (lontano), più è piccolo.
    const ds = this.engine.room.depth_scale
    if (ds && this.player) {
      const t = Phaser.Math.Clamp(
        (this.player.y - ds.min_y) / (ds.max_y - ds.min_y),
        0,
        1,
      )
      this.player.setScale(ds.min + (ds.max - ds.min) * t)
    }
  }

  private drawRoom() {
    const room = this.engine.room

    // Sfondo: immagine se dichiarata e caricata, altrimenti colore pieno.
    const bgKey = `bg-${room.id}`
    if (room.background && this.textures.exists(bgKey)) {
      this.add
        .image(0, 0, bgKey)
        .setOrigin(0)
        .setDisplaySize(GAME_WIDTH, ROOM_HEIGHT)
    } else {
      const color = Phaser.Display.Color.HexStringToColor(
        room.color ?? '#223344',
      ).color
      this.add
        .rectangle(0, 0, GAME_WIDTH, ROOM_HEIGHT, color)
        .setOrigin(0)
    }
    // Zona di click per camminare, sopra lo sfondo e sotto gli hotspot.
    const clickZone = this.add
      .rectangle(0, 0, GAME_WIDTH, ROOM_HEIGHT, 0x000000, 0)
      .setOrigin(0)
      .setInteractive()
    clickZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) return
      this.walkTo(pointer.x, pointer.y)
    })

    // Walkbox visibili finché la grafica è placeholder.
    for (const [wx, wy, ww, wh] of room.walkboxes ?? []) {
      this.add
        .rectangle(wx + ww / 2, wy + wh / 2, ww, wh, 0x44ff88, 0.06)
        .setStrokeStyle(1, 0x44ff88, 0.25)
    }

    this.add.text(12, 10, room.nome, {
      color: '#ffffff',
      fontSize: '16px',
      fontStyle: 'bold',
    })

    for (const hotspot of room.hotspots) {
      this.drawHotspot(hotspot)
    }

    // Spawn accanto alla porta da cui si è entrati; player_start come fallback
    // (avvio partita, caricamento salvataggio, nessuna porta di ritorno).
    let [px, py] = room.player_start ?? [140, 400]
    const prev = this.engine.previousRoom
    const door = prev
      ? room.hotspots.find((h) => h.porta_a === prev)
      : undefined
    if (door) {
      const [dx, dy, dw, dh] = door.rect
      const spawn = nearestWalkable(room.walkboxes ?? [], {
        x: dx + dw / 2,
        y: dy + dh,
      })
      px = spawn.x
      py = spawn.y
    }
    this.player = this.add.rectangle(px, py, 24, 48, 0xffcc66)
  }

  private drawHotspot(hotspot: Hotspot) {
    const [x, y, w, h] = hotspot.rect
    const zone = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, 0x88aaff, 0.15)
      .setStrokeStyle(1, 0x88aaff, 0.6)
      .setInteractive({ useHandCursor: true })

    zone.on('pointerover', () => this.game.events.emit('hover', hotspot.nome))
    zone.on('pointerout', () => this.game.events.emit('hover', null))
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ci si avvicina al bordo inferiore dell'hotspot (il pathfinding
      // aggancia comunque il punto camminabile più vicino).
      const hx = x + w / 2
      const hy = y + h
      if (pointer.rightButtonDown()) {
        // Click destro: azione rapida "guarda", senza toccare la frase corrente.
        this.walkTo(hx, hy, () => this.engine.interact('guarda', hotspot.id))
      } else {
        this.walkTo(hx, hy, () => this.applyVerb(hotspot))
      }
    })
  }

  private applyVerb(hotspot: Hotspot) {
    const selection = this.registry.get('selection') as Selection
    if (selection.verb === 'usa' && selection.item) {
      this.engine.interact('usa', hotspot.id, selection.item)
    } else {
      this.engine.interact(selection.verb, hotspot.id)
    }
    selection.verb = DEFAULT_VERB
    selection.item = null
    this.game.events.emit('selection-changed')
  }

  // Testo parlato sopra la testa del personaggio, stile SCUMM.
  private showSpeech(text: string) {
    this.speech?.destroy()
    this.speechTimer?.remove()
    const x = Phaser.Math.Clamp(this.player.x, 80, GAME_WIDTH - 80)
    this.speech = this.add
      .text(x, this.player.y - 40, text, {
        color: '#ffffff',
        fontSize: '16px',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
        wordWrap: { width: 420 },
      })
      .setOrigin(0.5, 1)
      .setDepth(20)
    const duration = Math.max(1800, text.length * 60)
    this.speechTimer = this.time.delayedCall(duration, () => {
      this.speech?.destroy()
      this.speech = undefined
    })
  }

  private walkTo(x: number, y: number, onArrive?: () => void) {
    const boxes = this.engine.room.walkboxes ?? []
    const from = { x: this.player.x, y: this.player.y }

    let points: { x: number; y: number }[]
    if (boxes.length === 0) {
      // Senza walkbox: movimento libero solo in orizzontale.
      points = [{ x, y: from.y }]
    } else {
      points = findPath(boxes, from, { x, y })
      if (points.length === 0) return // meta non raggiungibile
    }

    this.walkChain?.stop()
    this.tweens.killTweensOf(this.player)

    let prev = from
    const tweens = points.map((p) => {
      const d = Phaser.Math.Distance.Between(prev.x, prev.y, p.x, p.y)
      prev = p
      return { x: p.x, y: p.y, duration: Math.max(1, d * 2.5), ease: 'Linear' }
    })
    this.walkChain = this.tweens.chain({
      targets: this.player,
      tweens,
      onComplete: () => {
        this.walkChain = undefined
        onArrive?.()
      },
    })
  }
}
