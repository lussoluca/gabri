import Phaser from 'phaser'
import { GameEngine } from '../engine/engine'
import type { GameContent, Selection } from '../engine/types'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  async create() {
    const text = this.add.text(480, 300, 'Caricamento...', {
      color: '#ffffff',
      fontSize: '20px',
    })
    text.setOrigin(0.5)

    // no-store: i contenuti cambiano spesso durante la scrittura della storia,
    // una copia in cache del browser farebbe giocare una versione vecchia.
    const res = await fetch(`${import.meta.env.BASE_URL}content/game.json`, {
      cache: 'no-store',
    })
    const content: GameContent = await res.json()

    const engine = new GameEngine(content)
    const selection: Selection = { verb: 'guarda', item: null }
    this.registry.set('engine', engine)
    this.registry.set('selection', selection)
    // Hook di debug per test end-to-end (Playwright) e console del browser.
    ;(window as unknown as Record<string, unknown>).__engine = engine
    ;(window as unknown as Record<string, unknown>).__game = this.game

    // Sfondi dichiarati dalle stanze, caricati come texture "bg-<idStanza>".
    const withBg = Object.values(content.rooms).filter((r) => r.background)
    if (withBg.length > 0) {
      for (const room of withBg) {
        this.load.image(
          `bg-${room.id}`,
          `${import.meta.env.BASE_URL}bg/${room.background}`,
        )
      }
      this.load.once('complete', () => this.startGame())
      this.load.start()
    } else {
      this.startGame()
    }
  }

  private startGame() {
    this.scene.start('room')
    this.scene.launch('ui')
  }
}
