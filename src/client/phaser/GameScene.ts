import Phaser from 'phaser';

// ─── Types ───────────────────────────────────────────────────────────────────
type PlayerClass = 'warrior' | 'rogue' | 'dark-knight';
type EnemyKind = 'orc' | 'skeleton' | 'vampire';
type ElementType = 'fire' | 'ice' | 'none';

interface ClassStats {
  hp: number;
  damage: number;
  speed: number;
  attackRate: number;
  dashCooldown: number;
  areaCooldown: number;
  ability: string;
  element: ElementType;
}

interface EquipmentItem {
  name: string;
  slot: 'weapon' | 'armor' | 'accessory';
  rarity: 'common' | 'rare' | 'epic';
  stat: string;
  value: number;
  color: number;
}

interface GameConfig {
  layout: string;
  monster: string;
  modifier: string;
  playerClass?: PlayerClass;
  onGameOver: (score: number, deathX: number, deathY: number) => void;
  onVictory: (score: number) => void;
}

// ─── Class Stats ─────────────────────────────────────────────────────────────
const CLASS_STATS: Record<PlayerClass, ClassStats> = {
  warrior: {
    hp: 160, damage: 10, speed: 180, attackRate: 500,
    dashCooldown: 3000, areaCooldown: 5000,
    ability: 'Shield Slam – Wide knockback + invincibility', element: 'none',
  },
  rogue: {
    hp: 95, damage: 20, speed: 310, attackRate: 200,
    dashCooldown: 1000, areaCooldown: 3500,
    ability: 'Shadow Step – Teleport behind enemy + crit', element: 'none',
  },
  'dark-knight': {
    hp: 125, damage: 16, speed: 230, attackRate: 350,
    dashCooldown: 2000, areaCooldown: 4000,
    ability: 'Dark Flame – Fire ring + burning trail', element: 'fire',
  },
};

// ─── Enemy Templates ─────────────────────────────────────────────────────────
const ENEMY_TEMPLATES: Record<EnemyKind, { hp: number; damage: number; speed: number; attackRange: number }> = {
  orc:      { hp: 45, damage: 10, speed: 100, attackRange: 200 },   // tank: high HP, slow
  skeleton: { hp: 25, damage: 16, speed: 160, attackRange: 180 },   // glass cannon: fast, fragile
  vampire:  { hp: 50, damage: 9,  speed: 140, attackRange: 220 },   // sustain: lifesteal, moderate
};

// ─── Equipment Pool ──────────────────────────────────────────────────────────
const EQUIPMENT_POOL: EquipmentItem[] = [
  { name: 'Iron Sword',     slot: 'weapon',    rarity: 'common', stat: 'damage',  value: 3,  color: 0xaaaaaa },
  { name: 'Steel Blade',    slot: 'weapon',    rarity: 'rare',   stat: 'damage',  value: 6,  color: 0x60a5fa },
  { name: 'Inferno Edge',   slot: 'weapon',    rarity: 'epic',   stat: 'damage',  value: 10, color: 0xf59e0b },
  { name: 'Leather Vest',   slot: 'armor',     rarity: 'common', stat: 'maxHP',   value: 20, color: 0xaaaaaa },
  { name: 'Chain Mail',     slot: 'armor',     rarity: 'rare',   stat: 'maxHP',   value: 40, color: 0x60a5fa },
  { name: 'Dragon Scale',   slot: 'armor',     rarity: 'epic',   stat: 'maxHP',   value: 70, color: 0xf59e0b },
  { name: 'Swift Ring',     slot: 'accessory', rarity: 'common', stat: 'speed',   value: 30, color: 0xaaaaaa },
  { name: 'Haste Amulet',   slot: 'accessory', rarity: 'rare',   stat: 'speed',   value: 55, color: 0x60a5fa },
  { name: 'Phantom Cloak',  slot: 'accessory', rarity: 'epic',   stat: 'speed',   value: 80, color: 0xf59e0b },
];

// ═══════════════════════════════════════════════════════════════════════════════
export class GameScene extends Phaser.Scene {
  // ── Core objects ──
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private ghosts!: Phaser.GameObjects.Group;
  private attackHitbox!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private chests!: Phaser.Physics.Arcade.Group;

  // ── Input ──
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private shiftKey!: Phaser.Input.Keyboard.Key;
  private eKey!: Phaser.Input.Keyboard.Key;
  private qKey!: Phaser.Input.Keyboard.Key;

  // ── Player stats ──
  private playerClass: PlayerClass = 'warrior';
  private playerHP = 100;
  private maxHP = 100;
  private playerDamage = 10;
  private playerSpeed = 200;
  private attackCooldown = 0;
  private dashCooldown = 0;
  private areaCooldown = 0;
  private invincible = 0;
  private playerElement: ElementType = 'none';

  // ── Equipment ──
  private equipment: Map<string, EquipmentItem> = new Map();
  private equipBonusDamage = 0;
  private equipBonusHP = 0;
  private equipBonusSpeed = 0;

  // ── Combat ──
  private comboCount = 0;
  private comboTimer = 0;
  private lastKillTime = 0;

  // ── Power-ups ──
  private activePowerUps: Map<string, number> = new Map();
  private powerUpPickups!: Phaser.Physics.Arcade.Group;

  // ── Game state ──
  private score = 0;
  private startTime = 0;
  private gameOver = false;
  private _won = false;

  // ── Wave system ──
  private currentWave = 1;
  private enemiesPerWave = 3;
  private waveInProgress = false;
  private floorTiles: { x: number; y: number }[] = [];
  private isBossWave = false;
  private bossSpawned = false;
  private achievements: Set<string> = new Set();

  // ── Config ──
  private layout = '';
  public monsterType = 'Goblin';
  private modifierType = 'Normal';
  private onGameOverCallback?: (score: number, deathX: number, deathY: number) => void;
  private onVictoryCallback?: (score: number) => void;

  // ── HUD ──
  private hpText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private abilitiesText!: Phaser.GameObjects.Text;
  private classText!: Phaser.GameObjects.Text;
  private equipText!: Phaser.GameObjects.Text;
  private _gameOverText?: Phaser.GameObjects.Text;

  // ── Element FX tracking ──
  private burnEffects: Map<Phaser.Physics.Arcade.Sprite, { timer: number; tickTimer: number }> = new Map();
  private freezeEffects: Map<Phaser.Physics.Arcade.Sprite, { timer: number; originalSpeed: number }> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════════════════════════════
  init(data: GameConfig) {
    this.layout = data.layout || '0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000';
    this.monsterType = data.monster || 'Goblin';
    this.modifierType = data.modifier || 'Normal';
    this.playerClass = data.playerClass || 'warrior';
    this.onGameOverCallback = data.onGameOver;
    this.onVictoryCallback = data.onVictory;

    // Reset everything
    this.gameOver = false;
    this._won = false;
    this.score = 0;
    this.startTime = Date.now();
    this.invincible = 0;
    this.currentWave = 1;
    this.enemiesPerWave = 3;
    this.waveInProgress = false;
    this.floorTiles = [];
    this.comboCount = 0;
    this.comboTimer = 0;
    this.lastKillTime = 0;
    this.activePowerUps.clear();
    this.equipment.clear();
    this.equipBonusDamage = 0;
    this.equipBonusHP = 0;
    this.equipBonusSpeed = 0;
    this.burnEffects.clear();
    this.freezeEffects.clear();

    // Apply class stats
    const stats = CLASS_STATS[this.playerClass];
    this.playerHP = stats.hp;
    this.maxHP = stats.hp;
    this.playerDamage = stats.damage;
    this.playerSpeed = stats.speed;
    this.attackCooldown = 0;
    this.dashCooldown = 0;
    this.areaCooldown = 0;
    this.playerElement = stats.element;

    // Apply modifier on top
    this.applyModifier();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRELOAD
  // ═══════════════════════════════════════════════════════════════════════════
  preload() {
    // ── Soldier (100×100 per frame) ──
    const soldierBase = 'sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Characters(100x100)/Soldier/Soldier with shadows';
    this.load.spritesheet('soldier-idle',   `${soldierBase}/Soldier-Idle.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier-walk',   `${soldierBase}/Soldier-Walk.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier-attack', `${soldierBase}/Soldier-Attack01.png`, { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier-hurt',   `${soldierBase}/Soldier-Hurt.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('soldier-death',  `${soldierBase}/Soldier-Death.png`,    { frameWidth: 100, frameHeight: 100 });

    // ── Orc (100×100) ──
    const orcBase = 'sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Characters(100x100)/Orc/Orc with shadows';
    this.load.spritesheet('orc-idle',   `${orcBase}/Orc-Idle.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc-walk',   `${orcBase}/Orc-Walk.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc-attack', `${orcBase}/Orc-Attack01.png`, { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc-hurt',   `${orcBase}/Orc-Hurt.png`,     { frameWidth: 100, frameHeight: 100 });
    this.load.spritesheet('orc-death',  `${orcBase}/Orc-Death.png`,    { frameWidth: 100, frameHeight: 100 });

    // ── Rogue (80×80 per frame, 23 cols × 5 rows) ──
    this.load.spritesheet('rogue-sheet', 'sprites/Rogue.png', { frameWidth: 80, frameHeight: 80 });

    // ── Dark Knight (variable frame widths, 32px tall) ──
    this.load.spritesheet('dk-walk',     'sprites/dark-knight/dark_knight_walk-Sheet.png',    { frameWidth: 48, frameHeight: 32 });  // 384/48 = 8 frames
    this.load.spritesheet('dk-attack',   'sprites/dark-knight/dark_knight_attack1-Sheet.png', { frameWidth: 80, frameHeight: 32 });  // 560/80 = 7 frames
    this.load.spritesheet('dk-hurt',     'sprites/dark-knight/dark_knight_hurt-Sheet.png',    { frameWidth: 48, frameHeight: 32 });  // 240/48 = 5 frames
    this.load.spritesheet('dk-death',    'sprites/dark-knight/dark_knight_defeated-Sheet.png',{ frameWidth: 32, frameHeight: 32 });  // 448/32 = 14 frames

    // ── Skeleton (32×32) ──
    this.load.spritesheet('skeleton-idle',   'sprites/skeleton/enemies-skeleton1_idle.png',        { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton-walk',   'sprites/skeleton/enemies-skeleton1_movement.png',    { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton-attack', 'sprites/skeleton/enemies-skeleton1_attack.png',      { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton-hurt',   'sprites/skeleton/enemies-skeleton1_take_damage.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('skeleton-death',  'sprites/skeleton/enemies-skeleton1_death.png',       { frameWidth: 32, frameHeight: 32 });

    // ── Vampire (32×32) ──
    this.load.spritesheet('vampire-idle',   'sprites/vampire/enemies-vampire_idle.png',        { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire-walk',   'sprites/vampire/enemies-vampire_movement.png',    { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire-attack', 'sprites/vampire/enemies-vampire_attack.png',      { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire-hurt',   'sprites/vampire/enemies-vampire_take_damage.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('vampire-death',  'sprites/vampire/enemies-vampire_death.png',       { frameWidth: 32, frameHeight: 32 });

    // ── Effects ──
    this.load.spritesheet('fire-fx',  'sprites/Fire_Spreadsheet.png',      { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('ice-fx',   'sprites/Ice VFX 1 192x192.png',     { frameWidth: 192, frameHeight: 192 });
    this.load.image('arrow-img',      'sprites/Tiny RPG Character Asset Pack v1.03 -Free Soldier&Orc/Arrow(Projectile)/Arrow01(100x100).png');

    // ── Chest (48×48, 5 cols × 2 rows) ──
    this.load.spritesheet('chest', 'sprites/Sprout Lands - Sprites - Basic pack/Objects/Chest.png', { frameWidth: 48, frameHeight: 48 });

    // ── Environment: Use spritesheets for variety ──
    // Grass tileset: 176×112 = 11 cols × 7 rows of 16×16 tiles
    this.load.spritesheet('grass-tiles', 'sprites/Sprout Lands - Sprites - Basic pack/Tilesets/Grass.png', { frameWidth: 16, frameHeight: 16 });
    // Biom decorations: 144×80 = 9 cols × 5 rows of 16×16
    this.load.spritesheet('biom-deco', 'sprites/Sprout Lands - Sprites - Basic pack/Objects/Basic_Grass_Biom_things.png', { frameWidth: 16, frameHeight: 16 });
    // Plants: 96×32 = 6 cols × 2 rows of 16×16
    this.load.spritesheet('plants-tiles', 'sprites/Sprout Lands - Sprites - Basic pack/Objects/Basic_Plants.png', { frameWidth: 16, frameHeight: 16 });
    
    this.load.image('wood-wall',    'sprites/Sprout Lands - Sprites - Basic pack/Tilesets/Wooden_House_Walls_Tilset.png');

    console.log(`[Snoo's Dungeon] Loading sprites for class: ${this.playerClass}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE ANIMATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  private createAnimations() {
    if (this.anims.exists('soldier-idle-anim')) return;

    // ── Soldier / Warrior (600/100=6 idle, 800/100=8 walk, 600/100=6 atk, 400/100=4 hurt/death) ──
    this.anims.create({ key: 'soldier-idle-anim',   frames: this.anims.generateFrameNumbers('soldier-idle',   { start: 0, end: 5 }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: 'soldier-walk-anim',   frames: this.anims.generateFrameNumbers('soldier-walk',   { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'soldier-attack-anim', frames: this.anims.generateFrameNumbers('soldier-attack', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'soldier-hurt-anim',   frames: this.anims.generateFrameNumbers('soldier-hurt',   { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'soldier-death-anim',  frames: this.anims.generateFrameNumbers('soldier-death',  { start: 0, end: 3 }), frameRate: 8,  repeat: 0 });

    // ── Orc (600/100=6 idle, 800/100=8 walk, 600/100=6 atk, 400/100=4 hurt/death) ──
    this.anims.create({ key: 'orc-idle-anim',   frames: this.anims.generateFrameNumbers('orc-idle',   { start: 0, end: 5 }), frameRate: 6,  repeat: -1 });
    this.anims.create({ key: 'orc-walk-anim',   frames: this.anims.generateFrameNumbers('orc-walk',   { start: 0, end: 7 }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'orc-attack-anim', frames: this.anims.generateFrameNumbers('orc-attack', { start: 0, end: 5 }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'orc-hurt-anim',   frames: this.anims.generateFrameNumbers('orc-hurt',   { start: 0, end: 3 }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'orc-death-anim',  frames: this.anims.generateFrameNumbers('orc-death',  { start: 0, end: 3 }), frameRate: 8,  repeat: 0 });

    // ── Rogue (23 cols × 5 rows — Row0:idle 9fr, Row1:walk 6fr, Row2:attack 12fr, Row3:hurt 5fr, Row4:death 23fr) ──
    this.anims.create({ key: 'rogue-idle-anim',   frames: this.anims.generateFrameNumbers('rogue-sheet', { start: 0,   end: 8   }), frameRate: 8,  repeat: -1 });
    this.anims.create({ key: 'rogue-walk-anim',   frames: this.anims.generateFrameNumbers('rogue-sheet', { start: 23,  end: 28  }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'rogue-attack-anim', frames: this.anims.generateFrameNumbers('rogue-sheet', { start: 46,  end: 57  }), frameRate: 16, repeat: 0 });
    this.anims.create({ key: 'rogue-hurt-anim',   frames: this.anims.generateFrameNumbers('rogue-sheet', { start: 69,  end: 73  }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'rogue-death-anim',  frames: this.anims.generateFrameNumbers('rogue-sheet', { start: 92,  end: 114 }), frameRate: 10, repeat: 0 });

    // ── Dark Knight (walk 48px:8fr, attack 80px:7fr, hurt 48px:5fr, death 32px:14fr) ──
    this.anims.create({ key: 'dk-idle-anim',   frames: this.anims.generateFrameNumbers('dk-walk',   { start: 0, end: 3  }), frameRate: 5,  repeat: -1 });
    this.anims.create({ key: 'dk-walk-anim',   frames: this.anims.generateFrameNumbers('dk-walk',   { start: 0, end: 7  }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'dk-attack-anim', frames: this.anims.generateFrameNumbers('dk-attack', { start: 0, end: 6  }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: 'dk-hurt-anim',   frames: this.anims.generateFrameNumbers('dk-hurt',   { start: 0, end: 4  }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'dk-death-anim',  frames: this.anims.generateFrameNumbers('dk-death',  { start: 0, end: 13 }), frameRate: 8,  repeat: 0 });

    // ── Skeleton ──
    this.anims.create({ key: 'skeleton-idle-anim',   frames: this.anims.generateFrameNumbers('skeleton-idle',   { start: 0, end: 5  }), frameRate: 6,  repeat: -1 });
    this.anims.create({ key: 'skeleton-walk-anim',   frames: this.anims.generateFrameNumbers('skeleton-walk',   { start: 0, end: 9  }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'skeleton-attack-anim', frames: this.anims.generateFrameNumbers('skeleton-attack', { start: 0, end: 8  }), frameRate: 12, repeat: 0 });
    this.anims.create({ key: 'skeleton-hurt-anim',   frames: this.anims.generateFrameNumbers('skeleton-hurt',   { start: 0, end: 4  }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'skeleton-death-anim',  frames: this.anims.generateFrameNumbers('skeleton-death',  { start: 0, end: 16 }), frameRate: 10, repeat: 0 });

    // ── Vampire ──
    this.anims.create({ key: 'vampire-idle-anim',   frames: this.anims.generateFrameNumbers('vampire-idle',   { start: 0, end: 5  }), frameRate: 6,  repeat: -1 });
    this.anims.create({ key: 'vampire-walk-anim',   frames: this.anims.generateFrameNumbers('vampire-walk',   { start: 0, end: 7  }), frameRate: 10, repeat: -1 });
    this.anims.create({ key: 'vampire-attack-anim', frames: this.anims.generateFrameNumbers('vampire-attack', { start: 0, end: 15 }), frameRate: 14, repeat: 0 });
    this.anims.create({ key: 'vampire-hurt-anim',   frames: this.anims.generateFrameNumbers('vampire-hurt',   { start: 0, end: 4  }), frameRate: 10, repeat: 0 });
    this.anims.create({ key: 'vampire-death-anim',  frames: this.anims.generateFrameNumbers('vampire-death',  { start: 0, end: 13 }), frameRate: 10, repeat: 0 });

    // ── Fire FX (128x128, 8x8 = 64 frames) ──
    this.anims.create({ key: 'fire-anim', frames: this.anims.generateFrameNumbers('fire-fx', { start: 0, end: 63 }), frameRate: 24, repeat: -1 });

    // ── Ice FX (192x192, 5x4 = 20 frames) ──
    this.anims.create({ key: 'ice-anim', frames: this.anims.generateFrameNumbers('ice-fx', { start: 0, end: 19 }), frameRate: 16, repeat: 0 });

    // ── Chest (48x48, 5 cols x 2 rows) ──
    this.anims.create({ key: 'chest-closed', frames: [{ key: 'chest', frame: 0 }], frameRate: 1, repeat: 0 });
    this.anims.create({ key: 'chest-open',   frames: this.anims.generateFrameNumbers('chest', { start: 0, end: 4 }), frameRate: 8, repeat: 0 });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: Animation naming
  // ═══════════════════════════════════════════════════════════════════════════
  private get playerAnimPrefix(): string {
    switch (this.playerClass) {
      case 'warrior':      return 'soldier';
      case 'rogue':        return 'rogue';
      case 'dark-knight':  return 'dk';
    }
  }

  private playerAnim(action: string): string {
    return `${this.playerAnimPrefix}-${action}-anim`;
  }

  private enemyAnim(kind: EnemyKind, action: string): string {
    return `${kind}-${action}-anim`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════
  create() {
    this.createAnimations();

    // Groups
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group();
    this.ghosts = this.add.group();
    this.attackHitbox = this.physics.add.group();
    this.powerUpPickups = this.physics.add.group();
    this.projectiles = this.physics.add.group();
    this.chests = this.physics.add.group();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a2f26, 0x1a2f26, 0x0d1b14, 0x0d1b14, 1, 1, 1, 1);
    bg.fillRect(0, 0, 640, 640);
    bg.setDepth(-10);

    // Generate level
    this.generateLevel();

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.shiftKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.eKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.qKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

    // Collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.enemies, this.enemies);  // prevent enemy stacking
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerEnemyCollision, undefined, this);
    this.physics.add.overlap(this.attackHitbox, this.enemies, this.handleAttackHit, undefined, this);
    this.physics.add.overlap(this.projectiles, this.enemies, this.handleProjectileHit, undefined, this);
    this.physics.add.collider(this.projectiles, this.walls, (proj) => { (proj as Phaser.Physics.Arcade.Sprite).destroy(); });

    // HUD
    this.buildHUD();

    // Controls overlay on start
    this.showControlsOverlay();

    this.startTime = Date.now();

    // Ambient particles
    this.time.addEvent({
      delay: 2500,
      callback: () => {
        if (this.gameOver) return;
        const x = Math.random() * 640;
        const y = Math.random() * 560;
        const p = this.add.circle(x, y, 2, 0xd4f1f4, 0.3);
        p.setDepth(20);
        this.tweens.add({
          targets: p, x: x + (Math.random() - 0.5) * 80, y: y + 40, alpha: 0,
          duration: 3000, ease: 'Sine.easeInOut', onComplete: () => p.destroy()
        });
      },
      loop: true,
    });

    // Camera
    this.cameras.main.setBounds(0, 0, 640, 640);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.fetchGhosts();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD HUD
  // ═══════════════════════════════════════════════════════════════════════════
  private buildHUD() {
    const hudY = 565;
    const hudH = 75;

    // HUD background
    this.add.rectangle(0, hudY, 640, hudH, 0x0f0f1e, 0.92).setOrigin(0, 0).setDepth(999).setScrollFactor(0);

    // Top accent bar with class color
    const classColors: Record<PlayerClass, number> = { warrior: 0x22c55e, rogue: 0xa855f7, 'dark-knight': 0xef4444 };
    this.add.rectangle(0, hudY, 640, 2, classColors[this.playerClass], 0.9).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);

    // HP bar background
    this.add.rectangle(12, hudY + 10, 160, 16, 0x333333).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);

    // HP bar fill
    const hpBar = this.add.rectangle(12, hudY + 10, 160, 16, 0x22c55e).setOrigin(0, 0).setDepth(1001).setScrollFactor(0);
    this.player.setData('hpBar', hpBar);

    this.hpText = this.add.text(92, hudY + 18, '', {
      fontSize: '12px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1002).setScrollFactor(0);

    // Class label
    const classIcons: Record<PlayerClass, string> = { warrior: '⚔️', rogue: '🗡️', 'dark-knight': '🔥' };
    this.classText = this.add.text(12, hudY + 30, `${classIcons[this.playerClass]} ${this.playerClass.toUpperCase()}`, {
      fontSize: '11px', color: '#ccc', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0).setDepth(1002).setScrollFactor(0);

    // Controls bar
    const controlsY = hudY + 48;
    this.add.text(12, controlsY, 'WASD Move  |  SPACE Attack  |  SHIFT Dash  |  E Area  |  Q Arrow  |  R Restart', {
      fontSize: '9px', color: '#777', stroke: '#000', strokeThickness: 1
    }).setOrigin(0, 0).setDepth(1002).setScrollFactor(0);

    // Score
    this.scoreText = this.add.text(628, hudY + 8, '', {
      fontSize: '18px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 3, align: 'right'
    }).setOrigin(1, 0).setDepth(1002).setScrollFactor(0);

    // Wave
    this.waveText = this.add.text(628, hudY + 28, '', {
      fontSize: '14px', color: '#60a5fa', fontStyle: 'bold', stroke: '#000', strokeThickness: 3, align: 'right'
    }).setOrigin(1, 0).setDepth(1002).setScrollFactor(0);

    // Equipment display
    this.equipText = this.add.text(185, hudY + 8, '', {
      fontSize: '10px', color: '#d4d4d4', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0).setDepth(1002).setScrollFactor(0);

    // Abilities / power-ups
    this.abilitiesText = this.add.text(185, hudY + 24, '', {
      fontSize: '11px', color: '#a78bfa', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0).setDepth(1002).setScrollFactor(0);

    // Combo text (floating, centered on screen)
    this.comboText = this.add.text(320, 60, '', {
      fontSize: '44px', color: '#ff4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);
  }

  private showControlsOverlay() {
    const classAbility: Record<PlayerClass, string> = {
      warrior: 'E = Shield Slam (wide area knockback)',
      rogue: 'SHIFT = Shadow Step (teleport behind enemy)',
      'dark-knight': 'E = Dark Flame (fire area attack)',
    };

    const overlay = this.add.rectangle(320, 280, 500, 280, 0x000000, 0.85).setDepth(3000).setScrollFactor(0);
    const title = this.add.text(320, 170, '⚔️ CONTROLS', {
      fontSize: '28px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

    const lines = [
      'WASD / Arrows  —  Move',
      'SPACE  —  Attack (melee)',
      'Q  —  Shoot Arrow (ranged)',
      'SHIFT  —  Dash / Dodge',
      'E  —  Area Attack',
      `Class: ${classAbility[this.playerClass]}`,
      'R  —  Restart',
    ];
    const textObjs = lines.map((line, i) => {
      return this.add.text(320, 210 + i * 24, line, {
        fontSize: '14px', color: i === 5 ? '#a78bfa' : '#ddd', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
    });

    const hint = this.add.text(320, 400, 'Press any key to start...', {
      fontSize: '16px', color: '#888', fontStyle: 'italic'
    }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
    this.tweens.add({ targets: hint, alpha: 0.4, yoyo: true, duration: 800, repeat: -1 });

    // Pause physics until dismissed
    this.physics.pause();

    const dismiss = () => {
      this.physics.resume();
      this.tweens.add({
        targets: [overlay, title, hint, ...textObjs],
        alpha: 0, duration: 400, onComplete: () => {
          overlay.destroy(); title.destroy(); hint.destroy();
          textObjs.forEach(t => t.destroy());
        }
      });
      this.input.keyboard!.off('keydown', dismiss);
    };
    this.input.keyboard!.on('keydown', dismiss);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  override update(_time: number, delta: number) {
    if (this.gameOver) {
      if (this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).isDown) {
        this.scene.restart();
      }
      return;
    }

    this.score = Math.floor((Date.now() - this.startTime) / 100);

    // Regen modifier
    if (this.modifierType === 'Regeneration' && this.playerHP < this.maxHP + this.equipBonusHP) {
      this.playerHP = Math.min(this.playerHP + 0.05, this.maxHP + this.equipBonusHP);
    }

    // ── Player movement ──
    let vx = 0, vy = 0;
    const effectiveSpeed = this.playerSpeed + this.equipBonusSpeed + (this.activePowerUps.has('speed') ? 100 : 0);
    if (this.cursors.left.isDown  || this.wasd.A.isDown) vx = -effectiveSpeed;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx = effectiveSpeed;
    if (this.cursors.up.isDown    || this.wasd.W.isDown) vy = -effectiveSpeed;
    if (this.cursors.down.isDown  || this.wasd.S.isDown) vy = effectiveSpeed;
    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.player.setVelocity(vx, vy);

    // Animation
    const isMoving = vx !== 0 || vy !== 0;
    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);

    const curAnim = this.player.anims.currentAnim?.key;
    const isPlaying = this.player.anims.isPlaying;
    const highPriority = isPlaying && (curAnim === this.playerAnim('attack') || curAnim === this.playerAnim('hurt') || curAnim === this.playerAnim('death'));

    if (!highPriority) {
      const target = isMoving ? this.playerAnim('walk') : this.playerAnim('idle');
      if (curAnim !== target) this.player.play(target, true);
    }

    // Dust trail
    if (isMoving && Math.random() < 0.04) {
      const dust = this.add.circle(this.player.x, this.player.y + 30, 3, 0x8b7355, 0.4);
      dust.setDepth(4);
      this.tweens.add({ targets: dust, alpha: 0, scale: 0.5, duration: 400, onComplete: () => dust.destroy() });
    }

    // ── Cooldowns ──
    if (this.attackCooldown > 0) this.attackCooldown -= delta;
    if (this.dashCooldown > 0) this.dashCooldown -= delta;
    if (this.areaCooldown > 0) this.areaCooldown -= delta;
    if (this.comboTimer > 0) { this.comboTimer -= delta; if (this.comboTimer <= 0) this.comboCount = 0; }

    // ── Inputs ──
    const classStats = CLASS_STATS[this.playerClass];

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.attackCooldown <= 0) {
      this.attack();
      const atkMul = this.activePowerUps.has('attackSpeed') ? 0.5 : 1;
      this.attackCooldown = classStats.attackRate * atkMul;
    }

    if (Phaser.Input.Keyboard.JustDown(this.shiftKey) && this.dashCooldown <= 0) {
      this.dash();
      this.dashCooldown = classStats.dashCooldown;
    }

    if (Phaser.Input.Keyboard.JustDown(this.eKey) && this.areaCooldown <= 0) {
      this.areaAttack();
      this.areaCooldown = classStats.areaCooldown;
    }

    if (Phaser.Input.Keyboard.JustDown(this.qKey) && this.attackCooldown <= 0) {
      this.shootArrow();
      this.attackCooldown = classStats.attackRate * 0.8;
    }

    // ── Invincibility frames ──
    if (this.invincible > 0) {
      this.invincible -= delta;
      this.player.setAlpha(this.invincible % 200 < 100 ? 0.5 : 1);
    } else {
      this.player.setAlpha(1);
    }

    // ── Element effects ──
    this.updateElementEffects(delta);

    // ── Enemy AI ──
    this.updateEnemyAI(delta);

    // ── HUD ──
    this.updateHUD();

    // ── Power-ups ──
    this.updatePowerUps(delta);
    this.checkPowerUpPickups();

    // ── Chests ──
    this.checkChestPickups();

    // ── Wave completion ──
    if (this.waveInProgress && this.enemies.countActive() === 0) {
      this.startNextWave();
    }

    // ── Death check ──
    if (this.playerHP <= 0 && !this.gameOver) {
      this.handleDeath();
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════
  private generateLevel() {
    const gridSize = 10;
    const tileSize = 64;
    const tiles = this.layout.padEnd(100, '0').split('').slice(0, 100);

    tiles.forEach((tile, index) => {
      const gx = index % gridSize;
      const gy = Math.floor(index / gridSize);
      const px = gx * tileSize + tileSize / 2;
      const py = gy * tileSize + tileSize / 2;

      if (tile === '0') {
        const wall = this.walls.create(px, py, undefined) as Phaser.Physics.Arcade.Sprite;
        wall.setOrigin(0.5).setDisplaySize(tileSize, tileSize);
        (wall.body as Phaser.Physics.Arcade.StaticBody).setSize(tileSize, tileSize);
        (wall.body as Phaser.Physics.Arcade.StaticBody).setOffset(0, 0);
        (wall as any).refreshBody();
        wall.setDepth(5);

        if (this.textures.exists('wood-wall')) {
          this.add.image(px, py, 'wood-wall').setOrigin(0.5).setDisplaySize(tileSize, tileSize).setDepth(5).setTint(0x9b7f57);
        }
      } else {
        // Frame 12 = solid bright green (rgb 192,212,112) — the cleanest grass tile
        if (this.textures.exists('grass-tiles')) {
          const grassTile = this.add.sprite(px, py, 'grass-tiles', 12);
          grassTile.setOrigin(0.5).setDisplaySize(tileSize, tileSize).setDepth(0);
        } else {
          this.add.rectangle(px, py, tileSize, tileSize, 0xc0d470).setDepth(0);
        }

        // Subtle grid lines so tiles are distinguishable
        this.add.rectangle(px, py, tileSize, tileSize, 0x000000, 0)
          .setStrokeStyle(1, 0xa0b860, 0.25).setDepth(0);

        this.floorTiles.push({ x: px, y: py });

        // Sparse small decorations — placed at center of tile, not random offsets
        const rand = Math.random();
        if (rand < 0.08 && this.textures.exists('plants-tiles')) {
          // Small flower or plant (8% of tiles)
          const plantFrame = [0, 1, 2, 6, 7, 8][Math.floor(Math.random() * 6)];
          const plant = this.add.sprite(px, py, 'plants-tiles', plantFrame);
          plant.setOrigin(0.5).setDisplaySize(20, 20).setDepth(1).setAlpha(0.7);
        } else if (rand >= 0.08 && rand < 0.14 && this.textures.exists('biom-deco')) {
          // Small rock or grass tuft (6% of tiles)
          const decoFrame = [0, 1, 9, 10][Math.floor(Math.random() * 4)];
          const deco = this.add.sprite(px, py, 'biom-deco', decoFrame);
          deco.setOrigin(0.5).setDisplaySize(18, 18).setDepth(1).setAlpha(0.6);
        }
      }
    });

    // Spawn player
    const start = this.floorTiles[0];
    if (!start) { console.error('No floor tiles!'); return; }

    const textureKey = this.getPlayerTexture();
    this.player = this.physics.add.sprite(start.x, start.y, textureKey);
    this.player.setCollideWorldBounds(true).setDepth(10);

    // Sizes calculated from actual pixel content bounding boxes:
    //   Soldier: 17x21 content in 100x100 frame, centered at (41,39)
    //   Rogue:   35x29 content in 80x80 frame, at (19,35)
    //   DK:      full 48x32 frame (no alpha channel, palette mode)
    // Display sizes scaled so visible character is ~50-55px tall
    const sizes: Record<PlayerClass, { dw: number; dh: number; bw: number; bh: number; offX: number; offY: number }> = {
      warrior:       { dw: 250, dh: 250, bw: 20, bh: 24, offX: 40, offY: 38 },  // 100x100 native, content 17x21 at (41,39)
      rogue:         { dw: 150, dh: 150, bw: 36, bh: 30, offX: 19, offY: 35 },  // 80x80 native, content 35x29 at (19,35)
      'dark-knight': { dw: 85,  dh: 56,  bw: 30, bh: 24, offX: 9,  offY: 4  },  // 48x32 native, full frame
    };
    const sz = sizes[this.playerClass];
    this.player.setDisplaySize(sz.dw, sz.dh);
    if (this.player.body) {
      this.player.body.setSize(sz.bw, sz.bh);
      this.player.body.setOffset(sz.offX, sz.offY);
    }

    this.player.play(this.playerAnim('idle'));
    this.spawnWave();
  }

  private getPlayerTexture(): string {
    switch (this.playerClass) {
      case 'warrior':      return 'soldier-idle';
      case 'rogue':        return 'rogue-sheet';
      case 'dark-knight':  return 'dk-walk';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENEMY AI
  // ═══════════════════════════════════════════════════════════════════════════
  private updateEnemyAI(delta: number) {
    this.enemies.children.entries.forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;

      const kind = enemy.getData('kind') as EnemyKind;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);

      let atkCD = enemy.getData('attackCooldown') || 0;
      if (atkCD > 0) enemy.setData('attackCooldown', atkCD - delta);

      const attackRange = enemy.getData('attackRange') || 150;
      const speed = enemy.getData('speed') || 110;

      // Patrol: random wander when out of range
      if (dist >= attackRange) {
        let pt = enemy.getData('patrolTimer') || 0;
        pt -= delta;
        if (pt <= 0) {
          const rx = Phaser.Math.Between(-40, 40);
          const ry = Phaser.Math.Between(-40, 40);
          enemy.setVelocity(rx, ry);
          if (rx !== 0) enemy.setFlipX(rx < 0);
          enemy.setData('patrolTimer', Phaser.Math.Between(1500, 3500));
          const curAnim = enemy.anims.currentAnim?.key;
          if (curAnim !== this.enemyAnim(kind, 'walk')) enemy.play(this.enemyAnim(kind, 'walk'), true);
        } else {
          enemy.setData('patrolTimer', pt);
        }
        const baseTint = enemy.getData('baseTint') || 0xffffff;
        enemy.setTint(baseTint);
      }

      if (dist < attackRange && dist > 30) {
        this.physics.moveToObject(enemy, this.player, speed);

        const curAnim = enemy.anims.currentAnim?.key;
        if (curAnim !== this.enemyAnim(kind, 'attack') && curAnim !== this.enemyAnim(kind, 'hurt')) {
          if (curAnim !== this.enemyAnim(kind, 'walk')) enemy.play(this.enemyAnim(kind, 'walk'), true);
        }

        enemy.setFlipX(enemy.x > this.player.x);

        if (dist < 55) {
          enemy.setTint(0xff8888);

          if (dist < 50 && enemy.getData('attackCooldown') <= 0) {
            enemy.play(this.enemyAnim(kind, 'attack'), true);

            // Vampire life-steal visual
            if (kind === 'vampire') {
              const line = this.add.line(0, 0, enemy.x, enemy.y, this.player.x, this.player.y, 0x8b0000, 0.6).setDepth(99);
              this.tweens.add({ targets: line, alpha: 0, duration: 300, onComplete: () => line.destroy() });
            }

            const atkFx = this.add.circle(enemy.x, enemy.y, 35, 0xff0000, 0.4).setDepth(99);
            this.tweens.add({ targets: atkFx, scale: 1.5, alpha: 0, duration: 300, onComplete: () => atkFx.destroy() });

            if (this.invincible <= 0 && !this.activePowerUps.has('shield')) {
              const dmg = enemy.getData('damage') || 5;
              this.playerHP -= dmg;
              if (this.playerHP < 0) this.playerHP = 0;

              // Vampire heals on hit
              if (kind === 'vampire') {
                const heal = Math.floor(dmg * 0.3);
                const curHP = enemy.getData('hp');
                const mxHP = enemy.getData('maxHp');
                enemy.setData('hp', Math.min(curHP + heal, mxHP));
              }

              const dt = this.add.text(this.player.x, this.player.y - 40, `-${dmg}`, {
                fontSize: '22px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
              }).setOrigin(0.5).setDepth(100);
              this.tweens.add({ targets: dt, y: dt.y - 30, alpha: 0, duration: 800, onComplete: () => dt.destroy() });

              this.cameras.main.shake(80, 0.012);
              this.invincible = 500;
              this.player.play(this.playerAnim('hurt'), true);

              if (this.playerHP <= 0) this.handleDeath();
            }

            enemy.setData('attackCooldown', kind === 'skeleton' ? 800 : kind === 'vampire' ? 600 : 1000);
          }
        } else {
          const baseTint = enemy.getData('baseTint') || 0xffffff;
          enemy.setTint(baseTint);
        }
      }

      // HP bar update
      const hp = enemy.getData('hp') || 0;
      const maxHp = enemy.getData('maxHp') || 1;
      const pct = hp / maxHp;
      const bgBar = enemy.getData('healthBarBg');
      const hpBar = enemy.getData('healthBar');
      const barW = enemy.getData('barWidth') || 60;
      if (bgBar && hpBar) {
        const isBoss = enemy.getData('barWidth') > 60;
        const barY = enemy.y - (isBoss ? 50 : 35);
        bgBar.setPosition(enemy.x, barY);
        const w = barW * pct;
        hpBar.setPosition(enemy.x - barW / 2 + w / 2, barY);
        hpBar.width = w;
        hpBar.setFillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ELEMENT EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  private updateElementEffects(delta: number) {
    // Burn DOT
    this.burnEffects.forEach((data, enemy) => {
      if (!enemy.active) { this.burnEffects.delete(enemy); return; }
      data.timer -= delta;
      data.tickTimer -= delta;
      if (data.tickTimer <= 0) {
        data.tickTimer = 500;
        let hp = enemy.getData('hp');
        hp -= 3;
        enemy.setData('hp', hp);
        enemy.setTint(0xff4400);

        const fp = this.add.sprite(enemy.x, enemy.y - 20, 'fire-fx').setDisplaySize(40, 40).setDepth(99).setAlpha(0.7);
        fp.play('fire-anim');
        this.time.delayedCall(400, () => fp.destroy());

        if (hp <= 0) this.handleEnemyDeath(enemy);
      }
      if (data.timer <= 0) this.burnEffects.delete(enemy);
    });

    // Freeze slow
    this.freezeEffects.forEach((data, enemy) => {
      if (!enemy.active) { this.freezeEffects.delete(enemy); return; }
      data.timer -= delta;
      enemy.setTint(0x88ccff);
      if (data.timer <= 0) {
        enemy.setData('speed', data.originalSpeed);
        enemy.clearTint();
        this.freezeEffects.delete(enemy);
      }
    });
  }

  private applyElement(enemy: Phaser.Physics.Arcade.Sprite, element: ElementType) {
    if (element === 'fire') {
      this.burnEffects.set(enemy, { timer: 3000, tickTimer: 0 });
    } else if (element === 'ice') {
      const origSpeed = enemy.getData('speed');
      enemy.setData('speed', origSpeed * 0.3);
      this.freezeEffects.set(enemy, { timer: 2500, originalSpeed: origSpeed });

      const iceSprite = this.add.sprite(enemy.x, enemy.y, 'ice-fx').setDisplaySize(80, 80).setDepth(99).setAlpha(0.7);
      iceSprite.play('ice-anim');
      iceSprite.on('animationcomplete', () => iceSprite.destroy());
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SPAWN WAVE
  // ═══════════════════════════════════════════════════════════════════════════
  private spawnWave() {
    this.waveInProgress = true;

    if (this.isBossWave && !this.bossSpawned) {
      this.spawnBoss();
      this.bossSpawned = true;
      return;
    }

    const count = this.enemiesPerWave;
    for (let i = 0; i < count && this.floorTiles.length > 1; i++) {
      const tile = this.floorTiles[Math.floor(Math.random() * (this.floorTiles.length - 1)) + 1];
      if (!tile) continue;

      // Spawn all enemy types from the start for variety and testing
      let kind: EnemyKind;
      const r = Math.random();
      if (this.currentWave === 1) {
        // Wave 1: Show all types so player can see them
        kind = i === 0 ? 'orc' : i === 1 ? 'skeleton' : 'vampire';
      } else {
        // Later waves: random mix with increasing variety
        kind = r < 0.4 ? 'orc' : r < 0.7 ? 'skeleton' : 'vampire';
      }

      this.spawnEnemy(tile.x, tile.y, kind);
    }
  }

  private spawnEnemy(x: number, y: number, kind: EnemyKind, bossScale = 1) {
    const textureKey = `${kind}-idle`;
    const enemy = this.enemies.create(x, y, textureKey) as Phaser.Physics.Arcade.Sprite;
    enemy.setDepth(8);

    // Sizes from actual pixel content bounding boxes:
    //   Orc:      23x18 content in 100x100 frame, at (43,42) → display 270x270 for ~55px char
    //   Skeleton: 15x15 content in 32x32 frame, at (7,14) → display 115x115 for ~55px char
    //   Vampire:  12x16 content in 32x32 frame, at (7,13) → display 110x110 for ~55px char
    const displaySizes: Record<EnemyKind, { w: number; h: number }> = {
      orc:      { w: 270, h: 270 },
      skeleton: { w: 115, h: 115 },
      vampire:  { w: 110, h: 110 },
    };
    const ds = displaySizes[kind];
    enemy.setDisplaySize(ds.w * bossScale, ds.h * bossScale);

    // Save the target scale so spawn-in animation can restore it correctly
    const targetScaleX = enemy.scaleX;
    const targetScaleY = enemy.scaleY;
    enemy.setData('targetScaleX', targetScaleX);
    enemy.setData('targetScaleY', targetScaleY);

    // Physics body in NATIVE sprite coords — centered on the actual character content
    const bodySizes: Record<EnemyKind, { w: number; h: number; ox: number; oy: number }> = {
      orc:      { w: 24, h: 20, ox: 42, oy: 42 },   // content at (43,42)
      skeleton: { w: 16, h: 16, ox: 7,  oy: 14 },   // content at (7,14)
      vampire:  { w: 14, h: 18, ox: 7,  oy: 13 },   // content at (7,13)
    };
    const bs = bodySizes[kind];
    if (enemy.body) {
      enemy.body.setSize(bs.w, bs.h);
      enemy.body.setOffset(bs.ox, bs.oy);
    }

    // No heavy tints — let sprites show their natural colors
    const tints: Record<EnemyKind, number> = { orc: 0xffffff, skeleton: 0xffffff, vampire: 0xffcccc };
    enemy.setTint(tints[kind]);
    enemy.setData('baseTint', tints[kind]);
    enemy.setData('kind', kind);

    const template = ENEMY_TEMPLATES[kind];
    const waveMul = 1 + (this.currentWave - 1) * 0.15;
    const hp = Math.floor(template.hp * waveMul * bossScale * (bossScale > 1 ? 5 : 1));
    const damage = Math.floor(template.damage * Math.min(waveMul, 2.5) * bossScale);

    enemy.setData('hp', hp);
    enemy.setData('maxHp', hp);
    enemy.setData('damage', damage);
    enemy.setData('speed', template.speed);
    enemy.setData('attackRange', template.attackRange);
    enemy.setData('attackCooldown', 0);

    const barW = 60 * bossScale;
    const barY = y - 35 * bossScale;  // Fixed offset above character center
    const bgBar = this.add.rectangle(x, barY, barW, 6, 0x000000, 0.7).setDepth(10);
    const hpBar = this.add.rectangle(x, barY, barW, 6, 0x22c55e).setDepth(11);
    enemy.setData('healthBarBg', bgBar);
    enemy.setData('healthBar', hpBar);
    enemy.setData('barWidth', barW);

    enemy.play(this.enemyAnim(kind, 'idle'));

    // Spawn-in effect — use saved target scales so displaySize is preserved!
    const tsx = enemy.getData('targetScaleX') as number;
    const tsy = enemy.getData('targetScaleY') as number;
    enemy.setAlpha(0);
    enemy.setScale(tsx * 0.3, tsy * 0.3);
    this.tweens.add({
      targets: enemy,
      scaleX: tsx,
      scaleY: tsy,
      alpha: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });
  }

  private spawnBoss() {
    const tile = this.floorTiles[Math.floor(this.floorTiles.length / 2)];
    if (!tile) return;

    this.spawnEnemy(tile.x, tile.y, 'vampire', 1.8);

    this.cameras.main.shake(500, 0.015);
    const label = this.add.text(320, 300, '⚔️ VAMPIRE LORD ⚔️', {
      fontSize: '32px', color: '#ff2222', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(1005);
    this.tweens.add({ targets: label, scale: 1.3, yoyo: true, duration: 300, repeat: 3 });
    this.tweens.add({ targets: label, alpha: 0, y: 260, duration: 2500, delay: 1000, onComplete: () => label.destroy() });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT WAVE
  // ═══════════════════════════════════════════════════════════════════════════
  private startNextWave() {
    this.waveInProgress = false;
    this.currentWave++;

    // Victory after wave 20!
    if (this.currentWave > 20) {
      this.handleVictory();
      return;
    }

    this.isBossWave = this.currentWave % 10 === 0;
    this.bossSpawned = false;

    this.maxHP += 15;
    this.playerHP = Math.min(this.playerHP + 20, this.maxHP + this.equipBonusHP);

    const rw = this.add.text(320, 200, '+20 HP!', {
      fontSize: '28px', color: '#22c55e', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({ targets: rw, y: 170, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => rw.destroy() });

    this.enemiesPerWave = Math.min(3 + Math.floor(this.currentWave / 2), 10);

    const isBoss = this.isBossWave;
    const txt = isBoss ? `⚔️ BOSS WAVE ${this.currentWave}!` : `Wave ${this.currentWave}`;
    const wn = this.add.text(320, 320, txt, {
      fontSize: isBoss ? '48px' : '40px', color: isBoss ? '#ef4444' : '#fbbf24',
      fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5);

    if (isBoss) {
      this.cameras.main.shake(400, 0.01);
      this.tweens.add({ targets: wn, scale: 1.2, yoyo: true, duration: 300, repeat: 2 });
    }
    this.tweens.add({ targets: wn, alpha: 0, y: 280, duration: 2000, ease: 'Power2', onComplete: () => wn.destroy() });

    this.checkAchievements();
    this.time.delayedCall(2000, () => this.spawnWave());
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTACK (SPACE)
  // ═══════════════════════════════════════════════════════════════════════════
  private attack() {
    this.player.play(this.playerAnim('attack'), true);
    this.cameras.main.shake(60, 0.006);

    const facingRight = !this.player.flipX;
    const lx = facingRight ? 22 : -22;
    this.tweens.add({ targets: this.player, x: this.player.x + lx, duration: 80, yoyo: true, ease: 'Power2.easeOut' });

    const baseDmg = this.playerDamage + this.equipBonusDamage;
    const dmgMul = this.activePowerUps.has('damage') ? 2 : 1;
    const finalDmg = baseDmg * dmgMul;

    let element = this.playerElement;
    if (this.activePowerUps.has('freeze')) element = 'ice';

    // Rogue attacks twice (fast dual-wield)
    const hitCount = this.playerClass === 'rogue' ? 2 : (this.activePowerUps.has('multiShot') ? 3 : 1);
    const angleSpread = hitCount > 1 ? Math.PI / 8 : 0;

    for (let i = 0; i < hitCount; i++) {
      const a = (i - Math.floor(hitCount / 2)) * angleSpread;
      const ox = Math.cos(a) * 40 * (facingRight ? 1 : -1);
      const oy = Math.sin(a) * 40;

      const hbX = this.player.x + ox + (facingRight ? 35 : -35);
      const hbY = this.player.y + oy;
      const hb = this.attackHitbox.create(hbX, hbY, undefined) as Phaser.Physics.Arcade.Sprite;
      hb.setCircle(28);  // bigger hitbox radius
      hb.setData('damage', finalDmg);
      hb.setData('element', element);
      hb.setAlpha(0);

      // Visual slash effect
      const fxColor = element === 'fire' ? 0xff4400 : element === 'ice' ? 0x88ccff :
        this.playerClass === 'rogue' ? 0xa855f7 :
        this.playerClass === 'dark-knight' ? 0xef4444 : 0xfacc15;

      // Slash arc
      const arc = this.add.circle(hbX, hbY, 30, fxColor, 0.6).setDepth(99);
      this.tweens.add({ targets: arc, alpha: 0, scale: 1.8, duration: 200, onComplete: () => arc.destroy() });

      // Delayed destroy of hitbox
      const delay = this.playerClass === 'rogue' ? 60 + i * 80 : 100;
      this.time.delayedCall(delay, () => { if (hb.active) hb.destroy(); });
    }

    // Dark Knight fire trail on every attack
    if (this.playerClass === 'dark-knight') {
      const fx = this.add.sprite(this.player.x + (facingRight ? 40 : -40), this.player.y, 'fire-fx')
        .setDisplaySize(60, 60).setDepth(99).setAlpha(0.6);
      fx.play('fire-anim');
      this.time.delayedCall(700, () => fx.destroy());
    }

    // Warrior has a slight forward lunge on attack
    if (this.playerClass === 'warrior') {
      this.player.setVelocity(facingRight ? 150 : -150, 0);
      this.time.delayedCall(100, () => { if (!this.gameOver) this.player.setVelocity(0, 0); });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARROW PROJECTILE (Q)
  // ═══════════════════════════════════════════════════════════════════════════
  private shootArrow() {
    const facingRight = !this.player.flipX;
    const arrow = this.projectiles.create(this.player.x, this.player.y, 'arrow-img') as Phaser.Physics.Arcade.Sprite;
    arrow.setDisplaySize(32, 32).setDepth(12);
    arrow.setData('damage', this.playerDamage + this.equipBonusDamage);
    arrow.setData('element', this.playerElement);

    const speed = 400;
    if (facingRight) {
      arrow.setVelocityX(speed);
    } else {
      arrow.setVelocityX(-speed);
      arrow.setFlipX(true);
    }

    this.time.delayedCall(2000, () => { if (arrow.active) arrow.destroy(); });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASH (SHIFT)
  // ═══════════════════════════════════════════════════════════════════════════
  private dash() {
    const vx = this.player.body!.velocity.x;
    const vy = this.player.body!.velocity.y;
    if (vx === 0 && vy === 0) return;

    const angle = Math.atan2(vy, vx);
    const dashSpeed = this.playerClass === 'rogue' ? 800 : 600;
    const dashDuration = this.playerClass === 'rogue' ? 180 : 200;

    this.invincible = this.playerClass === 'rogue' ? 500 : 350;

    // Rogue shadow step — teleport behind nearest enemy (uses physics so walls block)
    if (this.playerClass === 'rogue') {
      let closest: Phaser.Physics.Arcade.Sprite | null = null;
      let closestDist = 300;
      this.enemies.children.entries.forEach((obj) => {
        const e = obj as Phaser.Physics.Arcade.Sprite;
        if (!e.active) return;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
        if (d < closestDist) { closest = e; closestDist = d; }
      });
      if (closest) {
        // Purple vanish effect at start
        for (let i = 0; i < 8; i++) {
          const sp = this.add.circle(
            this.player.x + Phaser.Math.Between(-25, 25),
            this.player.y + Phaser.Math.Between(-25, 25),
            Phaser.Math.Between(4, 10), 0x6b21a8, 0.8
          ).setDepth(99);
          this.tweens.add({ targets: sp, alpha: 0, scale: 0.1, duration: 350, delay: i * 30, onComplete: () => sp.destroy() });
        }

        // Teleport behind the closest enemy
        const cx = (closest as Phaser.Physics.Arcade.Sprite).x;
        const cy = (closest as Phaser.Physics.Arcade.Sprite).y;
        const awayAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, cx, cy);
        const behindX = cx + Math.cos(awayAngle + Math.PI) * 60;
        const behindY = cy + Math.sin(awayAngle + Math.PI) * 60;
        this.player.setPosition(
          Phaser.Math.Clamp(behindX, 40, 600),
          Phaser.Math.Clamp(behindY, 40, 560)
        );

        // Appear effect
        const flash = this.add.circle(this.player.x, this.player.y, 30, 0xa855f7, 0.6).setDepth(99);
        this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 300, onComplete: () => flash.destroy() });

        // Auto-attack the target
        this.time.delayedCall(50, () => {
          if (closest && closest.active) {
            const dmg = Math.floor((this.playerDamage + this.equipBonusDamage) * 1.5);
            let hp = closest.getData('hp');
            hp -= dmg;
            closest.setData('hp', hp);
            const kind = closest.getData('kind') as EnemyKind;
            closest.play(this.enemyAnim(kind, 'hurt'), true);
            closest.setTint(0xff4444);
            const dt = this.add.text(closest.x, closest.y - 30, `-${dmg}`, {
              fontSize: '22px', color: '#a855f7', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
            }).setOrigin(0.5).setDepth(100);
            this.tweens.add({ targets: dt, y: dt.y - 35, alpha: 0, duration: 700, onComplete: () => dt.destroy() });
            if (hp <= 0) this.handleEnemyDeath(closest);
          }
        });
        return;
      }
    }

    // Normal dash — use physics velocity (walls will block!)
    // Dash trail effects
    const trailColor = this.playerClass === 'dark-knight' ? 0xef4444 : 0x60a5fa;
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 40, () => {
        const t = this.add.circle(this.player.x, this.player.y, 14, trailColor, 0.5 - i * 0.1).setDepth(9);
        this.tweens.add({ targets: t, alpha: 0, scale: 0.3, duration: 300, onComplete: () => t.destroy() });
      });
    }

    // Dark Knight: leave fire on dash path
    if (this.playerClass === 'dark-knight') {
      const fx = this.add.sprite(this.player.x, this.player.y, 'fire-fx').setDisplaySize(60, 60).setDepth(99).setAlpha(0.5);
      fx.play('fire-anim');
      this.time.delayedCall(800, () => fx.destroy());
      // Fire damages enemies that walk over it
      this.enemies.children.entries.forEach((obj) => {
        const e = obj as Phaser.Physics.Arcade.Sprite;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
        if (d < 80) this.applyElement(e, 'fire');
      });
    }

    this.player.setVelocity(
      Math.cos(angle) * dashSpeed,
      Math.sin(angle) * dashSpeed
    );

    // Reset velocity after dash duration
    this.time.delayedCall(dashDuration, () => {
      if (!this.gameOver) {
        this.player.setVelocity(0, 0);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AREA ATTACK (E)
  // ═══════════════════════════════════════════════════════════════════════════
  private areaAttack() {
    const radius = this.playerClass === 'warrior' ? 200 : this.playerClass === 'dark-knight' ? 160 : 140;
    const areaDmg = Math.floor((this.playerDamage + this.equipBonusDamage) * (this.playerClass === 'rogue' ? 2.0 : 1.5));

    // Class-specific visual effects
    if (this.playerClass === 'warrior') {
      // Shield slam — golden shockwave + brief invincibility
      this.invincible = Math.max(this.invincible, 600);
      const ring1 = this.add.circle(this.player.x, this.player.y, 30, 0xfacc15, 0.6).setDepth(99);
      this.tweens.add({ targets: ring1, scale: radius / 30, alpha: 0, duration: 500, onComplete: () => ring1.destroy() });
      const ring2 = this.add.circle(this.player.x, this.player.y, 20, 0xffffff, 0.4).setDepth(99);
      this.tweens.add({ targets: ring2, scale: radius / 20, alpha: 0, duration: 400, delay: 80, onComplete: () => ring2.destroy() });
      // Shield glow on player
      const shield = this.add.circle(this.player.x, this.player.y, 40, 0x22c55e, 0.3).setDepth(99);
      this.tweens.add({ targets: shield, scale: 1.5, alpha: 0, duration: 600, onComplete: () => shield.destroy() });
    } else if (this.playerClass === 'dark-knight') {
      // Fire eruption
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const fx = this.add.sprite(
          this.player.x + Math.cos(a) * 60,
          this.player.y + Math.sin(a) * 60,
          'fire-fx'
        ).setDisplaySize(70, 70).setDepth(99).setAlpha(0.7);
        fx.play('fire-anim');
        this.time.delayedCall(600 + i * 100, () => fx.destroy());
      }
      const ring = this.add.circle(this.player.x, this.player.y, radius, 0xff4400, 0.3).setDepth(99);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 500, onComplete: () => ring.destroy() });
    } else {
      // Rogue — blade flurry, many small slashes
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        const slash = this.add.circle(
          this.player.x + Math.cos(a) * Phaser.Math.Between(30, 80),
          this.player.y + Math.sin(a) * Phaser.Math.Between(30, 80),
          8, 0xa855f7, 0.7
        ).setDepth(99);
        this.tweens.add({ targets: slash, alpha: 0, scale: 2.5, duration: 250, delay: i * 30, onComplete: () => slash.destroy() });
      }
      const ring = this.add.circle(this.player.x, this.player.y, radius, 0xa855f7, 0.2).setDepth(99);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 400, onComplete: () => ring.destroy() });
    }

    this.cameras.main.shake(200, 0.025);
    this.player.play(this.playerAnim('attack'), true);

    this.enemies.children.entries.forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist <= radius) {
        let hp = enemy.getData('hp');
        hp -= areaDmg;
        enemy.setData('hp', hp);

        this.applyElement(enemy, this.playerElement);

        // Strong knockback
        const kbAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        const kbForce = this.playerClass === 'warrior' ? 500 : 350;
        enemy.setVelocity(Math.cos(kbAngle) * kbForce, Math.sin(kbAngle) * kbForce);

        const kind = enemy.getData('kind') as EnemyKind;
        enemy.play(this.enemyAnim(kind, 'hurt'), true);

        const dt = this.add.text(enemy.x, enemy.y - 30, `-${areaDmg}`, {
          fontSize: '22px', color: '#ff4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({ targets: dt, y: enemy.y - 60, alpha: 0, duration: 800, onComplete: () => dt.destroy() });

        if (hp <= 0) this.handleEnemyDeath(enemy);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HIT HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════
  private handleAttackHit(hitbox: any, enemy: any) {
    const damage = hitbox.getData('damage');
    const element = hitbox.getData('element') as ElementType;
    let hp = enemy.getData('hp');
    const kind = enemy.getData('kind') as EnemyKind;
    hp -= damage;
    enemy.setData('hp', hp);

    if (element !== 'none') this.applyElement(enemy, element);

    // Life steal
    if (this.activePowerUps.has('lifeSteal')) {
      const heal = Math.floor(damage * 0.4);
      this.playerHP = Math.min(this.playerHP + heal, this.maxHP + this.equipBonusHP);
      const ht = this.add.text(this.player.x, this.player.y - 30, `+${heal}`, {
        fontSize: '14px', color: '#22c55e', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ht, y: ht.y - 25, alpha: 0, duration: 500, onComplete: () => ht.destroy() });
    }

    hitbox.destroy();

    // Hit pause
    this.physics.pause();
    this.time.delayedCall(25, () => this.physics.resume());

    this.cameras.main.shake(80, 0.008);

    enemy.play(this.enemyAnim(kind, 'hurt'), true);
    enemy.setTint(0xff4444);

    const flash = this.add.circle(enemy.x, enemy.y, 40, 0xffffff, 0.6).setDepth(99);
    this.tweens.add({ targets: flash, scale: 2, alpha: 0, duration: 180, onComplete: () => flash.destroy() });

    const kbAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
    this.tweens.add({
      targets: enemy,
      x: enemy.x + Math.cos(kbAngle) * 25,
      y: enemy.y + Math.sin(kbAngle) * 25,
      duration: 120, ease: 'Power2',
      onComplete: () => { const bt = enemy.getData('baseTint') || 0xffffff; enemy.setTint(bt); }
    });

    const dt = this.add.text(enemy.x, enemy.y - 30, `-${damage}`, {
      fontSize: '22px', color: '#ff4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: dt, y: enemy.y - 60, alpha: 0, duration: 700, ease: 'Power2', onComplete: () => dt.destroy() });

    for (let i = 0; i < 5; i++) {
      const p = this.add.circle(enemy.x + Phaser.Math.Between(-10, 10), enemy.y + Phaser.Math.Between(-10, 10), Phaser.Math.Between(2, 5), 0xff4444);
      p.setDepth(99);
      this.tweens.add({
        targets: p,
        x: enemy.x + Phaser.Math.Between(-30, 30),
        y: enemy.y + Phaser.Math.Between(-30, 30),
        alpha: 0, duration: 400, onComplete: () => p.destroy()
      });
    }

    if (hp <= 0) this.handleEnemyDeath(enemy);
  }

  private handleProjectileHit(proj: any, enemy: any) {
    const damage = proj.getData('damage');
    const element = proj.getData('element') as ElementType;
    let hp = enemy.getData('hp');
    const kind = enemy.getData('kind') as EnemyKind;
    hp -= damage;
    enemy.setData('hp', hp);

    if (element !== 'none') this.applyElement(enemy, element);
    proj.destroy();

    enemy.play(this.enemyAnim(kind, 'hurt'), true);
    const flash = this.add.circle(enemy.x, enemy.y, 30, 0xffaa00, 0.5).setDepth(99);
    this.tweens.add({ targets: flash, scale: 1.8, alpha: 0, duration: 200, onComplete: () => flash.destroy() });

    const dt = this.add.text(enemy.x, enemy.y - 25, `-${damage}`, {
      fontSize: '16px', color: '#ffaa00', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({ targets: dt, y: enemy.y - 50, alpha: 0, duration: 700, onComplete: () => dt.destroy() });

    if (hp <= 0) this.handleEnemyDeath(enemy);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENEMY DEATH
  // ═══════════════════════════════════════════════════════════════════════════
  private handleEnemyDeath(enemy: Phaser.Physics.Arcade.Sprite) {
    const kind = enemy.getData('kind') as EnemyKind;

    // Combo
    const now = Date.now();
    if (now - this.lastKillTime < 3000) { this.comboCount++; } else { this.comboCount = 1; }
    this.lastKillTime = now;
    this.comboTimer = 3000;

    const comboBonus = Math.min(this.comboCount, 5);
    this.score += 100 * this.currentWave * comboBonus;

    this.burnEffects.delete(enemy);
    this.freezeEffects.delete(enemy);

    // Drops
    if (Math.random() < 0.15) this.dropHealth(enemy.x, enemy.y);
    if (Math.random() < 0.10) this.spawnPowerUp(enemy.x, enemy.y);
    if (Math.random() < 0.08) this.spawnChest(enemy.x, enemy.y);

    // Death animation
    enemy.play(this.enemyAnim(kind, 'death'));
    enemy.setTint(0xff3333);
    enemy.setData('speed', 0);
    enemy.setVelocity(0, 0);

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      duration: 600,
      delay: 400,
      onComplete: () => {
        const bg = enemy.getData('healthBarBg');
        const hb = enemy.getData('healthBar');
        if (bg) bg.destroy();
        if (hb) hb.destroy();

        const color = kind === 'vampire' ? 0x880044 : kind === 'skeleton' ? 0xcccccc : 0xff3333;
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const p = this.add.circle(enemy.x, enemy.y, 4, color, 0.8).setDepth(99);
          this.tweens.add({
            targets: p,
            x: enemy.x + Math.cos(angle) * 50,
            y: enemy.y + Math.sin(angle) * 50,
            alpha: 0, scale: 0.3, duration: 400, ease: 'Power2',
            onComplete: () => p.destroy()
          });
        }
        enemy.destroy();
      }
    });

    this.checkAchievements();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DROPS
  // ═══════════════════════════════════════════════════════════════════════════
  private dropHealth(x: number, y: number) {
    const hp = this.add.circle(x, y, 10, 0x22c55e).setDepth(15);
    const cross = this.add.text(x, y, '+', { fontSize: '14px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5).setDepth(16);

    this.tweens.add({ targets: [hp, cross], y: y - 8, yoyo: true, duration: 600, repeat: 5 });

    this.time.addEvent({
      delay: 100, repeat: 30,
      callback: () => {
        if (!hp.active) return;
        const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, hp.x, hp.y);
        if (d < 30) {
          this.playerHP = Math.min(this.playerHP + 25, this.maxHP + this.equipBonusHP);
          const ht = this.add.text(this.player.x, this.player.y - 20, '+25 HP', {
            fontSize: '16px', color: '#22c55e', stroke: '#000', strokeThickness: 3
          }).setOrigin(0.5);
          this.tweens.add({ targets: ht, y: this.player.y - 50, alpha: 0, duration: 800, onComplete: () => ht.destroy() });
          hp.destroy();
          cross.destroy();
        }
      }
    });

    this.time.delayedCall(4000, () => {
      if (hp.active) { hp.destroy(); cross.destroy(); }
    });
  }

  private spawnChest(x: number, y: number) {
    const chest = this.chests.create(x, y, 'chest') as Phaser.Physics.Arcade.Sprite;
    chest.setDisplaySize(48, 48).setDepth(15);
    chest.play('chest-closed');
    chest.setData('opened', false);

    this.tweens.add({ targets: chest, y: y - 6, yoyo: true, duration: 800, repeat: -1, ease: 'Sine.easeInOut' });

    this.time.delayedCall(20000, () => {
      if (chest.active) {
        this.tweens.add({ targets: chest, alpha: 0, duration: 500, onComplete: () => chest.destroy() });
      }
    });
  }

  private checkChestPickups() {
    this.chests.children.entries.forEach((obj) => {
      const chest = obj as Phaser.Physics.Arcade.Sprite;
      if (!chest.active || chest.getData('opened')) return;

      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, chest.x, chest.y);
      if (dist < 40) {
        chest.setData('opened', true);
        chest.play('chest-open');

        const roll = Math.random() * 100;
        const rarity = roll < 10 ? 'epic' : roll < 40 ? 'rare' : 'common';

        const pool = EQUIPMENT_POOL.filter(e => e.rarity === rarity);
        const item = pool[Math.floor(Math.random() * pool.length)];
        if (!item) return;

        const old = this.equipment.get(item.slot);
        this.equipment.set(item.slot, item);
        this.recalcEquipBonuses();

        const rarityColors: Record<string, string> = { common: '#aaaaaa', rare: '#60a5fa', epic: '#f59e0b' };
        const label = `${item.rarity === 'epic' ? '✨ ' : ''}${item.name}${old ? ` (replaced ${old.name})` : ''}`;
        const notif = this.add.text(this.player.x, this.player.y - 50, label, {
          fontSize: '16px', color: rarityColors[item.rarity]!, fontStyle: 'bold', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(1005);
        this.tweens.add({ targets: notif, y: notif.y - 40, alpha: 0, duration: 2000, onComplete: () => notif.destroy() });

        this.time.delayedCall(800, () => {
          this.tweens.add({ targets: chest, alpha: 0, duration: 300, onComplete: () => chest.destroy() });
        });
      }
    });
  }

  private recalcEquipBonuses() {
    this.equipBonusDamage = 0;
    this.equipBonusHP = 0;
    this.equipBonusSpeed = 0;
    this.equipment.forEach((item) => {
      switch (item.stat) {
        case 'damage': this.equipBonusDamage += item.value; break;
        case 'maxHP':  this.equipBonusHP += item.value; break;
        case 'speed':  this.equipBonusSpeed += item.value; break;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POWER-UPS
  // ═══════════════════════════════════════════════════════════════════════════
  private spawnPowerUp(x: number, y: number) {
    const types = [
      { type: 'speed',       color: 0x06b6d4, duration: 8000 },
      { type: 'shield',      color: 0x8b5cf6, duration: 6000 },
      { type: 'damage',      color: 0xef4444, duration: 10000 },
      { type: 'attackSpeed', color: 0xf59e0b, duration: 8000 },
      { type: 'lifeSteal',   color: 0xec4899, duration: 10000 },
      { type: 'multiShot',   color: 0x14b8a6, duration: 7000 },
      { type: 'magnet',      color: 0x84cc16, duration: 12000 },
      { type: 'freeze',      color: 0x60a5fa, duration: 5000 },
    ];
    const weights = [25, 15, 20, 18, 10, 8, 12, 12];
    let r = Math.random() * 120;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i]!;
      if (r <= 0) { idx = i; break; }
    }
    const pu = types[idx]!;

    const pickup = this.powerUpPickups.create(x, y, undefined);
    const vis = this.add.star(0, 0, 6, 7, 13, pu.color).setStrokeStyle(2, 0xffffff);
    pickup.setData('visual', vis);
    pickup.setData('type', pu.type);
    pickup.setData('duration', pu.duration);

    this.tweens.add({ targets: vis, angle: 360, duration: 2000, repeat: -1 });
    this.tweens.add({ targets: pickup, y: y - 12, yoyo: true, duration: 800, repeat: -1, ease: 'Sine.easeInOut' });

    this.time.delayedCall(15000, () => {
      if (pickup.active) {
        this.tweens.add({ targets: [pickup, vis], alpha: 0, duration: 500, onComplete: () => { vis.destroy(); pickup.destroy(); } });
      }
    });
  }

  private checkPowerUpPickups() {
    this.powerUpPickups.children.entries.forEach((pickup: any) => {
      if (!pickup.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.x, pickup.y);
      const range = this.activePowerUps.has('magnet') ? 150 : 50;
      if (d < range) {
        this.physics.moveToObject(pickup, this.player, 200);
        if (d < 30) {
          this.collectPowerUp(pickup.getData('type'), pickup.getData('duration'));
          const vis = pickup.getData('visual');
          if (vis) vis.destroy();
          pickup.destroy();
        }
      }
    });
  }

  private collectPowerUp(type: string, duration: number) {
    this.activePowerUps.set(type, duration);

    const notif = this.add.text(this.player.x, this.player.y - 40, type.toUpperCase(), {
      fontSize: '18px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({ targets: notif, y: notif.y - 40, alpha: 0, duration: 1200, onComplete: () => notif.destroy() });

    if (type === 'freeze') {
      this.enemies.children.entries.forEach((obj) => {
        const e = obj as Phaser.Physics.Arcade.Sprite;
        this.applyElement(e, 'ice');
      });
    }
  }

  private updatePowerUps(delta: number) {
    const expired: string[] = [];
    this.activePowerUps.forEach((t, type) => {
      const nt = t - delta;
      if (nt <= 0) expired.push(type);
      else this.activePowerUps.set(type, nt);
    });
    expired.forEach(t => this.activePowerUps.delete(t));

    this.powerUpPickups.children.entries.forEach((p: any) => {
      const vis = p.getData('visual');
      if (vis) { vis.x = p.x; vis.y = p.y; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE HUD
  // ═══════════════════════════════════════════════════════════════════════════
  private updateHUD() {
    const effectiveMaxHP = this.maxHP + this.equipBonusHP;
    const displayHP = Math.max(0, Math.floor(this.playerHP));

    const hpBar = this.player.getData('hpBar') as Phaser.GameObjects.Rectangle;
    if (hpBar) {
      const pct = Math.max(0, this.playerHP / effectiveMaxHP);
      hpBar.width = 160 * pct;
      hpBar.setFillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444);
    }

    this.hpText.setText(`${displayHP}/${effectiveMaxHP}`);
    this.hpText.setColor(displayHP === 0 ? '#ff0000' : displayHP < 30 ? '#ef4444' : '#ffffff');

    this.scoreText.setText(`⭐ ${this.score}`);
    this.waveText.setText(`Wave ${this.currentWave}  [${this.enemies.countActive()} foes]`);

    if (this.comboCount > 1) {
      this.comboText.setText(`${this.comboCount}x COMBO!`).setAlpha(1);
    } else {
      this.comboText.setAlpha(0);
    }

    // Ability cooldown indicators
    const dashReady = this.dashCooldown <= 0;
    const areaReady = this.areaCooldown <= 0;
    const dashStr = dashReady ? '🟢 Dash[SHIFT]' : `🔴 Dash ${(this.dashCooldown / 1000).toFixed(1)}s`;
    const abilityName = this.playerClass === 'warrior' ? 'Shield[E]' : this.playerClass === 'rogue' ? 'Flurry[E]' : 'Flame[E]';
    const areaStr = areaReady ? `🟢 ${abilityName}` : `🔴 ${abilityName} ${(this.areaCooldown / 1000).toFixed(1)}s`;
    const classLabel = this.playerClass === 'warrior' ? '⚔️ Warrior' : this.playerClass === 'rogue' ? '🗡️ Rogue' : '🔥 Dark Knight';
    this.classText.setText(`${classLabel}  |  ${dashStr}  |  ${areaStr}`);

    const abilInfo: string[] = [];
    this.activePowerUps.forEach((time, type) => {
      const icons: Record<string, string> = { speed: '⚡', shield: '🛡️', damage: '💥', attackSpeed: '⚔️', lifeSteal: '💚', multiShot: '🎯', magnet: '🧲', freeze: '❄️' };
      abilInfo.push(`${icons[type] || '✨'} ${(time / 1000).toFixed(0)}s`);
    });
    this.abilitiesText.setText(abilInfo.join('  '));

    const equipLines: string[] = [];
    this.equipment.forEach((item) => {
      const ri: Record<string, string> = { common: '⬜', rare: '🔷', epic: '🔶' };
      equipLines.push(`${ri[item.rarity]} ${item.name}`);
    });
    this.equipText.setText(equipLines.join(' | '));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COLLISION / DEATH / VICTORY
  // ═══════════════════════════════════════════════════════════════════════════
  private handlePlayerEnemyCollision(player: any, enemy: any) {
    if (!player || !enemy) return;
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
    // Push player away from enemy to prevent overlap
    this.player.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
    // Also push enemy slightly back
    enemy.setVelocity(Math.cos(angle + Math.PI) * 80, Math.sin(angle + Math.PI) * 80);
  }

  private handleDeath() {
    this.gameOver = true;
    this._won = false;
    this.player.play(this.playerAnim('death'), true);
    this.player.setVelocity(0, 0);

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.add.rectangle(0, 0, 640, 640, 0x000000, 0.6).setOrigin(0, 0).setDepth(2000).setScrollFactor(0);

    this._gameOverText = this.add.text(cx, cy - 60, '💀 GAME OVER', {
      fontSize: '44px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    this.add.text(cx, cy, `Score: ${this.score}  |  Wave: ${this.currentWave}`, {
      fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    const equipNames = Array.from(this.equipment.values()).map(e => e.name);
    if (equipNames.length > 0) {
      this.add.text(cx, cy + 35, `Equipment: ${equipNames.join(', ')}`, {
        fontSize: '14px', color: '#fbbf24', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
    }

    this.add.text(cx, cy + 65, 'Press R to restart', {
      fontSize: '16px', color: '#aaa'
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    if (this.onGameOverCallback) {
      this.onGameOverCallback(this.score, Math.floor(this.player.x / 64), Math.floor(this.player.y / 64));
    }
  }

  private handleVictory() {
    this.gameOver = true;
    this._won = true;

    this._gameOverText = this.add.text(320, 270, '🏆 YOU WIN!', {
      fontSize: '48px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    this.add.text(320, 320, `Final Score: ${this.score}`, {
      fontSize: '22px', color: '#fff', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    this.add.text(320, 360, 'Press R to restart', {
      fontSize: '16px', color: '#aaa'
    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);

    if (this.onVictoryCallback) this.onVictoryCallback(this.score);
  }

  private applyModifier() {
    switch (this.modifierType) {
      case 'Speed Boost':   this.playerSpeed += 80; break;
      case 'Double Damage': this.playerDamage *= 2; break;
      case 'Tank Mode':     this.maxHP *= 2; this.playerHP = this.maxHP; this.playerSpeed -= 50; break;
      case 'Glass Cannon':  this.maxHP = Math.floor(this.maxHP * 0.5); this.playerHP = this.maxHP; this.playerDamage *= 3; break;
      case 'Regeneration':  break;
    }
  }

  private checkAchievements() {
    const list: { title: string; desc: string }[] = [];

    if (this.currentWave === 5 && !this.achievements.has('w5'))   { this.achievements.add('w5');   list.push({ title: '🗡️ Survivor',     desc: 'Wave 5' }); }
    if (this.currentWave === 10 && !this.achievements.has('w10')) { this.achievements.add('w10');  list.push({ title: '⚔️ Veteran',      desc: 'Wave 10' }); }
    if (this.currentWave === 20 && !this.achievements.has('w20')) { this.achievements.add('w20');  list.push({ title: '🏆 Champion',     desc: 'Wave 20' }); }
    if (this.comboCount >= 5 && !this.achievements.has('c5'))     { this.achievements.add('c5');   list.push({ title: '🔥 Combo Master', desc: '5x Combo' }); }
    if (this.score >= 10000 && !this.achievements.has('s10k'))    { this.achievements.add('s10k'); list.push({ title: '⭐ High Scorer',  desc: '10k Points' }); }

    list.forEach((a, i) => {
      const at = this.add.text(320, 100 + i * 50, `${a.title} — ${a.desc}`, {
        fontSize: '22px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 3, align: 'center'
      }).setOrigin(0.5).setDepth(1005);
      this.tweens.add({ targets: at, alpha: 0, y: at.y - 40, duration: 3000, delay: 800, ease: 'Power2', onComplete: () => at.destroy() });
    });
  }

  private async fetchGhosts() {
    try {
      const res = await fetch('/api/ghosts');
      if (!res.ok) return;
      const data = await res.json();
      data.ghosts?.forEach((g: any) => {
        const gs = this.add.circle(g.x * 64 + 32, g.y * 64 + 32, 10, 0xc4b5fd, 0.35);
        gs.setDepth(3);
        this.ghosts.add(gs);
        this.tweens.add({ targets: gs, y: gs.y - 8, yoyo: true, duration: 2000, repeat: -1, ease: 'Sine.easeInOut' });
      });
    } catch (err) {
      console.error('Failed to fetch ghosts:', err);
    }
  }
}
