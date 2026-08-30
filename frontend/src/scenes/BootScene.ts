import Phaser from 'phaser'
import { GameEngine } from '../engine/engine'
import type { GameContent, GameState, Selection } from '../engine/types'
import { DEFAULT_VERB } from '../engine/types'

// Payload inviato dall'editor via postMessage quando il gioco gira in
// modalità preview (?preview=1 dentro un iframe): contenuti compilati,
// sfondi come data URL (il ref potrebbe non essere deployato) e stato
// iniziale opzionale (stanza, flag, inventario).
interface PreviewPayload {
  type: 'gabri-preview'
  content: GameContent
  // background filename -> data URL
  backgrounds?: Record<string, string>
  state?: GameState
}

function waitForPreviewPayload(): Promise<PreviewPayload> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as PreviewPayload | undefined
      if (data && data.type === 'gabri-preview' && data.content) {
        window.removeEventListener('message', onMessage)
        resolve(data)
      }
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'gabri-preview-ready' }, '*')
  })
}

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

    const preview = new URLSearchParams(window.location.search).has('preview')
    this.registry.set('preview', preview)

    let content: GameContent
    let backgrounds: Record<string, string> | null = null
    let initialState: GameState | undefined
    if (preview) {
      text.setText("In attesa dei contenuti dall'editor...")
      const payload = await waitForPreviewPayload()
      content = payload.content
      backgrounds = payload.backgrounds ?? {}
      initialState = payload.state
    } else {
      // no-store: i contenuti cambiano spesso durante la scrittura della storia,
      // una copia in cache del browser farebbe giocare una versione vecchia.
      const res = await fetch(`${import.meta.env.BASE_URL}content/game.json`, {
        cache: 'no-store',
      })
      content = await res.json()
    }

    const engine = new GameEngine(content, initialState)
    const selection: Selection = { verb: DEFAULT_VERB, item: null }
    this.registry.set('engine', engine)
    this.registry.set('selection', selection)
    // Hook di debug per test end-to-end (Playwright) e console del browser.
    ;(window as unknown as Record<string, unknown>).__engine = engine
    ;(window as unknown as Record<string, unknown>).__game = this.game

    // Sfondi dichiarati dalle stanze, caricati come texture "bg-<idStanza>".
    // In preview arrivano come data URL dall'editor; un file mancante viene
    // saltato (RoomScene ripiega sul colore della stanza).
    const withBg = Object.values(content.rooms).filter((r) => r.background)
    let queued = 0
    for (const room of withBg) {
      const url = backgrounds
        ? backgrounds[room.background!]
        : `${import.meta.env.BASE_URL}bg/${room.background}`
      if (!url) continue
      this.load.image(`bg-${room.id}`, url)
      queued += 1
    }
    if (queued > 0) {
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
