import Phaser from 'phaser';

interface GameConfig {
  layout: string;
  monster: string;
  modifier: string;
  onGameOver: (score: number, deathX: number, deathY: number) => void;
  onVictory: (score: number) => void;
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private ghosts!: Phaser.GameObjects.Group;
  private attackHitbox!: Phaser.Physics.Arcade.Group;
  
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  
  private playerHP = 100;
  private maxHP = 100;
  private playerDamage = 10;
  private playerSpeed = 200;
  private attackCooldown = 0;
  private invincible = 0;
  
  private score = 0;
  private startTime = 0;
  private gameOver = false;
  private _won = false; // Used for victory condition
  
  private layout = '';
  private monsterType = 'Goblin';
  private modifierType = 'Normal';
  private onGameOverCallback?: (score: number, deathX: number, deathY: number) => void;
  private onVictoryCallback?: (score: number) => void;
  
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private _gameOverText?: Phaser.GameObjects.Text; // Used for game over UI
  
  constructor() {
    super({ key: 'GameScene' });
  }
  
  init(data: GameConfig) {
    this.layout = data.layout || '0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000';
    this.monsterType = data.monster || 'Goblin';
    this.modifierType = data.modifier || 'Normal';
    this.onGameOverCallback = data.onGameOver;
    this.onVictoryCallback = data.onVictory;
    
    // Reset game state on restart
    this.gameOver = false;
    this._won = false;
    this.score = 0;
    this.startTime = Date.now();
    this.invincible = 0;
    
    // Apply modifiers
    this.applyModifier();
  }
  
  preload() {
    // Create simple colored sprites programmatically
    this.createSprites();
  }
  
  create() {
    // Setup groups
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.ghosts = this.add.group();
    this.attackHitbox = this.physics.add.group();
    
    // Generate level from layout
    this.generateLevel();
    
    // Setup input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    // Setup collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.attackHitbox, this.enemies, this.handleAttackHit, undefined, this);
    
    // UI
    this.hpText = this.add.text(10, 10, '', { fontSize: '18px', color: '#fff' });
    this.scoreText = this.add.text(10, 35, '', { fontSize: '18px', color: '#fff' });
    
    this.startTime = Date.now();
    
    // Fetch ghosts from API
    this.fetchGhosts();
  }
  
  override update(_time: number, delta: number) {
    if (this.gameOver) {
      // Press R to restart
      if (this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).isDown) {
        this.scene.restart();
      }
      return;
    }
    
    // Update score based on survival time
    this.score = Math.floor((Date.now() - this.startTime) / 100);
    
    // Regeneration modifier
    if (this.modifierType === 'Regeneration' && this.playerHP < this.maxHP) {
      this.playerHP += 0.05;
      if (this.playerHP > this.maxHP) this.playerHP = this.maxHP;
    }
    
    // Player movement
    let velocityX = 0;
    let velocityY = 0;
    
    if (this.cursors.left.isDown || this.wasd.A.isDown) velocityX = -this.playerSpeed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) velocityX = this.playerSpeed;
    if (this.cursors.up.isDown || this.wasd.W.isDown) velocityY = -this.playerSpeed;
    if (this.cursors.down.isDown || this.wasd.S.isDown) velocityY = this.playerSpeed;
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      velocityX *= 0.707;
      velocityY *= 0.707;
    }
    
    this.player.setVelocity(velocityX, velocityY);
    
    // Attack
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.attackCooldown <= 0) {
      this.attack();
      this.attackCooldown = 333; // 1/3 second
    }
    
    // Invincibility frames
    if (this.invincible > 0) {
      this.invincible -= delta;
      this.player.setAlpha(this.invincible % 200 < 100 ? 0.5 : 1);
    } else {
      this.player.setAlpha(1);
    }
    
    // Enemy AI
    this.enemies.children.entries.forEach((enemy: any) => {
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      
      if (dist < enemy.getData('attackRange') && dist > 40) {
        this.physics.moveToObject(enemy, this.player, enemy.getData('speed'));
      } else {
        enemy.setVelocity(0, 0);
      }
    });
    
    // Update UI
    this.hpText.setText(`HP: ${Math.floor(this.playerHP)}/${this.maxHP}`);
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Death check
    if (this.playerHP <= 0 && !this.gameOver) {
      this.handleDeath();
    }
  }
  
  private createSprites() {
    // Wall
    const wallGraphics = this.make.graphics({ x: 0, y: 0 });
    wallGraphics.fillStyle(0x333333);
    wallGraphics.fillRect(0, 0, 64, 64);
    wallGraphics.generateTexture('wall', 64, 64);
    wallGraphics.destroy();
    
    // Floor
    const floorGraphics = this.make.graphics({ x: 0, y: 0 });
    floorGraphics.fillStyle(0xf97316);
    floorGraphics.fillRect(0, 0, 64, 64);
    floorGraphics.generateTexture('floor', 64, 64);
    floorGraphics.destroy();
    
    // Player
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x3b82f6);
    playerGraphics.fillCircle(24, 24, 20);
    playerGraphics.generateTexture('player', 48, 48);
    playerGraphics.destroy();
    
    // Goblin
    const goblinGraphics = this.make.graphics({ x: 0, y: 0 });
    goblinGraphics.fillStyle(0x22c55e);
    goblinGraphics.fillCircle(24, 24, 18);
    goblinGraphics.generateTexture('goblin', 48, 48);
    goblinGraphics.destroy();
    
    // Skeleton
    const skeletonGraphics = this.make.graphics({ x: 0, y: 0 });
    skeletonGraphics.fillStyle(0xffffff);
    skeletonGraphics.fillCircle(24, 24, 18);
    skeletonGraphics.generateTexture('skeleton', 48, 48);
    skeletonGraphics.destroy();
    
    // Slime
    const slimeGraphics = this.make.graphics({ x: 0, y: 0 });
    slimeGraphics.fillStyle(0x84cc16);
    slimeGraphics.fillCircle(24, 24, 18);
    slimeGraphics.generateTexture('slime', 48, 48);
    slimeGraphics.destroy();
    
    // Dragon
    const dragonGraphics = this.make.graphics({ x: 0, y: 0 });
    dragonGraphics.fillStyle(0xef4444);
    dragonGraphics.fillCircle(32, 32, 28);
    dragonGraphics.generateTexture('dragon', 64, 64);
    dragonGraphics.destroy();
    
    // Ghost
    const ghostGraphics = this.make.graphics({ x: 0, y: 0 });
    ghostGraphics.fillStyle(0xc4b5fd, 0.5);
    ghostGraphics.fillCircle(16, 16, 14);
    ghostGraphics.generateTexture('ghost', 32, 32);
    ghostGraphics.destroy();
  }
  
  private generateLevel() {
    const gridSize = 10;
    const tileSize = 64;
    const tiles = this.layout.padEnd(100, '0').split('').slice(0, 100);
    
    const floorTiles: { x: number; y: number }[] = [];
    
    // Generate tiles
    tiles.forEach((tile, index) => {
      const gridX = index % gridSize;
      const gridY = Math.floor(index / gridSize);
      const posX = gridX * tileSize + tileSize / 2;
      const posY = gridY * tileSize + tileSize / 2;
      
      if (tile === '0') {
        // Wall
        const wall = this.walls.create(posX, posY, 'wall');
        wall.setOrigin(0.5);
        wall.refreshBody();
      } else {
        // Floor
        const floor = this.add.sprite(posX, posY, 'floor');
        floor.setOrigin(0.5);
        floor.setDepth(-1);
        floorTiles.push({ x: posX, y: posY });
      }
    });
    
    // Place player on first floor tile
    const start = floorTiles[0];
    if (!start) {
      console.error('No floor tiles available for player spawn');
      return;
    }
    
    this.player = this.physics.add.sprite(start.x, start.y, 'player');
    this.player.setCollideWorldBounds(true);
    
    // Place enemies
    const enemyCount = this.monsterType === 'Dragon' ? 1 : 3;
    const enemyTexture = this.getEnemyTexture();
    
    for (let i = 0; i < enemyCount && floorTiles.length > i + 1; i++) {
      const tile = floorTiles[Math.floor(Math.random() * (floorTiles.length - 1)) + 1];
      if (!tile) continue;
      
      const enemy = this.enemies.create(tile.x, tile.y, enemyTexture);
      this.setupEnemy(enemy);
    }
  }
  
  private getEnemyTexture(): string {
    switch (this.monsterType) {
      case 'Skeleton': return 'skeleton';
      case 'Slime': return 'slime';
      case 'Dragon': return 'dragon';
      default: return 'goblin';
    }
  }
  
  private setupEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    let hp = 30;
    let damage = 10;
    let speed = 120;
    let attackRange = 150;
    
    switch (this.monsterType) {
      case 'Goblin':
        hp = 25;
        damage = 8;
        speed = 150;
        break;
      case 'Skeleton':
        hp = 40;
        damage = 12;
        speed = 120;
        break;
      case 'Slime':
        hp = 60;
        damage = 5;
        speed = 60;
        break;
      case 'Dragon':
        hp = 150;
        damage = 20;
        speed = 90;
        attackRange = 200;
        break;
    }
    
    enemy.setData('hp', hp);
    enemy.setData('damage', damage);
    enemy.setData('speed', speed);
    enemy.setData('attackRange', attackRange);
    enemy.setData('attackCooldown', 0);
  }
  
  private applyModifier() {
    switch (this.modifierType) {
      case 'Speed Boost':
        this.playerSpeed = 300;
        break;
      case 'Double Damage':
        this.playerDamage = 20;
        break;
      case 'Tank Mode':
        this.maxHP = 200;
        this.playerHP = 200;
        this.playerSpeed = 150;
        break;
      case 'Glass Cannon':
        this.maxHP = 50;
        this.playerHP = 50;
        this.playerDamage = 30;
        break;
      case 'Regeneration':
        // Handled in update
        break;
    }
  }
  
  private attack() {
    const hitbox = this.attackHitbox.create(this.player.x, this.player.y, undefined) as Phaser.Physics.Arcade.Sprite;
    hitbox.setCircle(24);
    hitbox.setData('damage', this.playerDamage);
    hitbox.setData('lifetime', 10);
    hitbox.setAlpha(0.5);
    
    // Visual effect
    const circle = this.add.circle(this.player.x, this.player.y, 24, 0xfacc15, 0.5);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      duration: 167,
      onComplete: () => circle.destroy()
    });
  }
  
  private handleAttackHit(hitbox: any, enemy: any) {
    const damage = hitbox.getData('damage');
    let hp = enemy.getData('hp');
    hp -= damage;
    enemy.setData('hp', hp);
    
    hitbox.destroy();
    
    // Flash enemy
    enemy.setTint(0xff0000);
    this.time.delayedCall(100, () => enemy.clearTint());
    
    if (hp <= 0) {
      this.score += 100;
      enemy.destroy();
      
      // Check win condition
      if (this.enemies.countActive() === 0) {
        this.handleVictory();
      }
    }
  }
  
  private handlePlayerEnemyCollision(player: any, enemy: any) {
    if (this.invincible > 0) return;
    
    const damage = enemy.getData('damage');
    this.playerHP -= damage;
    this.invincible = 1000; // 1 second
    
    // Knockback
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    this.player.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);
    
    // Flash player
    this.cameras.main.shake(100, 0.01);
  }
  
  private handleDeath() {
    this.gameOver = true;
    this._won = false;
    
    const deathX = Math.floor(this.player.x / 64);
    const deathY = Math.floor(this.player.y / 64);
    
    this._gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      'GAME OVER',
      { fontSize: '48px', color: '#ff0000' }
    ).setOrigin(0.5);
    
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `Final Score: ${this.score}`,
      { fontSize: '24px', color: '#fff' }
    ).setOrigin(0.5);
    
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 40,
      'Press R to restart',
      { fontSize: '18px', color: '#aaa' }
    ).setOrigin(0.5);
    
    if (this.onGameOverCallback) {
      this.onGameOverCallback(this.score, deathX, deathY);
    }
  }
  
  private handleVictory() {
    this.gameOver = true;
    this._won = true;
    
    this._gameOverText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      'YOU WIN!',
      { fontSize: '48px', color: '#00ff00' }
    ).setOrigin(0.5);
    
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `Final Score: ${this.score}`,
      { fontSize: '24px', color: '#fff' }
    ).setOrigin(0.5);
    
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 40,
      'Press R to restart',
      { fontSize: '18px', color: '#aaa' }
    ).setOrigin(0.5);
    
    if (this.onVictoryCallback) {
      this.onVictoryCallback(this.score);
    }
  }
  
  private async fetchGhosts() {
    try {
      const res = await fetch('/api/ghosts');
      if (!res.ok) return;
      const data = await res.json();
      
      data.ghosts.forEach((ghost: any) => {
        const x = ghost.x * 64 + 32;
        const y = ghost.y * 64 + 32;
        const ghostSprite = this.add.sprite(x, y, 'ghost');
        ghostSprite.setAlpha(0.5);
        this.ghosts.add(ghostSprite);
      });
    } catch (err) {
      console.error('Failed to fetch ghosts:', err);
    }
  }
}
