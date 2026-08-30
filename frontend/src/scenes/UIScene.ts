import Phaser from 'phaser'
import { Story } from 'inkjs'
import { GAME_HEIGHT, GAME_WIDTH, ROOM_HEIGHT } from '../config'
import type { GameEngine } from '../engine/engine'
import { loadGame, saveGame } from '../engine/saves'
import type { Selection, Verb } from '../engine/types'
import { DEFAULT_VERB, VERBS, VERB_LABELS } from '../engine/types'

const UI_TOP = ROOM_HEIGHT
const SAVE_SLOT = 'default'

export class UIScene extends Phaser.Scene {
  private engine!: GameEngine
  private selection!: Selection
  private sentence!: Phaser.GameObjects.Text
  private hoverName: string | null = null
  private verbButtons = new Map<Verb, Phaser.GameObjects.Text>()
  private inventoryTexts: Phaser.GameObjects.Text[] = []

  private dialogueOverlay!: Phaser.GameObjects.Container
  private story: Story | null = null

  constructor() {
    super('ui')
  }

  create() {
    this.engine = this.registry.get('engine') as GameEngine
    this.selection = this.registry.get('selection') as Selection
    this.selection.verb = DEFAULT_VERB

    this.add
      .rectangle(0, UI_TOP, GAME_WIDTH, GAME_HEIGHT - UI_TOP, 0x000000)
      .setOrigin(0)

    // Riga di frase stile SCUMM: "Usa chiave arrugginita con Porta del magazzino".
    this.sentence = this.add
      .text(GAME_WIDTH / 2, UI_TOP + 8, '', {
        color: '#dddd66',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)

    this.createVerbBar()
    // In preview (partita di prova dall'editor) non c'è backend salvataggi.
    if (!this.registry.get('preview')) this.createSaveLoadButtons()
    this.createDialogueOverlay()
    this.refreshInventory()
    this.updateSentence()

    this.engine.on('inventory', () => this.refreshInventory())
    this.engine.on('dialogue', (name: string) => this.startDialogue(name))
    this.game.events.on('hover', (name: string | null) => {
      this.hoverName = name
      this.updateSentence()
    })
    this.game.events.on('selection-changed', () => {
      this.refreshVerbBar()
      this.refreshInventory()
      this.updateSentence()
    })
  }

  private updateSentence() {
    const parts: string[] = [VERB_LABELS[this.selection.verb]]
    if (this.selection.item) {
      const item = this.engine.content.items[this.selection.item]
      parts.push(item?.name ?? this.selection.item, 'con')
    }
    if (this.hoverName) parts.push(this.hoverName)
    this.sentence.setText(parts.join(' '))
  }

  private createVerbBar() {
    VERBS.forEach((verb, i) => {
      const btn = this.add
        .text(12 + i * 110, UI_TOP + 44, VERB_LABELS[verb].toUpperCase(), {
          color: '#ffffff',
          fontSize: '18px',
          backgroundColor: '#333355',
          padding: { x: 10, y: 6 },
        })
        .setInteractive({ useHandCursor: true })
      btn.on('pointerdown', () => {
        this.selection.verb = verb
        this.selection.item = null
        this.game.events.emit('selection-changed')
      })
      this.verbButtons.set(verb, btn)
    })
    this.refreshVerbBar()
  }

  private refreshVerbBar() {
    for (const [verb, btn] of this.verbButtons) {
      btn.setBackgroundColor(
        verb === this.selection.verb ? '#7777cc' : '#333355',
      )
    }
  }

  private refreshInventory() {
    this.inventoryTexts.forEach((t) => t.destroy())
    this.inventoryTexts = []
    this.inventoryTexts.push(
      this.add.text(12, UI_TOP + 92, 'Inventario:', {
        color: '#8888aa',
        fontSize: '14px',
      }),
    )
    this.engine.state.inventory.forEach((itemId, i) => {
      const item = this.engine.content.items[itemId]
      const nome = item?.name ?? itemId
      const selected = this.selection.item === itemId
      const txt = this.add
        .text(110 + i * 180, UI_TOP + 88, nome, {
          color: selected ? '#000000' : '#ffcc66',
          fontSize: '15px',
          backgroundColor: selected ? '#ffcc66' : '#222233',
          padding: { x: 8, y: 4 },
        })
        .setInteractive({ useHandCursor: true })
      txt.on('pointerover', () => this.game.events.emit('hover', nome))
      txt.on('pointerout', () => this.game.events.emit('hover', null))
      txt.on('pointerdown', () => this.onItemClick(itemId))
      this.inventoryTexts.push(txt)
    })
  }

  private onItemClick(itemId: string) {
    if (this.selection.verb === 'use') {
      // "Usa X con Y": seleziona l'oggetto, poi clic sul bersaglio.
      this.selection.item = this.selection.item === itemId ? null : itemId
    } else {
      // Sull'inventario "vai" non ha senso: il default diventa "guarda".
      const verb =
        this.selection.verb === DEFAULT_VERB ? 'look' : this.selection.verb
      this.engine.interact(verb, itemId)
      this.selection.verb = DEFAULT_VERB
      this.selection.item = null
    }
    this.game.events.emit('selection-changed')
  }

  private createSaveLoadButtons() {
    const save = this.add
      .text(GAME_WIDTH - 180, UI_TOP + 130, '[Salva]', {
        color: '#88ccff',
        fontSize: '14px',
      })
      .setInteractive({ useHandCursor: true })
    save.on('pointerdown', async () => {
      try {
        await saveGame(SAVE_SLOT, this.engine.state)
        this.engine.emit('say', 'Partita salvata.')
      } catch (err) {
        this.engine.emit('say', String(err))
      }
    })

    const load = this.add
      .text(GAME_WIDTH - 100, UI_TOP + 130, '[Carica]', {
        color: '#88ccff',
        fontSize: '14px',
      })
      .setInteractive({ useHandCursor: true })
    load.on('pointerdown', async () => {
      try {
        const state = await loadGame(SAVE_SLOT)
        if (state) {
          this.engine.loadState(state)
          this.refreshInventory()
        } else {
          this.engine.emit('say', 'Nessun salvataggio trovato.')
        }
      } catch (err) {
        this.engine.emit('say', String(err))
      }
    })
  }

  // --- Dialoghi Ink ---

  private dialogueText!: Phaser.GameObjects.Text
  private choiceTexts: Phaser.GameObjects.Text[] = []

  private createDialogueOverlay() {
    const panel = this.add
      .rectangle(0, 0, GAME_WIDTH, ROOM_HEIGHT, 0x000000, 0.85)
      .setOrigin(0)
      .setInteractive()
    panel.on('pointerdown', () => this.advanceDialogue())

    this.dialogueText = this.add.text(40, 60, '', {
      color: '#ffffff',
      fontSize: '18px',
      wordWrap: { width: GAME_WIDTH - 80 },
      lineSpacing: 6,
    })

    this.dialogueOverlay = this.add.container(0, 0, [panel, this.dialogueText])
    this.dialogueOverlay.setDepth(100).setVisible(false)
  }

  private startDialogue(name: string) {
    const json = this.engine.content.dialogues[name]
    if (!json) {
      this.engine.emit('say', `(dialogo "${name}" mancante)`)
      return
    }
    this.story = new Story(json as string)
    this.dialogueOverlay.setVisible(true)
    this.advanceDialogue()
  }

  private advanceDialogue() {
    if (!this.story) return
    this.clearChoices()

    if (this.story.canContinue) {
      const line = this.story.Continue() ?? ''
      this.applyTags(this.story.currentTags ?? [])
      this.dialogueText.setText(line.trim())
      return
    }

    if (this.story.currentChoices.length > 0) {
      this.story.currentChoices.forEach((choice, i) => {
        const txt = this.add
          .text(60, 160 + i * 40, `${i + 1}. ${choice.text}`, {
            color: '#88ccff',
            fontSize: '17px',
          })
          .setDepth(101)
          .setInteractive({ useHandCursor: true })
        txt.on(
          'pointerdown',
          (
            _pointer: Phaser.Input.Pointer,
            _x: number,
            _y: number,
            event: Phaser.Types.Input.EventData,
          ) => {
            event.stopPropagation()
            this.story?.ChooseChoiceIndex(i)
            this.advanceDialogue()
          },
        )
        this.choiceTexts.push(txt)
      })
      return
    }

    this.endDialogue()
  }

  // Tag Ink come azioni del motore: "# set_flag: x = true", "# add_item: id", ecc.
  private applyTags(tags: string[]) {
    for (const tag of tags) {
      const sep = tag.indexOf(':')
      if (sep === -1) continue
      const key = tag.slice(0, sep).trim()
      const value = tag.slice(sep + 1).trim()
      this.engine.runAction({ [key]: value })
    }
  }

  private clearChoices() {
    this.choiceTexts.forEach((t) => t.destroy())
    this.choiceTexts = []
  }

  private endDialogue() {
    this.story = null
    this.clearChoices()
    this.dialogueOverlay.setVisible(false)
  }
}
