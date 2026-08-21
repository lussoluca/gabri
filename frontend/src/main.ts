import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './config'
import { BootScene } from './scenes/BootScene'
import { RoomScene } from './scenes/RoomScene'
import { UIScene } from './scenes/UIScene'

new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game',
  backgroundColor: '#101018',
  scene: [BootScene, RoomScene, UIScene],
})
