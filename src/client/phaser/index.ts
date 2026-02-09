import Phaser from 'phaser';
import { GameScene } from './GameScene';

export interface PhaserGameProps {
  layout: string;
  monster: string;
  modifier: string;
  playerClass?: string;
  onGameOver: (score: number, deathX: number, deathY: number) => void;
  onVictory: (score: number) => void;
}

export function createGame(containerId: string, props: PhaserGameProps): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 640,
    height: 640,
    parent: containerId,
    backgroundColor: '#1f2937',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: GameScene,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  
  game.scene.start('GameScene', props);
  
  return game;
}
