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
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  
  private playerHP = 100;
  private maxHP = 100;
  private playerDamage = 10;
  private playerSpeed = 200;
  private attackCooldown = 0;
  private dashCooldown = 0;
  private areaCooldown = 0;
  private invincible = 0;
  
  private comboCount = 0;
  private comboTimer = 0;
  private lastKillTime = 0;
  
  // Power-up system
  private activePowerUps: Map<string, number> = new Map();
  private powerUpPickups!: Phaser.Physics.Arcade.Group;
  
  private score = 0;
  private startTime = 0;
  private gameOver = false;
  private _won = false; // Used for victory condition
  
  private currentWave = 1;
  private enemiesPerWave = 3;
  private waveInProgress = false;
  private floorTiles: { x: number; y: number }[] = [];
  private isBossWave = false;
  private bossSpawned = false;
  private achievements: Set<string> = new Set();
  
  private layout = '';
  private monsterType = 'Goblin';
  private modifierType = 'Normal';
  private onGameOverCallback?: (score: number, deathX: number, deathY: number) => void;
  private onVictoryCallback?: (score: number) => void;
  
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private abilitiesText!: Phaser.GameObjects.Text;
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
    
    // Reset wave state
    this.currentWave = 1;
    this.enemiesPerWave = 3;
    this.waveInProgress = false;
    this.floorTiles = [];
    
    // Reset player stats
    this.playerHP = 100;
    this.maxHP = 100;
    this.playerDamage = 10;
    this.playerSpeed = 250; // Increased from 200 for better movement
    this.attackCooldown = 0;
    this.dashCooldown = 0;
    this.areaCooldown = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastKillTime = 0;
    
    // Reset power-ups
    this.activePowerUps.clear();
    
    // Apply modifiers
    this.applyModifier();
  }
  
  preload() {
    // Load Tiny RPG Character sprite sheets (100x100 per frame)
    // Path is relative to public/ folder
    const basePath = 'sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Characters(100x100)';
    
    // Player - Soldier with shadows
    this.load.spritesheet('soldier-idle', `${basePath}/Soldier/Soldier with shadows/Soldier-Idle.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('soldier-walk', `${basePath}/Soldier/Soldier with shadows/Soldier-Walk.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('soldier-attack', `${basePath}/Soldier/Soldier with shadows/Soldier-Attack01.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('soldier-hurt', `${basePath}/Soldier/Soldier with shadows/Soldier-Hurt.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('soldier-death', `${basePath}/Soldier/Soldier with shadows/Soldier-Death.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    
    // Enemy - Orc with shadows
    this.load.spritesheet('orc-idle', `${basePath}/Orc/Orc with shadows/Orc-Idle.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('orc-walk', `${basePath}/Orc/Orc with shadows/Orc-Walk.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('orc-attack', `${basePath}/Orc/Orc with shadows/Orc-Attack01.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('orc-hurt', `${basePath}/Orc/Orc with shadows/Orc-Hurt.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    this.load.spritesheet('orc-death', `${basePath}/Orc/Orc with shadows/Orc-Death.png`, { 
      frameWidth: 100, 
      frameHeight: 100 
    });
    
    // Load Sprout Lands tilesets for beautiful environment
    this.load.image('grass-floor', 'sprites/Sprout Lands - Sprites - Basic pack/Tilesets/Grass.png');
    this.load.image('wood-wall', 'sprites/Sprout Lands - Sprites - Basic pack/Tilesets/Wooden_House_Walls_Tilset.png');
    this.load.image('decorations', 'sprites/Sprout Lands - Sprites - Basic pack/Objects/Basic_Grass_Biom_things.png');
    this.load.image('plants', 'sprites/Sprout Lands - Sprites - Basic pack/Objects/Basic_Plants.png');
    
    // Log to help debug
    console.log('Loading sprites from:', basePath);
  }
  
  private createAnimations() {
    // Skip if animations already exist (on scene restart)
    if (this.anims.exists('soldier-idle-anim')) {
      return;
    }
    
    // Create player (Soldier) animations
    this.anims.create({
      key: 'soldier-idle-anim',
      frames: this.anims.generateFrameNumbers('soldier-idle', { start: 0, end: 5 }),
      frameRate: 8,
      repeat: -1
    });
    
    this.anims.create({
      key: 'soldier-walk-anim',
      frames: this.anims.generateFrameNumbers('soldier-walk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'soldier-attack-anim',
      frames: this.anims.generateFrameNumbers('soldier-attack', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0
    });
    
    this.anims.create({
      key: 'soldier-hurt-anim',
      frames: this.anims.generateFrameNumbers('soldier-hurt', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'soldier-death-anim',
      frames: this.anims.generateFrameNumbers('soldier-death', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0
    });
    
    // Create enemy (Orc) animations
    this.anims.create({
      key: 'orc-idle-anim',
      frames: this.anims.generateFrameNumbers('orc-idle', { start: 0, end: 5 }),
      frameRate: 6,
      repeat: -1
    });
    
    this.anims.create({
      key: 'orc-walk-anim',
      frames: this.anims.generateFrameNumbers('orc-walk', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1
    });
    
    this.anims.create({
      key: 'orc-attack-anim',
      frames: this.anims.generateFrameNumbers('orc-attack', { start: 0, end: 5 }),
      frameRate: 12,
      repeat: 0
    });
    
    this.anims.create({
      key: 'orc-hurt-anim',
      frames: this.anims.generateFrameNumbers('orc-hurt', { start: 0, end: 2 }),
      frameRate: 10,
      repeat: 0
    });
    
    this.anims.create({
      key: 'orc-death-anim',
      frames: this.anims.generateFrameNumbers('orc-death', { start: 0, end: 3 }),
      frameRate: 8,
      repeat: 0
    });
  }
  
  create() {
    // Create animations first
    this.createAnimations();
    
    // Setup groups
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.ghosts = this.add.group();
    this.attackHitbox = this.physics.add.group();
    this.powerUpPickups = this.physics.add.group();
    
    // Add atmospheric background
    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(0x2d4a3e, 0x2d4a3e, 0x1a2f26, 0x1a2f26, 1, 1, 1, 1);
    bgGradient.fillRect(0, 0, 640, 640);
    bgGradient.setDepth(-10);
    
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
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.eKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);    
    // Setup collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.attackHitbox, this.enemies, this.handleAttackHit, undefined, this);
    
    // Professional HUD - Bottom Screen Layout like AAA games
    const hudHeight = 80;
    const hudY = 640 - hudHeight;
    
    // Main HUD background with gradient
    const hudBg = this.add.rectangle(0, hudY, 640, hudHeight, 0x1a1a2e, 0.98);
    hudBg.setOrigin(0, 0);
    hudBg.setDepth(999);
    hudBg.setScrollFactor(0);
    
    // Add top border glow
    const hudBorder = this.add.rectangle(0, hudY, 640, 3, 0x4ade80, 0.8);
    hudBorder.setOrigin(0, 0);
    hudBorder.setDepth(1000);
    hudBorder.setScrollFactor(0);
    
    // HP Bar Background
    const hpBarBg = this.add.rectangle(20, hudY + 20, 250, 25, 0x333333, 1);
    hpBarBg.setOrigin(0, 0);
    hpBarBg.setDepth(1000);
    hpBarBg.setScrollFactor(0);
    
    // HP Bar (will be updated)
    const hpBar = this.add.rectangle(20, hudY + 20, 250, 25, 0x22c55e, 1);
    hpBar.setOrigin(0, 0);
    hpBar.setDepth(1001);
    hpBar.setScrollFactor(0);
    this.player.setData('hpBar', hpBar);
    
    this.hpText = this.add.text(145, hudY + 32, '', { 
      fontSize: '18px', 
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);
    
    // Score and Wave - Right side
    this.scoreText = this.add.text(620, hudY + 15, '', { 
      fontSize: '22px', 
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
      align: 'right'
    }).setOrigin(1, 0).setDepth(1002).setScrollFactor(0);
    
    this.waveText = this.add.text(620, hudY + 45, '', { 
      fontSize: '18px', 
      color: '#60a5fa',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
      align: 'right'
    }).setOrigin(1, 0).setDepth(1002).setScrollFactor(0);
    
    // Abilities display - Bottom left corner
    this.abilitiesText = this.add.text(280, hudY + 15, '', { 
      fontSize: '16px', 
      color: '#a78bfa',
      fontStyle: 'bold',
      stroke: '#000',
      strokeThickness: 3,
      align: 'left'
    }).setOrigin(0, 0).setDepth(1002).setScrollFactor(0);
    
    // Combo text - Center top
    this.comboText = this.add.text(320, 80, '', { 
      fontSize: '48px', 
      color: '#ff4444', 
      fontStyle: 'bold',
      stroke: '#000', 
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);
    
    this.startTime = Date.now();
    
    // Add ambient floating particles for atmosphere
    this.time.addEvent({
      delay: 2000,
      callback: () => {
        if (Math.random() < 0.5) {
          const x = Math.random() * 640;
          const y = Math.random() * 640;
          const particle = this.add.circle(x, y, 2, 0xd4f1f4, 0.4);
          particle.setDepth(20);
          
          this.tweens.add({
            targets: particle,
            x: x + (Math.random() - 0.5) * 100,
            y: y + 50,
            alpha: 0,
            duration: 3000 + Math.random() * 2000,
            ease: 'Sine.easeInOut',
            onComplete: () => particle.destroy()
          });
        }
      },
      loop: true
    });
    
    // Setup smooth camera follow with bounds
    this.cameras.main.setBounds(0, 0, 640, 640);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
    
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
    
    // Play appropriate animation based on movement
    const isMoving = velocityX !== 0 || velocityY !== 0;
    
    if (isMoving) {
      // Flip sprite based on direction
      if (velocityX < 0) {
        this.player.setFlipX(true);
      } else if (velocityX > 0) {
        this.player.setFlipX(false);
      }
      
      // Only play walk if not in attack/hurt animation (priority system)
      const currentAnim = this.player.anims.currentAnim?.key;
      const isHighPriority = currentAnim === 'soldier-attack-anim' || currentAnim === 'soldier-hurt-anim' || currentAnim === 'soldier-death-anim';
      
      if (!isHighPriority && currentAnim !== 'soldier-walk-anim') {
        this.player.play('soldier-walk-anim', true);
      }
      
      // Add dust trail particles when moving (reduced frequency)
      if (Math.random() < 0.05) {
        const dust = this.add.circle(this.player.x, this.player.y + 30, 3, 0x8b7355, 0.5);
        dust.setDepth(4);
        this.tweens.add({
          targets: dust,
          alpha: 0,
          scale: 0.5,
          duration: 400,
          onComplete: () => dust.destroy()
        });
      }
    } else {
      // Only play idle if not in attack/hurt animation (priority system)
      const currentAnim = this.player.anims.currentAnim?.key;
      const isHighPriority = currentAnim === 'soldier-attack-anim' || currentAnim === 'soldier-hurt-anim' || currentAnim === 'soldier-death-anim';
      
      if (!isHighPriority && currentAnim !== 'soldier-idle-anim') {
        this.player.play('soldier-idle-anim', true);
      }
    }
    
    // Cooldown updates
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.dashCooldown > 0) this.dashCooldown -= delta;
    if (this.areaCooldown > 0) this.areaCooldown -= delta;
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) this.comboCount = 0;
    }
    
    // Attack (Space)
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.attackCooldown <= 0) {
      this.attack();
      const baseAttackCooldown = 333;
      const attackSpeedMultiplier = this.activePowerUps.has('attackSpeed') ? 0.5 : 1;
      this.attackCooldown = baseAttackCooldown * attackSpeedMultiplier;
    }
    
    // Dash ability (Shift) - Quick dodge
    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.dashCooldown <= 0) {
      this.dash();
      this.dashCooldown = 2000; // 2 second cooldown
    }
    
    // Area attack (E) - Damage all nearby enemies
    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.areaCooldown <= 0) {
      this.areaAttack();
      this.areaCooldown = 5000; // 5 second cooldown
    }
    
    // Invincibility frames
    if (this.invincible > 0) {
      this.invincible -= delta;
      this.player.setAlpha(this.invincible % 200 < 100 ? 0.5 : 1);
    } else {
      this.player.setAlpha(1);
    }
    
    // Enemy AI and health bars
    this.enemies.children.entries.forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
      
      // Get or initialize attack cooldown
      if (!enemy.getData('attackCooldown')) {
        enemy.setData('attackCooldown', 0);
      }
      let attackCooldown = enemy.getData('attackCooldown');
      if (attackCooldown > 0) {
        enemy.setData('attackCooldown', attackCooldown - delta);
      }
      
      if (dist < enemy.getData('attackRange') && dist > 40) {
        this.physics.moveToObject(enemy, this.player, enemy.getData('speed'));
        
        // Play walk animation
        if (enemy.anims.currentAnim?.key !== 'orc-walk-anim' && 
            enemy.anims.currentAnim?.key !== 'orc-attack-anim' &&
            enemy.anims.currentAnim?.key !== 'orc-hurt-anim') {
          enemy.play('orc-walk-anim', true);
        }
        
        // Flip enemy based on direction to player
        if (enemy.x > this.player.x) {
          enemy.setFlipX(true);
        } else {
          enemy.setFlipX(false);
        }
        
        // Red glow when aggressive and close
        if (dist < 100) {
          enemy.setTint(0xff8888);
          
          // Enemy attacks when very close (melee range)
          if (dist < 80 && enemy.getData('attackCooldown') <= 0) {
            // Play enemy attack animation
            enemy.play('orc-attack-anim', true);
            
            // Visual attack effect
            const attackEffect = this.add.circle(enemy.x, enemy.y, 40, 0xff0000, 0.5);
            attackEffect.setDepth(99);
            this.tweens.add({
              targets: attackEffect,
              scale: 1.5,
              alpha: 0,
              duration: 300,
              onComplete: () => attackEffect.destroy()
            });
            
            // Damage player
            if (this.invincible <= 0) {
              const damage = enemy.getData('damage') || 5;
              this.playerHP -= damage;
              
              // Clamp HP to minimum 0 (prevent negative HP)
              if (this.playerHP < 0) this.playerHP = 0;
              
              // Show damage text
              const damageText = this.add.text(this.player.x, this.player.y - 40, `-${damage}`, {
                fontSize: '24px',
                color: '#ff0000',
                fontStyle: 'bold',
                stroke: '#000',
                strokeThickness: 4
              }).setOrigin(0.5).setDepth(100);
              
              this.tweens.add({
                targets: damageText,
                y: damageText.y - 30,
                alpha: 0,
                duration: 800,
                onComplete: () => damageText.destroy()
              });
              
              // Screen shake when hit
              this.cameras.main.shake(100, 0.01);
              
              // Brief invincibility
              this.invincible = 500;
              
              // Check if player died
              if (this.playerHP <= 0) {
                this.handleDeath();
              }
            }
            
            // Reset attack cooldown
            enemy.setData('attackCooldown', 1000); // 1 second between attacks
          }
        } else {
          // Restore base tint (enemy type color)
          const baseTint = enemy.getData('baseTint') || 0xffffff;
          enemy.setTint(baseTint);
        }
      } else {
        enemy.setVelocity(0, 0);
        // Restore base tint (enemy type color)
        const baseTint = enemy.getData('baseTint') || 0xffffff;
        enemy.setTint(baseTint);
        
        // Play idle animation
        if (enemy.anims.currentAnim?.key !== 'orc-idle-anim' && 
            enemy.anims.currentAnim?.key !== 'orc-attack-anim' &&
            enemy.anims.currentAnim?.key !== 'orc-hurt-anim') {
          enemy.play('orc-idle-anim', true);
        }
      }
      
      // Update health bar position and width (DON'T recreate every frame!)
      const hp = enemy.getData('hp') || 0;
      const maxHp = enemy.getData('maxHp') || 1;
      const hpPercent = hp / maxHp;
      
      const bgBar = enemy.getData('healthBarBg');
      const hpBar = enemy.getData('healthBar');
      
      if (bgBar && hpBar) {
        // Just update position
        bgBar.setPosition(enemy.x, enemy.y - 50);
        const hpWidth = 32 * hpPercent;
        hpBar.setPosition(enemy.x - 16 + (hpWidth / 2), enemy.y - 50);
        hpBar.width = hpWidth;
        
        // Update color based on HP
        const color = hpPercent > 0.5 ? 0x22c55e : hpPercent > 0.25 ? 0xf59e0b : 0xef4444;
        hpBar.setFillStyle(color);
      }
    });
    
    // Update UI
    const cooldownInfo = [];
    if (this.dashCooldown > 0) cooldownInfo.push(`Dash: ${(this.dashCooldown / 1000).toFixed(1)}s`);
    if (this.areaCooldown > 0) cooldownInfo.push(`Area: ${(this.areaCooldown / 1000).toFixed(1)}s`);
    
    // Update active abilities display (separate from score)
    const abilityInfo: string[] = [];
    this.activePowerUps.forEach((time, type) => {
      const icons = { speed: '⚡', shield: '🛡️', damage: '💥', attackSpeed: '⚔️', lifeSteal: '💚', multiShot: '🎯', magnet: '🧲', freeze: '❄️' };
      const icon = icons[type as keyof typeof icons] || '✨';
      abilityInfo.push(`${icon} ${(time / 1000).toFixed(0)}s`);
    });
    
    // Clamp displayed HP to 0 minimum
    const displayHP = Math.max(0, Math.floor(this.playerHP));
    
    this.hpText.setText(`HP: ${displayHP}/${this.maxHP}`);
    
    // Show YOU DIED message in HUD when HP is 0
    if (displayHP === 0 && !this.gameOver) {
      this.hpText.setText(`HP: 0/${this.maxHP} - YOU DIED!`);
      this.hpText.setColor('#ff0000');
    } else if (displayHP < 30) {
      // Low HP warning (red text)
      this.hpText.setColor('#ef4444');
    } else {
      this.hpText.setColor('#22c55e');
    }
    
    this.scoreText.setText(`Score: ${this.score}`);
    this.waveText.setText(`Wave: ${this.currentWave}`);
    this.abilitiesText.setText(abilityInfo.length > 0 ? abilityInfo.join('  ') : '');
    
    // Combo display
    if (this.comboCount > 1) {
      this.comboText.setText(`${this.comboCount}x COMBO!`);
      this.comboText.setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }
    
    // Update power-ups
    this.updatePowerUps(delta);
    
    // Check power-up pickups
    this.powerUpPickups.children.entries.forEach((pickup: any) => {
      if (!pickup.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
      const magnetRange = this.activePowerUps.has('magnet') ? 150 : 50;
      
      if (dist < magnetRange) {
        this.physics.moveToObject(pickup, this.player, 200);
        
        if (dist < 30) {
          this.collectPowerUp(pickup.getData('type'));
          pickup.destroy();
        }
      }
    });
    
    // Check for wave completion
    if (this.waveInProgress && this.enemies.countActive() === 0) {
      this.startNextWave();
    }
    
    // Death check
    if (this.playerHP <= 0 && !this.gameOver) {
      this.handleDeath();
    }
  }
  
  private createSprites() {
    // Check if sprite sheets loaded, otherwise create procedural graphics
    const useSprites = this.textures.exists('player-sprite');
    
    if (!useSprites) {
      console.log('Creating procedural sprites...');
      
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
    } else {
      console.log('Using sprite sheet graphics!');
      // Sprite sheets loaded - create aliases for texture names
      // Use actual tile sprites if available
      if (!this.textures.exists('wall-sprite')) {
        // Create fallback tiles only if wall sprite doesn't exist
        const wallGraphics = this.make.graphics({ x: 0, y: 0 });
        wallGraphics.fillStyle(0x333333);
        wallGraphics.fillRect(0, 0, 64, 64);
        wallGraphics.generateTexture('wall', 64, 64);
        wallGraphics.destroy();
      } else {
        // Use the loaded tile sprites
        console.log('Using tile sprites for walls and floors');
      }
      
      if (!this.textures.exists('floor-sprite')) {
        const floorGraphics = this.make.graphics({ x: 0, y: 0 });
        floorGraphics.fillStyle(0xf97316);
        floorGraphics.fillRect(0, 0, 64, 64);
        floorGraphics.generateTexture('floor', 64, 64);
        floorGraphics.destroy();
      }
    }
  }
  
  private generateLevel() {
    // Add atmospheric forest background
    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(0x2d5a3d, 0x2d5a3d, 0x1a3326, 0x1a3326, 1, 1, 1, 1);
    bgGradient.fillRect(0, 0, 640, 640);
    bgGradient.setDepth(-10);
    
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
        // Beautiful wooden wall from Sprout Lands
        const wall = this.walls.create(posX, posY, undefined);
        wall.setOrigin(0.5);
        wall.setDisplaySize(tileSize, tileSize);
        
        // Make wall physics body much smaller for easy movement (50% of tile)
        wall.body.setSize(tileSize * 0.5, tileSize * 0.5);
        wall.body.setOffset(tileSize * 0.25, tileSize * 0.25);
        
        wall.refreshBody();
        wall.setDepth(5);
        
        // Add visual wooden wall texture
        if (this.textures.exists('wood-wall')) {
          const wallSprite = this.add.image(posX, posY, 'wood-wall');
          wallSprite.setOrigin(0.5);
          wallSprite.setDisplaySize(tileSize, tileSize);
          wallSprite.setDepth(5);
          wallSprite.setTint(0x8b6f47); // Darker brown for contrast
          
          // Add stronger shadow for depth
          const shadow = this.add.rectangle(posX, posY + 2, tileSize - 6, tileSize - 6, 0x000000, 0.4);
          shadow.setDepth(4);
        } else {
          const wallTexture = this.textures.exists('wall-sprite') ? 'wall-sprite' : 'wall';
          const wallVis = this.add.sprite(posX, posY, wallTexture);
          wallVis.setOrigin(0.5);
          wallVis.setDisplaySize(tileSize, tileSize);
          wallVis.setDepth(5);
        }
      } else {
        // Beautiful grass floor from Sprout Lands - Make VERY visible
        let floor;
        if (this.textures.exists('grass-floor')) {
          floor = this.add.image(posX, posY, 'grass-floor');
          floor.setOrigin(0.5);
          floor.setDisplaySize(tileSize, tileSize);
          floor.setDepth(-1);
          
          // Brighter grass colors for clear visibility
          const grassVar = Math.floor(Math.random() * 3);
          floor.setTint(grassVar === 0 ? 0xd4f5d4 : grassVar === 1 ? 0xc8f0c8 : 0xbcebbc);
        } else {
          // Fallback: bright green floor
          floor = this.add.rectangle(posX, posY, tileSize, tileSize, 0x7ec850);
          floor.setDepth(-1);
        }
        
        // Add clear border to show walkable area
        const border = this.add.rectangle(posX, posY, tileSize - 2, tileSize - 2, 0x000000, 0);
        border.setStrokeStyle(1, 0x90ee90, 0.3);
        border.setDepth(-1);
        
        this.floorTiles.push({ x: posX, y: posY });
        
        // Add decorative plants/flowers (12% chance)
        if (Math.random() < 0.12 && this.textures.exists('plants')) {
          const decoration = this.add.image(
            posX + (Math.random() - 0.5) * 25, 
            posY + (Math.random() - 0.5) * 25, 
            'plants'
          );
          decoration.setOrigin(0.5);
          decoration.setScale(1.8);
          decoration.setDepth(1);
          decoration.setAlpha(0.75);
          
          // Random decoration colors
          const colors = [0x90ee90, 0xffb6c1, 0xffd700, 0xffffff];
          decoration.setTint(colors[Math.floor(Math.random() * colors.length)]);
        }
      }
    });
    
    // Place player on first floor tile
    const start = this.floorTiles[0];
    if (!start) {
      console.error('No floor tiles available for player spawn');
      return;
    }
    
    // Create player using Soldier sprite
    this.player = this.physics.add.sprite(start.x, start.y, 'soldier-idle');
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    
    // Scale to 120x120 for better visibility and performance balance
    this.player.setDisplaySize(120, 120);
    
    // Proportional physics body for better collision (60% of visual size)
    if (this.player.body) {
      this.player.body.setSize(70, 70);
      this.player.body.setOffset(25, 30); // Center the body
    }
    
    // Play idle animation
    this.player.play('soldier-idle-anim');
    
    // Sprite already has built-in shadows
    
    // Place initial wave of enemies
    this.spawnWave();
  }
  
  private spawnWave() {
    this.waveInProgress = true;
    
    if (this.isBossWave && !this.bossSpawned) {
      // Spawn boss
      this.spawnBoss();
      this.bossSpawned = true;
    } else {
      // Spawn regular enemies with variety
      const enemyCount = this.enemiesPerWave;
      
      for (let i = 0; i < enemyCount && this.floorTiles.length > i + 1; i++) {
        const tile = this.floorTiles[Math.floor(Math.random() * (this.floorTiles.length - 1)) + 1];
        if (!tile) continue;
        
        // Mix enemy types: 50% normal, 25% fast, 25% tank
        const rand = Math.random();
        let enemyType = this.monsterType;
        if (rand < 0.25) {
          enemyType = 'Fast';
        } else if (rand < 0.5) {
          enemyType = 'Tank';
        }
        
        const enemy = this.enemies.create(tile.x, tile.y, 'orc-idle');
        this.setupEnemy(enemy, enemyType);
        enemy.setDepth(8);
        
        // Scale to 110x110 for better visibility and hitbox balance
        enemy.setDisplaySize(110, 110);
        
        // Proportional physics body (60% of visual size)
        enemy.body.setSize(65, 65);
        enemy.body.setOffset(23, 28);
        
        // Apply color tint based on enemy type for visual variety
        if (enemyType === 'Fast') {
          enemy.setTint(0xff6666); // Red tint for fast enemies
        } else if (enemyType === 'Tank') {
          enemy.setTint(0x6666ff); // Blue tint for tank enemies
        } else {
          enemy.setTint(0x66ff66); // Green tint for normal enemies
        }
        
        // Play idle animation
        enemy.play('orc-idle-anim');
        
        // Sprite has built-in shadow
      }
    }
  }
  
  private spawnBoss() {
    // Spawn boss in center if possible
    const centerTile = this.floorTiles[Math.floor(this.floorTiles.length / 2)];
    if (!centerTile) return;
    
    const bossTexture = 'dragon'; // Use dragon as boss
    const boss = this.enemies.create(centerTile.x, centerTile.y, bossTexture);
    boss.setScale(1.5); // Bigger boss
    this.setupEnemy(boss, 'Boss');
    
    // Scale up boss sprite
    if (this.textures.exists('enemy-dragon-sprite')) {
      boss.setDisplaySize(72, 72); // Larger for boss
    }
  }
  
  // REMOVED: getEnemyAnimKey() - never used
  // REMOVED: getEnemyTextureByType() - never used 
  // REMOVED: getEnemyTextureByType_OLD() - old version
  // REMOVED: getEnemyTexture() - never used
  
  private startNextWave() {
    this.waveInProgress = false;
    this.currentWave++;
    
    // Check for boss wave (every 10 waves)
    this.isBossWave = this.currentWave % 10 === 0;
    this.bossSpawned = false;
    
    // HP Reward +20
    this.maxHP += 20;
    this.playerHP = Math.min(this.playerHP + 20, this.maxHP);
    
    // Check achievements
    this.checkAchievements();
    
    // Show HP reward
    const hpReward = this.add.text(320, 200, '+20 HP!', {
      fontSize: '32px',
      color: '#22c55e',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: hpReward,
      y: 160,
      alpha: 0,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => hpReward.destroy()
    });
    
    // Increase difficulty each wave
    this.enemiesPerWave = Math.min(3 + Math.floor(this.currentWave / 2), 8);
    
    // Show wave notification
    const waveText = this.isBossWave ? `BOSS WAVE ${this.currentWave}!` : `Wave ${this.currentWave}!`;
    const waveColor = this.isBossWave ? '#ef4444' : '#fbbf24';
    const waveNotif = this.add.text(320, 320, waveText, {
      fontSize: this.isBossWave ? '56px' : '48px',
      color: waveColor,
      stroke: '#000',
      strokeThickness: 4
    }).setOrigin(0.5);
    
    if (this.isBossWave) {
      // Boss wave warning animation
      this.cameras.main.shake(500, 0.01);
      this.tweens.add({
        targets: waveNotif,
        scale: 1.2,
        yoyo: true,
        duration: 300,
        repeat: 2
      });
    }
    
    this.tweens.add({
      targets: waveNotif,
      alpha: 0,
      y: 280,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => waveNotif.destroy()
    });
    
    // Spawn next wave after delay
    this.time.delayedCall(2000, () => {
      this.spawnWave();
    });
  }
  
  private setupEnemy(enemy: Phaser.Physics.Arcade.Sprite, enemyType?: string) {
    let hp = 30;
    let damage = 10;
    let speed = 120;
    let attackRange = 150;
    
    // Use enemyType if provided, otherwise use monsterType
    const type = enemyType || this.monsterType;
    
    // Store enemy type for animation lookups
    enemy.setData('type', type);
    
    switch (type) {
      case 'Fast':
        hp = 20;
        damage = 6;
        speed = 220;
        attackRange = 130;
        break;
      case 'Tank':
        hp = 80;
        damage = 15;
        speed = 80;
        attackRange = 140;
        break;
      case 'Boss':
        hp = 500;
        damage = 25;
        speed = 100;
        attackRange = 200;
        break;
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
    
    // Scale enemy stats with wave difficulty
    const waveMultiplier = 1 + (this.currentWave - 1) * 0.15;
    hp = Math.floor(hp * waveMultiplier);
    damage = Math.floor(damage * Math.min(waveMultiplier, 2));
    
    enemy.setData('hp', hp);
    enemy.setData('maxHp', hp);
    enemy.setData('damage', damage);
    enemy.setData('speed', speed);
    enemy.setData('attackRange', attackRange);
    enemy.setData('attackCooldown', 0);
    
    // Create HP bars ONCE here (not every frame!)
    const bgBar = this.add.rectangle(enemy.x, enemy.y - 50, 32, 4, 0x000000, 0.5);
    bgBar.setDepth(10);
    enemy.setData('healthBarBg', bgBar);
    
    const hpBar = this.add.rectangle(enemy.x, enemy.y - 50, 32, 4, 0x22c55e);
    hpBar.setDepth(11);
    enemy.setData('healthBar', hpBar);
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
    // Play attack animation
    this.player.play('soldier-attack-anim', true);
    
    // Screen shake on attack
    this.cameras.main.shake(60, 0.005);
    
    // Attack lunge forward
    const facingRight = !this.player.flipX;
    const lungeDistance = 20;
    const lungeX = facingRight ? lungeDistance : -lungeDistance;
    
    this.tweens.add({
      targets: this.player,
      x: this.player.x + lungeX,
      duration: 100,
      yoyo: true,
      ease: 'Power2.easeOut'
    });
    
    // Apply power-ups
    const baseDamage = this.playerDamage;
    const damageMultiplier = this.activePowerUps.has('damage') ? 2 : 1;
    const finalDamage = baseDamage * damageMultiplier;
    
    // Multi-shot creates 3 hitboxes
    const hitboxCount = this.activePowerUps.has('multiShot') ? 3 : 1;
    const angleOffset = hitboxCount > 1 ? Math.PI / 6 : 0; // 30 degrees apart
    
    for (let i = 0; i < hitboxCount; i++) {
      const angle = (i - Math.floor(hitboxCount / 2)) * angleOffset;
      const offsetX = Math.cos(angle) * 40 * i;
      const offsetY = Math.sin(angle) * 40 * i;
      
      const hitbox = this.attackHitbox.create(
        this.player.x + offsetX,
        this.player.y + offsetY,
        undefined
      ) as Phaser.Physics.Arcade.Sprite;
      
      hitbox.setCircle(24);
      hitbox.setData('damage', finalDamage);
      hitbox.setData('lifetime', 10);
      hitbox.setAlpha(0.5);
      
      // Visual effect
      const circle = this.add.circle(
        this.player.x + offsetX,
        this.player.y + offsetY,
        24,
        this.activePowerUps.has('damage') ? 0xef4444 : 0xfacc15,
        0.5
      );
      this.tweens.add({
        targets: circle,
        alpha: 0,
        duration: 167,
        onComplete: () => circle.destroy()
      });
    }
  }
  
  private dash() {
    // Quick dash in movement direction
    const velocityX = this.player.body!.velocity.x;
    const velocityY = this.player.body!.velocity.y;
    
    if (velocityX === 0 && velocityY === 0) return;
    
    const dashDistance = 200;
    const angle = Math.atan2(velocityY, velocityX);
    
    this.invincible = 300; // Brief invincibility during dash
    
    // Dash effect
    const dashTrail = this.add.circle(this.player.x, this.player.y, 20, 0x60a5fa, 0.6);
    this.tweens.add({
      targets: dashTrail,
      alpha: 0,
      scale: 1.5,
      duration: 300,
      onComplete: () => dashTrail.destroy()
    });
    
    // Move player
    this.tweens.add({
      targets: this.player,
      x: this.player.x + Math.cos(angle) * dashDistance,
      y: this.player.y + Math.sin(angle) * dashDistance,
      duration: 150,
      ease: 'Power2'
    });
  }
  
  private areaAttack() {
    // Damage all nearby enemies
    const radius = 150;
    
    // Visual effect
    const circle = this.add.circle(this.player.x, this.player.y, radius, 0xfacc15, 0.3);
    this.tweens.add({
      targets: circle,
      alpha: 0,
      scale: 1.2,
      duration: 500,
      onComplete: () => circle.destroy()
    });
    
    // Screen shake
    this.cameras.main.shake(200, 0.02);
    
    // Damage enemies in range
    this.enemies.children.entries.forEach((enemyObj) => {
      const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= radius) {
        let hp = enemy.getData('hp');
        const areaDamage = Math.floor(this.playerDamage * 1.5);
        hp -= areaDamage;
        enemy.setData('hp', hp);
        
        // Knockback
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        enemy.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
        
        // Damage number
        const damageText = this.add.text(enemy.x, enemy.y - 20, `-${areaDamage}`, {
          fontSize: '20px',
          color: '#ff4444',
          stroke: '#000',
          strokeThickness: 3
        }).setOrigin(0.5);
        
        this.tweens.add({
          targets: damageText,
          y: enemy.y - 50,
          alpha: 0,
          duration: 800,
          onComplete: () => damageText.destroy()
        });
        
        if (hp <= 0) {
          this.handleEnemyDeath(enemy);
        }
      }
    });
  }
  
  private handleAttackHit(hitbox: any, enemy: any) {
    const damage = hitbox.getData('damage');
    let hp = enemy.getData('hp');
    hp -= damage;
    enemy.setData('hp', hp);
    
    // Life steal effect
    if (this.activePowerUps.has('lifeSteal')) {
      const healAmount = Math.floor(damage * 0.5);
      this.playerHP = Math.min(this.playerHP + healAmount, this.maxHP);
      
      // Show heal text
      const healText = this.add.text(this.player.x, this.player.y - 30, `+${healAmount}`, {
        fontSize: '16px',
        color: '#22c55e',
        stroke: '#000',
        strokeThickness: 2
      }).setOrigin(0.5).setDepth(100);
      
      this.tweens.add({
        targets: healText,
        y: healText.y - 30,
        alpha: 0,
        duration: 600,
        onComplete: () => healText.destroy()
      });
    }
    
    hitbox.destroy();
    
    // Hit pause for impact feel
    this.physics.pause();
    this.time.delayedCall(30, () => this.physics.resume());
    
    // Screen shake on hit
    this.cameras.main.shake(100, 0.01);
    
    // Play hurt animation
    enemy.play('orc-hurt-anim', true);
    enemy.setTint(0xff4444);
    
    // Impact flash
    const flash = this.add.circle(enemy.x, enemy.y, 50, 0xffffff, 0.7);
    flash.setDepth(99);
    this.tweens.add({
      targets: flash,
      scale: 2.5,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy()
    });
    
    // Knockback effect
    const knockbackAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    this.tweens.add({
      targets: enemy,
      x: enemy.x + Math.cos(knockbackAngle) * 30,
      y: enemy.y + Math.sin(knockbackAngle) * 30,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        enemy.clearTint();
      }
    });
    
    // Show damage number
    const damageText = this.add.text(enemy.x, enemy.y - 20, `-${damage}`, {
      fontSize: '20px',
      color: '#ff4444',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    this.tweens.add({
      targets: damageText,
      y: enemy.y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => damageText.destroy()
    });
    
    // Damage particles
    for (let i = 0; i < 3; i++) {
      const particle = this.add.circle(enemy.x, enemy.y, 3, 0xff4444);
      this.tweens.add({
        targets: particle,
        x: enemy.x + Phaser.Math.Between(-20, 20),
        y: enemy.y + Phaser.Math.Between(-20, 20),
        alpha: 0,
        duration: 400,
        onComplete: () => particle.destroy()
      });
    }
    
    if (hp <= 0) {
      this.handleEnemyDeath(enemy);
    }
  }
  
  private handleEnemyDeath(enemy: Phaser.Physics.Arcade.Sprite) {
    // Combo system
    const now = Date.now();
    if (now - this.lastKillTime < 3000) {
      this.comboCount++;
      // Check combo achievement
      if (this.comboCount >= 5) {
        this.checkAchievements();
      }
    } else {
      this.comboCount = 1;
    }
    this.lastKillTime = now;
    this.comboTimer = 3000;
    
    // Score with combo multiplier
    const comboBonus = Math.min(this.comboCount, 5);
    this.score += 100 * this.currentWave * comboBonus;
    
    // Chance to drop health pickup (15%)
    if (Math.random() < 0.15) {
      const healthPickup = this.add.circle(enemy.x, enemy.y, 12, 0x22c55e);
      healthPickup.setData('isHealthPickup', true);
      
      // Animate pickup
      this.tweens.add({
        targets: healthPickup,
        y: enemy.y - 10,
        yoyo: true,
        duration: 500,
        repeat: 5,
        onComplete: () => {
          this.tweens.add({
            targets: healthPickup,
            alpha: 0,
            duration: 300,
            onComplete: () => healthPickup.destroy()
          });
        }
      });
      
      // Check player collision with pickup
      this.time.addEvent({
        delay: 100,
        repeat: 30,
        callback: () => {
          if (!healthPickup.active) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, healthPickup.x, healthPickup.y);
          if (dist < 30) {
            this.playerHP = Math.min(this.playerHP + 30, this.maxHP);
            const healText = this.add.text(this.player.x, this.player.y - 20, '+30 HP', {
              fontSize: '18px',
              color: '#22c55e',
              stroke: '#000',
              strokeThickness: 3
            }).setOrigin(0.5);
            this.tweens.add({
              targets: healText,
              y: this.player.y - 50,
              alpha: 0,
              duration: 800,
              onComplete: () => healText.destroy()
            });
            healthPickup.destroy();
          }
        }
      });
    }
    
    // Chance to drop power-up (10% chance)
    if (Math.random() < 0.10) {
      this.spawnPowerUp(enemy.x, enemy.y);
    }
    
    // Play death animation
    enemy.play('orc-death-anim');
    enemy.setTint(0xff3333);
    
    // Fade out and destroy after animation
    this.tweens.add({
      targets: enemy,
      alpha: 0,
      duration: 600,
      delay: 400,
      onComplete: () => {
        // Destroy HP bars before destroying enemy
        const bgBar = enemy.getData('healthBarBg');
        const hpBar = enemy.getData('healthBar');
        if (bgBar) bgBar.destroy();
        if (hpBar) hpBar.destroy();
        
        // Enhanced particle burst effect
        const particleCount = 16;
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * Math.PI * 2;
          const distance = 60;
          const targetX = enemy.x + Math.cos(angle) * distance;
          const targetY = enemy.y + Math.sin(angle) * distance;
          
          const particle = this.add.circle(enemy.x, enemy.y, 5, 0xff3333, 0.8);
          particle.setDepth(99);
          
          this.tweens.add({
            targets: particle,
            x: targetX,
            y: targetY,
            alpha: 0,
            scale: 0.3,
            duration: 400,
            ease: 'Power2',
            onComplete: () => particle.destroy()
          });
        }
        enemy.destroy();
      }
    });
  }
  
  private checkAchievements() {
    const achievements = [];
    
    if (this.currentWave === 5 && !this.achievements.has('wave5')) {
      this.achievements.add('wave5');
      achievements.push({ title: 'Survivor', desc: 'Reach Wave 5' });
    }
    if (this.currentWave === 10 && !this.achievements.has('wave10')) {
      this.achievements.add('wave10');
      achievements.push({ title: 'Veteran', desc: 'Reach Wave 10' });
    }
    if (this.currentWave === 20 && !this.achievements.has('wave20')) {
      this.achievements.add('wave20');
      achievements.push({ title: 'Champion', desc: 'Reach Wave 20' });
    }
    if (this.comboCount >= 5 && !this.achievements.has('combo5')) {
      this.achievements.add('combo5');
      achievements.push({ title: 'Combo Master', desc: '5x Combo!' });
    }
    if (this.score >= 10000 && !this.achievements.has('score10k')) {
      this.achievements.add('score10k');
      achievements.push({ title: 'High Scorer', desc: '10,000 Points' });
    }
    
    // Show achievement notifications
    achievements.forEach((achievement, index) => {
      const achText = this.add.text(320, 100 + (index * 60), `🏆 ${achievement.title}\n${achievement.desc}`, {
        fontSize: '24px',
        color: '#fbbf24',
        stroke: '#000',
        strokeThickness: 3,
        align: 'center'
      }).setOrigin(0.5).setDepth(1000);
      
      this.tweens.add({
        targets: achText,
        alpha: 0,
        y: achText.y - 50,
        duration: 3000,
        delay: 1000,
        ease: 'Power2',
        onComplete: () => achText.destroy()
      });
    });
  }
  
  private spawnPowerUp(x: number, y: number) {
    const powerUpTypes = [
      { type: 'speed', color: 0x06b6d4, name: 'Speed Boost', duration: 8000 },
      { type: 'shield', color: 0x8b5cf6, name: 'Shield', duration: 6000 },
      { type: 'damage', color: 0xef4444, name: 'Damage Boost', duration: 10000 },
      { type: 'attackSpeed', color: 0xf59e0b, name: 'Attack Speed', duration: 8000 },
      { type: 'lifeSteal', color: 0xec4899, name: 'Life Steal', duration: 10000 },
      { type: 'multiShot', color: 0x14b8a6, name: 'Multi-Shot', duration: 7000 },
      { type: 'magnet', color: 0x84cc16, name: 'Magnet', duration: 12000 },
      { type: 'freeze', color: 0x60a5fa, name: 'Freeze', duration: 5000 }
    ];
    
    // Weight the drops (common to rare)
    const weights = [25, 15, 20, 18, 10, 8, 12, 12]; // Total: 120
    let random = Math.random() * 120;
    let selectedIndex = 0;
    
    for (let i = 0; i < weights.length; i++) {
      const weight = weights[i];
      if (weight === undefined) continue;
      random -= weight;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }
    
    const powerUp = powerUpTypes[selectedIndex];
    if (!powerUp) return;
    
    const pickup = this.powerUpPickups.create(x, y, undefined);
    
    // Create visual
    const visual = this.add.star(0, 0, 6, 8, 14, powerUp.color);
    visual.setStrokeStyle(2, 0xffffff);
    pickup.setData('visual', visual);
    pickup.setData('type', powerUp.type);
    pickup.setData('name', powerUp.name);
    pickup.setData('duration', powerUp.duration);
    
    // Animate
    this.tweens.add({
      targets: visual,
      angle: 360,
      duration: 2000,
      repeat: -1
    });
    
    this.tweens.add({
      targets: pickup,
      y: y - 15,
      yoyo: true,
      duration: 800,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // Auto-destroy after 15 seconds
    this.time.delayedCall(15000, () => {
      if (pickup.active) {
        this.tweens.add({
          targets: [pickup, visual],
          alpha: 0,
          duration: 500,
          onComplete: () => {
            visual.destroy();
            pickup.destroy();
          }
        });
      }
    });
  }
  
  private collectPowerUp(type: string) {
    const powerUpData = {
      speed: { duration: 8000, name: 'Speed Boost ⚡' },
      shield: { duration: 6000, name: 'Shield 🛡️' },
      damage: { duration: 10000, name: 'Damage Boost 💥' },
      attackSpeed: { duration: 8000, name: 'Attack Speed ⚔️' },
      lifeSteal: { duration: 10000, name: 'Life Steal 💚' },
      multiShot: { duration: 7000, name: 'Multi-Shot 🎯' },
      magnet: { duration: 12000, name: 'Magnet 🧲' },
      freeze: { duration: 5000, name: 'Freeze ❄️' }
    };
    
    const data = powerUpData[type as keyof typeof powerUpData];
    if (!data) return;
    
    // Add/refresh power-up
    this.activePowerUps.set(type, data.duration);
    
    // Show notification
    const notif = this.add.text(this.player.x, this.player.y - 40, data.name, {
      fontSize: '20px',
      color: '#fbbf24',
      stroke: '#000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    
    this.tweens.add({
      targets: notif,
      y: notif.y - 50,
      alpha: 0,
      duration: 1500,
      onComplete: () => notif.destroy()
    });
    
    // Apply instant effects
    if (type === 'freeze') {
      this.enemies.children.entries.forEach((enemyObj) => {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const originalSpeed = enemy.getData('baseSpeed') || enemy.getData('speed');
        enemy.setData('baseSpeed', originalSpeed);
        enemy.setData('speed', originalSpeed * 0.3);
        enemy.setTint(0x60a5fa);
      });
    }
  }
  
  private updatePowerUps(delta: number) {
    const toRemove: string[] = [];
    
    // Update all active power-ups
    this.activePowerUps.forEach((timeLeft, type) => {
      const newTime = timeLeft - delta;
      
      if (newTime <= 0) {
        toRemove.push(type);
      } else {
        this.activePowerUps.set(type, newTime);
      }
    });
    
    // Remove expired power-ups
    toRemove.forEach(type => {
      this.activePowerUps.delete(type);
      
      // Remove freeze effect
      if (type === 'freeze') {
        this.enemies.children.entries.forEach((enemyObj) => {
          const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
          const baseSpeed = enemy.getData('baseSpeed');
          if (baseSpeed) {
            enemy.setData('speed', baseSpeed);
          }
          // Restore enemy type color instead of clearing
          const baseTint = enemy.getData('baseTint') || 0xffffff;
          enemy.setTint(baseTint);
        });
      }
    });
    
    // Update visual indicators on power-up pickups
    this.powerUpPickups.children.entries.forEach((pickup: any) => {
      const visual = pickup.getData('visual');
      if (visual) {
        visual.x = pickup.x;
        visual.y = pickup.y;
      }
    });
    
    // Update player speed
    const baseSpeed = 200;
    const speedMultiplier = this.activePowerUps.has('speed') ? 1.5 : 1;
    this.playerSpeed = baseSpeed * speedMultiplier;
    
    // UI updates now handled in main update loop
  }
  
  private handlePlayerEnemyCollision(player: any, enemy: any) {
    // No damage on collision - only push away
    // Enemy attacks will deal damage separately
    if (!player || !enemy) return;
    
    // Just push player away from enemy
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    this.player.setVelocity(Math.cos(angle) * 100, Math.sin(angle) * 100);
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
