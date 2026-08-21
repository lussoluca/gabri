import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './config'
import { BootScene } from './scenes/BootScene'
import { RoomScene } from './scenes/RoomScene'
import { UIScene } from './scenes/UIScene'

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#101018',
  // FIT: il canvas si adatta allo schermo mantenendo le proporzioni 16:10,
  // con bande nere dove serve. Le coordinate di gioco restano 960x600.
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [BootScene, RoomScene, UIScene],
})
