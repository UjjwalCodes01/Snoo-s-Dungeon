import Phaser from 'phaser';
import { Howl } from 'howler';

// ─── Types ───────────────────────────────────────────────────────────────────
type PlayerClass = 'warrior' | 'rogue' | 'dark-knight';
type EnemyKind = 'orc' | 'skeleton' | 'vampire';
type BossKind = 'pink' | 'owlet' | 'dude';
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
    hp: 220, damage: 22, speed: 175, attackRate: 300,
    dashCooldown: 2500, areaCooldown: 4000,
    ability: 'Shield Slam – Wide knockback + heal + invincibility', element: 'none',
  },
  rogue: {
    hp: 110, damage: 16, speed: 290, attackRate: 250,
    dashCooldown: 1200, areaCooldown: 3500,
    ability: 'Shadow Step – Teleport behind enemy + crit', element: 'none',
  },
  'dark-knight': {
    hp: 150, damage: 22, speed: 210, attackRate: 300,
    dashCooldown: 1800, areaCooldown: 3500,
    ability: 'Dark Flame – Fire ring + burn DoT + lifesteal', element: 'fire',
  },
};

// ─── Enemy Templates ─────────────────────────────────────────────────────────
const ENEMY_TEMPLATES: Record<EnemyKind, { hp: number; damage: number; speed: number; attackRange: number }> = {
  orc:      { hp: 45, damage: 10, speed: 100, attackRange: 200 },   // tank: high HP, slow
  skeleton: { hp: 35, damage: 20, speed: 180, attackRange: 180 },   // glass cannon: fast, hits hard, still fragile
  vampire:  { hp: 55, damage: 12, speed: 150, attackRange: 220 },   // sustain: lifesteal, threatening
};

// ─── Boss Templates ──────────────────────────────────────────────────────────
interface BossTemplate {
  name: string;
  title: string;
  emoji: string;
  hp: number;
  damage: number;
  speed: number;
  color: number;
  barColor: number;
}

const BOSS_TEMPLATES: Record<BossKind, BossTemplate> = {
  pink: {
    name: 'Pink Monster', title: 'THE BERSERKER', emoji: '🩷',
    hp: 600, damage: 25, speed: 180, color: 0xff69b4, barColor: 0xff1493,
  },
  owlet: {
    name: 'Owlet Monster', title: 'THE ARCHMAGE', emoji: '🦉',
    hp: 700, damage: 20, speed: 140, color: 0x60a5fa, barColor: 0x3b82f6,
  },
  dude: {
    name: 'Dude Monster', title: 'THE TITAN', emoji: '💪',
    hp: 800, damage: 40, speed: 90, color: 0xf59e0b, barColor: 0xd97706,
  },
};

// Boss schedule: which boss appears at which wave
const BOSS_WAVE_SCHEDULE: Record<number, { kind: BossKind; enraged: boolean }> = {
  3: { kind: 'pink', enraged: false },
  6: { kind: 'owlet', enraged: false },
  9: { kind: 'dude', enraged: false },
  12: { kind: 'pink', enraged: true },
  15: { kind: 'owlet', enraged: true },
  18: { kind: 'dude', enraged: true },
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
  private tileGrid: string[] = [];  // cached parsed tile grid for fast wall checks

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
  private reachableFloorTiles: { x: number; y: number }[] = [];
  private bossArenaCenter: { x: number; y: number } | null = null;
  private isBossWave = false;
  private bossSpawned = false;
  private achievements: Set<string> = new Set();
  private totalKills = 0;
  private waveStartHP = 0;
  private waveStartTime = 0;
  private bossesKilled = 0;

  // ── Boss system ──
  private activeBoss: Phaser.Physics.Arcade.Sprite | null = null;
  private bossHPBarBg?: Phaser.GameObjects.Rectangle;
  private bossHPBarFill?: Phaser.GameObjects.Rectangle;
  private bossNameText?: Phaser.GameObjects.Text;
  private bossPhaseText?: Phaser.GameObjects.Text;
  private bossBarContainer: Phaser.GameObjects.GameObject[] = [];
  private bossPhase = 1;
  private bossAbilityTimer = 0;
  private bossKind: BossKind = 'pink';
  private vignetteOverlay?: Phaser.GameObjects.Rectangle;

  // ── Pause ──
  private isPaused = false;
  private pauseOverlay: Phaser.GameObjects.GameObject[] = [];
  private escKey!: Phaser.Input.Keyboard.Key;
  private pKey!: Phaser.Input.Keyboard.Key;

  // ── Teleport ──
  private teleportTiles: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }[] = [];
  private teleportCooldown = 0;

  // ── Power-up Icon Display ──
  private powerUpIconSprites: Phaser.GameObjects.GameObject[] = [];
  // ── Mobile touch ──
  private isMobile = false;
  private touchJoystick?: { 
    base: Phaser.GameObjects.Arc; 
    thumb: Phaser.GameObjects.Arc; 
    ring: Phaser.GameObjects.Arc;
    pointerId: number; 
    baseX: number; 
    baseY: number;
    radius: number;
    active: boolean;
    dx: number;
    dy: number;
    magnitude: number;
  };
  private touchButtons: Map<string, { 
    circle: Phaser.GameObjects.Arc; 
    label: Phaser.GameObjects.Text; 
    cooldownArc?: Phaser.GameObjects.Graphics;
    pressed: boolean;
    held: boolean;
    pointerId: number;
  }> = new Map();
  private autoAttackEnabled = false;
  private autoAttackBtn?: Phaser.GameObjects.Container;

  // ── Sound ──
  private sfx: Record<string, Howl> = {};
  private bgMusic?: Howl;
  private soundEnabled = true;
  private soundToggleBtn?: Phaser.GameObjects.Text;

  // ── Movement tracking ──
  private lastAimAngle = 0; // Last direction the player moved in (radians)
  private badgeQueue: { title: string; desc: string }[] = [];
  private badgeShowing = false;

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
    this.reachableFloorTiles = [];
    this.bossArenaCenter = null;
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
    this.totalKills = 0;
    this.waveStartHP = 0;
    this.waveStartTime = 0;
    this.bossesKilled = 0;
    this.badgeQueue = [];
    this.badgeShowing = false;
    this.achievements = new Set();

    // Boss/pause/teleport reset
    this.activeBoss = null;
    this.bossPhase = 1;
    this.bossAbilityTimer = 0;
    this.isPaused = false;
    this.pauseOverlay = [];
    this.teleportTiles = [];
    this.teleportCooldown = 0;
    this.bossBarContainer = [];

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

    // ── Boss Monsters (32×32 per frame) ──
    const monsterAnims = ['Idle_4', 'Walk_6', 'Run_6', 'Attack1_4', 'Attack2_6', 'Walk+Attack_6', 'Throw_4', 'Hurt_4', 'Death_8', 'Jump_8', 'Push_6', 'Climb_4'];
    const bossNames: { key: string; folder: string; prefix: string }[] = [
      { key: 'pink', folder: '1 Pink_Monster', prefix: 'Pink_Monster' },
      { key: 'owlet', folder: '2 Owlet_Monster', prefix: 'Owlet_Monster' },
      { key: 'dude', folder: '3 Dude_Monster', prefix: 'Dude_Monster' },
    ];
    bossNames.forEach(({ key, folder, prefix }) => {
      monsterAnims.forEach(anim => {
        const animName = anim.split('_')[0]!.toLowerCase().replace('+', '_');
        this.load.spritesheet(`boss-${key}-${animName}`, `sprites/${folder}/${prefix}_${anim}.png`, { frameWidth: 32, frameHeight: 32 });
      });
      this.load.image(`boss-${key}-dust`, `sprites/${folder}/Double_Jump_Dust_5.png`);
      this.load.image(`boss-${key}-rock1`, `sprites/${folder}/Rock1.png`);
      this.load.image(`boss-${key}-rock2`, `sprites/${folder}/Rock2.png`);
    });

    // ── Magic Effects (64×64 individual frames) ──
    const effects: { name: string; folder: string; count: number }[] = [
      { name: 'earth-spike', folder: 'Earth_Spike', count: 9 },
      { name: 'explosion', folder: 'Explosion', count: 7 },
      { name: 'fire-ball', folder: 'Fire_Ball', count: 10 },
      { name: 'molten-spear', folder: 'Molten_Spear', count: 12 },
      { name: 'portal-fx', folder: 'Portal', count: 10 },
      { name: 'rocks-fx', folder: 'Rocks', count: 10 },
      { name: 'tornado-fx', folder: 'Tornado', count: 9 },
      { name: 'water-fx', folder: 'Water', count: 10 },
      { name: 'water-geyser', folder: 'Water_Geyser', count: 13 },
      { name: 'wind-fx', folder: 'Wind', count: 10 },
    ];
    effects.forEach(({ name, folder, count }) => {
      for (let i = 1; i <= count; i++) {
        const num = String(i).padStart(3, '0');
        this.load.image(`${name}-${i}`, `sprites/Foozle_2DE0001_Pixel_Magic_Effects/${folder}/${num}.png`);
      }
    });

    // ── Magic Icons (32×32) ──
    for (let i = 0; i <= 9; i++) {
      this.load.image(`magic-icon-${i}`, `sprites/Foozle_2DE0001_Pixel_Magic_Effects/Icons/tile00${i}.png`);
    }

    // ── Portal tile ──
    this.load.spritesheet('portal-tile', 'sprites/Ship_portal_32x32.png', { frameWidth: 32, frameHeight: 32 });

    // ── UI Artwork ──
    this.load.image('ui-bg', 'sprites/Artwork/Gray/square/background.png');
    this.load.image('ui-border', 'sprites/Artwork/Gray/square/border.png');
    this.load.image('ui-slot', 'sprites/Artwork/Gray/square/slot.png');
    this.load.image('ui-btn1', 'sprites/Artwork/Gray/square/Buttons/button_1.png');
    this.load.image('ui-btn2', 'sprites/Artwork/Gray/square/Buttons/button_2.png');
    this.load.image('ui-bar-h', 'sprites/Artwork/half_Customizible/square/bar_horizontal.png');
    this.load.image('ui-icons', 'sprites/Artwork/Gray/icons/icons.png');

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

    // ── Boss Monster Animations (32×32 frames) ──
    const bossAnimDefs: { suffix: string; frames: number; rate: number; loop: boolean }[] = [
      { suffix: 'idle',      frames: 4,  rate: 6,  loop: true },
      { suffix: 'walk',      frames: 6,  rate: 10, loop: true },
      { suffix: 'run',       frames: 6,  rate: 12, loop: true },
      { suffix: 'attack1',   frames: 4,  rate: 10, loop: false },
      { suffix: 'attack2',   frames: 6,  rate: 12, loop: false },
      { suffix: 'walk_attack', frames: 6, rate: 12, loop: true },
      { suffix: 'throw',     frames: 4,  rate: 10, loop: false },
      { suffix: 'hurt',      frames: 4,  rate: 10, loop: false },
      { suffix: 'death',     frames: 8,  rate: 8,  loop: false },
      { suffix: 'jump',      frames: 8,  rate: 10, loop: false },
      { suffix: 'push',      frames: 6,  rate: 10, loop: false },
      { suffix: 'climb',     frames: 4,  rate: 8,  loop: true },
    ];
    ['pink', 'owlet', 'dude'].forEach(boss => {
      bossAnimDefs.forEach(({ suffix, frames, rate, loop }) => {
        const key = `boss-${boss}-${suffix}-anim`;
        if (!this.anims.exists(key) && this.textures.exists(`boss-${boss}-${suffix}`)) {
          this.anims.create({
            key,
            frames: this.anims.generateFrameNumbers(`boss-${boss}-${suffix}`, { start: 0, end: frames - 1 }),
            frameRate: rate,
            repeat: loop ? -1 : 0,
          });
        }
      });
    });

    // ── Magic Effect Animations (built from individual frame images) ──
    const effectAnimDefs: { name: string; count: number; rate: number; loop: boolean }[] = [
      { name: 'earth-spike', count: 9, rate: 14, loop: false },
      { name: 'explosion', count: 7, rate: 12, loop: false },
      { name: 'fire-ball', count: 10, rate: 14, loop: true },
      { name: 'molten-spear', count: 12, rate: 14, loop: false },
      { name: 'portal-fx', count: 10, rate: 10, loop: true },
      { name: 'rocks-fx', count: 10, rate: 12, loop: false },
      { name: 'tornado-fx', count: 9, rate: 10, loop: true },
      { name: 'water-fx', count: 10, rate: 10, loop: false },
      { name: 'water-geyser', count: 13, rate: 14, loop: false },
      { name: 'wind-fx', count: 10, rate: 14, loop: false },
    ];
    effectAnimDefs.forEach(({ name, count, rate, loop }) => {
      const key = `${name}-anim`;
      if (!this.anims.exists(key)) {
        const frames: { key: string }[] = [];
        for (let i = 1; i <= count; i++) {
          frames.push({ key: `${name}-${i}` });
        }
        this.anims.create({ key, frames, frameRate: rate, repeat: loop ? -1 : 0 });
      }
    });

    // ── Portal tile animation ──
    if (this.textures.exists('portal-tile') && !this.anims.exists('portal-tile-anim')) {
      this.anims.create({
        key: 'portal-tile-anim',
        frames: this.anims.generateFrameNumbers('portal-tile', { start: 0, end: 7 }),
        frameRate: 8, repeat: -1,
      });
    }
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

  private enemyAnim(kind: EnemyKind | BossKind, action: string): string {
    // Boss animations use 'boss-{kind}-{action}-anim' naming
    if (kind === 'pink' || kind === 'owlet' || kind === 'dude') {
      return `boss-${kind}-${action}-anim`;
    }
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

    // FIX: Set physics world bounds so enemies can't leave the map
    this.physics.world.setBounds(0, 0, 640, 640);

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
    this.escKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.pKey     = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    // Mobile detection & touch controls
    this.isMobile = !this.sys.game.device.os.desktop;
    if (this.isMobile) this.createTouchControls();

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

    // Mobile: zoom in for better visibility
    if (this.isMobile) {
      this.cameras.main.setZoom(1.25);
    }

    // Vignette overlay for boss/low-HP effects
    this.vignetteOverlay = this.add.rectangle(320, 320, 640, 640, 0x000000, 0)
      .setDepth(998).setScrollFactor(0);

    this.waveStartHP = this.playerHP;
    this.waveStartTime = Date.now();
    this.initializeSounds();
    this.fetchGhosts();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD HUD
  // ═══════════════════════════════════════════════════════════════════════════
  private buildHUD() {
    const mob = this.isMobile;
    const hudY = mob ? 555 : 565;
    const hudH = mob ? 85 : 75;

    // HUD background — use Artwork background if available
    if (this.textures.exists('ui-bg')) {
      this.add.image(320, hudY + hudH / 2, 'ui-bg').setDisplaySize(640, hudH).setDepth(999).setScrollFactor(0).setAlpha(0.92);
    } else {
      this.add.rectangle(0, hudY, 640, hudH, 0x0f0f1e, 0.92).setOrigin(0, 0).setDepth(999).setScrollFactor(0);
    }

    // Top accent bar with class color
    const classColors: Record<PlayerClass, number> = { warrior: 0x22c55e, rogue: 0xa855f7, 'dark-knight': 0xef4444 };
    this.add.rectangle(0, hudY, 640, 2, classColors[this.playerClass], 0.9).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);

    // HP bar background
    this.add.rectangle(12, hudY + 10, 160, 16, 0x333333).setOrigin(0, 0).setDepth(1000).setScrollFactor(0);

    // HP bar fill
    const hpBar = this.add.rectangle(12, hudY + 10, 160, 16, 0x22c55e).setOrigin(0, 0).setDepth(1001).setScrollFactor(0);
    this.player.setData('hpBar', hpBar);

    // HP bar frame overlay (Artwork)
    if (this.textures.exists('ui-bar-h')) {
      this.add.image(92, hudY + 18, 'ui-bar-h').setDisplaySize(168, 22).setDepth(1002).setScrollFactor(0).setAlpha(0.9);
    }

    this.hpText = this.add.text(92, hudY + 18, '', {
      fontSize: mob ? '14px' : '12px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: mob ? 4 : 3
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);

    // Class label
    const classIcons: Record<PlayerClass, string> = { warrior: '⚔️', rogue: '🗡️', 'dark-knight': '🔥' };
    this.classText = this.add.text(12, hudY + 30, `${classIcons[this.playerClass]} ${this.playerClass.toUpperCase()}`, {
      fontSize: mob ? '12px' : '11px', color: '#ccc', fontStyle: 'bold', stroke: '#000', strokeThickness: mob ? 3 : 2
    }).setOrigin(0, 0).setDepth(1003).setScrollFactor(0);

    // Controls bar — different text for mobile vs desktop
    const controlsY = hudY + 48;
    const controlsStr = mob
      ? '🕹️ Joystick = Move  |  Hold ⚔️ = Attack  |  AA = Auto-Attack'
      : 'WASD Move  |  SPACE Attack  |  SHIFT Dash  |  E Area  |  Q Arrow  |  R Restart';
    this.add.text(12, controlsY, controlsStr, {
      fontSize: mob ? '8px' : '9px', color: '#777', stroke: '#000', strokeThickness: 1
    }).setOrigin(0, 0).setDepth(1003).setScrollFactor(0);

    // Score
    this.scoreText = this.add.text(628, hudY + 8, '', {
      fontSize: mob ? '20px' : '18px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: mob ? 4 : 3, align: 'right'
    }).setOrigin(1, 0).setDepth(1003).setScrollFactor(0);

    // Wave
    this.waveText = this.add.text(628, hudY + 28, '', {
      fontSize: mob ? '16px' : '14px', color: '#60a5fa', fontStyle: 'bold', stroke: '#000', strokeThickness: mob ? 4 : 3, align: 'right'
    }).setOrigin(1, 0).setDepth(1003).setScrollFactor(0);

    // Equipment display
    this.equipText = this.add.text(185, hudY + 8, '', {
      fontSize: '10px', color: '#d4d4d4', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0).setDepth(1003).setScrollFactor(0);

    // Abilities / power-ups text (fallback, icons drawn in updateHUD)
    this.abilitiesText = this.add.text(185, hudY + 24, '', {
      fontSize: '11px', color: '#a78bfa', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0, 0).setDepth(1003).setScrollFactor(0);

    // Combo text (floating, centered on screen)
    this.comboText = this.add.text(320, 60, '', {
      fontSize: mob ? '52px' : '44px', color: '#ff4444', fontStyle: 'bold', stroke: '#000', strokeThickness: mob ? 8 : 6
    }).setOrigin(0.5).setDepth(1003).setScrollFactor(0);

    // Sound toggle button (top-right corner) — larger on mobile
    const soundX = mob ? 610 : 620;
    const soundSize = mob ? '28px' : '20px';
    this.soundToggleBtn = this.add.text(soundX, 8, '🔊', {
      fontSize: soundSize, stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1010).setScrollFactor(0).setInteractive({ useHandCursor: true });
    // Larger touch area on mobile
    if (mob) this.soundToggleBtn.setInteractive(new Phaser.Geom.Rectangle(-15, -15, 60, 60), Phaser.Geom.Rectangle.Contains);
    this.soundToggleBtn.on('pointerdown', () => {
      this.soundEnabled = !this.soundEnabled;
      this.soundToggleBtn?.setText(this.soundEnabled ? '🔊' : '🔇');
      if (this.bgMusic) {
        if (this.soundEnabled) {
          this.bgMusic.play();
        } else {
          this.bgMusic.pause();
        }
      }
    });
  }

  private showControlsOverlay() {
    const classAbilityDesktop: Record<PlayerClass, string> = {
      warrior: 'E = Shield Slam | Passive: 3% heal per hit',
      rogue: 'SHIFT = Shadow Step | Passive: 25% dodge',
      'dark-knight': 'E = Dark Flame | Passive: 8 dmg/tick burn',
    };
    const classAbilityMobile: Record<PlayerClass, string> = {
      warrior: '🛡️ = Shield Slam | Passive: 3% heal per hit',
      rogue: '💨 = Shadow Step | Passive: 25% dodge',
      'dark-knight': '🔥 = Dark Flame | Passive: 8 dmg/tick burn',
    };

    const overlay = this.add.rectangle(320, 280, 500, 280, 0x000000, 0.85).setDepth(3000).setScrollFactor(0);
    const title = this.add.text(320, 170, '⚔️ CONTROLS', {
      fontSize: '28px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

    const desktopLines = [
      'WASD / Arrows  —  Move',
      'SPACE  —  Attack (melee)',
      'Q  —  Shoot Arrow (ranged)',
      'SHIFT  —  Dash / Dodge',
      'E  —  Area Attack',
      `Class: ${classAbilityDesktop[this.playerClass]}`,
      'R  —  Restart',
    ];
    const mobileLines = [
      '🕹️  Left Joystick  —  Move',
      '⚔️  Hold Attack  —  Melee (or tap AA for auto)',
      '🏹  Tap Arrow  —  Shoot ranged attack',
      '💨  Tap Dash  —  Quick dodge',
      `${this.playerClass === 'rogue' ? '⚡' : this.playerClass === 'warrior' ? '🛡️' : '🔥'}  Tap Ability  —  Special ability`,
      `Class: ${classAbilityMobile[this.playerClass]}`,
      '📌  Tap top half to restart when dead',
    ];
    const lines = this.isMobile ? mobileLines : desktopLines;
    const textObjs = lines.map((line, i) => {
      return this.add.text(320, 210 + i * 24, line, {
        fontSize: this.isMobile ? '13px' : '14px', color: i === 5 ? '#a78bfa' : '#ddd', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);
    });

    const hint = this.add.text(320, 400, this.isMobile ? 'Tap to start...' : 'Press any key to start...', {
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
      this.input.off('pointerdown', dismiss);
    };
    this.input.keyboard!.on('keydown', dismiss);
    this.input.on('pointerdown', dismiss);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════
  override update(_time: number, delta: number) {
    if (this.gameOver) {
      if (this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R).isDown) {
        this.scene.restart();
      }
      // Mobile: tap anywhere to restart
      if (this.isMobile && this.input.activePointer.isDown && this.input.activePointer.downY < 500) {
        this.scene.restart();
      }
      return;
    }

    // Pause toggle
    if (Phaser.Input.Keyboard.JustDown(this.escKey) || Phaser.Input.Keyboard.JustDown(this.pKey)) {
      if (this.isPaused) this.resumeGame();
      else this.pauseGame();
    }
    if (this.isPaused) return;

    // Teleport cooldown
    if (this.teleportCooldown > 0) this.teleportCooldown -= delta;

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

    // Touch joystick input (with dead zone + speed curve)
    if (this.touchJoystick && this.touchJoystick.active) {
      const dx = this.touchJoystick.dx;
      const dy = this.touchJoystick.dy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const speedMul = this.touchJoystick.magnitude; // 0-1 with quadratic curve
        vx = (dx / dist) * effectiveSpeed * speedMul;
        vy = (dy / dist) * effectiveSpeed * speedMul;
      }
    }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }
    this.player.setVelocity(vx, vy);

    // Track last aim angle for arrow fallback
    if (vx !== 0 || vy !== 0) {
      this.lastAimAngle = Math.atan2(vy, vx);
    }

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

    // Mobile: continuous hold attack OR auto-attack
    const mobileAttackTrigger = this.isTouchBtnPressed('attack') || this.isTouchBtnHeld('attack') || this.autoAttackEnabled;
    if ((Phaser.Input.Keyboard.JustDown(this.spaceKey) || mobileAttackTrigger) && this.attackCooldown <= 0) {
      this.attack();
      const atkMul = this.activePowerUps.has('attackSpeed') ? 0.5 : 1;
      this.attackCooldown = classStats.attackRate * atkMul;
    }

    if ((Phaser.Input.Keyboard.JustDown(this.shiftKey) || this.isTouchBtnPressed('dash')) && this.dashCooldown <= 0) {
      this.dash();
      this.dashCooldown = classStats.dashCooldown;
    }

    if ((Phaser.Input.Keyboard.JustDown(this.eKey) || this.isTouchBtnPressed('area')) && this.areaCooldown <= 0) {
      this.areaAttack();
      this.areaCooldown = classStats.areaCooldown;
    }

    if ((Phaser.Input.Keyboard.JustDown(this.qKey) || this.isTouchBtnPressed('arrow')) && this.attackCooldown <= 0) {
      this.shootArrow();
      this.attackCooldown = classStats.attackRate * 0.8;
    }

    // Mobile: update cooldown visuals
    this.updateMobileCooldowns();

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

    // ── Boss AI ──
    if (this.activeBoss && this.activeBoss.active) {
      this.updateBossAI(delta);
    }

    // ── Teleport check ──
    this.checkTeleport();

    // ── Vignette effects ──
    this.updateVignette();

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
    this.tileGrid = tiles;  // cache for snapPlayerOutOfWalls

    tiles.forEach((tile, index) => {
      const gx = index % gridSize;
      const gy = Math.floor(index / gridSize);
      const px = gx * tileSize + tileSize / 2;
      const py = gy * tileSize + tileSize / 2;

      if (tile === '0') {
        // Use a simple invisible sprite for collision, plus a visual image on top
        const wall = this.walls.create(px, py, '__DEFAULT') as Phaser.Physics.Arcade.Sprite;
        wall.setVisible(false);
        const body = wall.body as Phaser.Physics.Arcade.StaticBody;
        body.setSize(tileSize, tileSize);
        body.setOffset(-tileSize / 2, -tileSize / 2);
        body.immovable = true;
        // Visual wall image (non-physics)
        if (this.textures.exists('wood-wall')) {
          this.add.image(px, py, 'wood-wall').setOrigin(0.5).setDisplaySize(tileSize, tileSize).setTint(0x9b7f57).setDepth(5);
        }
      } else if (tile === 'T' || tile === 't') {
        // Teleport tile — render floor + portal on top
        if (this.textures.exists('grass-tiles')) {
          this.add.sprite(px, py, 'grass-tiles', 12).setOrigin(0.5).setDisplaySize(tileSize, tileSize).setDepth(0);
        }
        this.floorTiles.push({ x: px, y: py });

        // Portal visual
        let portalSprite: Phaser.GameObjects.Sprite;
        if (this.textures.exists('portal-tile')) {
          portalSprite = this.add.sprite(px, py, 'portal-tile').setDisplaySize(56, 56).setDepth(3).setAlpha(0.85);
          if (this.anims.exists('portal-tile-anim')) portalSprite.play('portal-tile-anim');
        } else {
          portalSprite = this.add.sprite(px, py, 'grass-tiles', 12).setDisplaySize(56, 56).setDepth(3);
        }
        // Animated magic portal effect on top
        if (this.textures.exists('portal-fx-1')) {
          const pfx = this.add.sprite(px, py, 'portal-fx-1').setDisplaySize(64, 64).setDepth(4).setAlpha(0.6);
          if (this.anims.exists('portal-fx-anim')) pfx.play('portal-fx-anim');
        }
        this.teleportTiles.push({ x: px, y: py, sprite: portalSprite });
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

    // Compute reachability — find the largest connected component of floor tiles
    this.computeReachableTiles(tiles);

    // Spawn player at the best reachable tile (center of largest component)
    const start = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles[0]! : this.floorTiles[0];
    if (!start) { console.error('No floor tiles!'); return; }

    const textureKey = this.getPlayerTexture();
    this.player = this.physics.add.sprite(start.x, start.y, textureKey);
    this.player.setCollideWorldBounds(true).setDepth(10);

    // Sizes calculated from actual pixel content bounding boxes:
    //   Soldier: 17x21 content in 100x100 frame, centered at (41,39)
    //   Rogue:   35x29 content in 80x80 frame, at (19,35)
    //   DK:      full 48x32 frame (no alpha channel, palette mode)
    // Display sizes scaled 50% smaller for more movement space
    const sizes: Record<PlayerClass, { dw: number; dh: number; bw: number; bh: number; offX: number; offY: number }> = {
      warrior:       { dw: 125, dh: 125, bw: 10, bh: 12, offX: 20, offY: 19 },  // 100x100 native, content 17x21 at (41,39)
      rogue:         { dw: 75,  dh: 75,  bw: 18, bh: 15, offX: 9,  offY: 17 },  // 80x80 native, content 35x29 at (19,35)
      'dark-knight': { dw: 42,  dh: 28,  bw: 15, bh: 12, offX: 4,  offY: 2  },  // 48x32 native, full frame
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

  // ═══════════════════════════════════════════════════════════════════════════
  // REACHABILITY SYSTEM — Flood-fill to find connected floor tiles
  // ═══════════════════════════════════════════════════════════════════════════
  private computeReachableTiles(tiles: string[]) {
    const GRID = 10;
    const TILE = 64;

    const isFloor = (ch: string) => ch === '1' || ch === 'T' || ch === 't';

    // Build a set of all floor grid positions
    const allFloor = new Set<string>();
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        if (isFloor(tiles[r * GRID + c]!)) {
          allFloor.add(`${r},${c}`);
        }
      }
    }

    if (allFloor.size === 0) return;

    // Find all connected components via BFS
    const globalVisited = new Set<string>();
    const components: Set<string>[] = [];

    for (const key of allFloor) {
      if (globalVisited.has(key)) continue;
      const component = new Set<string>();
      const queue = [key];
      component.add(key);
      globalVisited.add(key);

      while (queue.length > 0) {
        const cur = queue.shift()!;
        const [cr, cc] = cur.split(',').map(Number) as [number, number];
        for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as [number, number][]) {
          const nr = cr + dr;
          const nc = cc + dc;
          const nk = `${nr},${nc}`;
          if (nr < 0 || nr >= GRID || nc < 0 || nc >= GRID) continue;
          if (globalVisited.has(nk)) continue;
          if (!allFloor.has(nk)) continue;
          globalVisited.add(nk);
          component.add(nk);
          queue.push(nk);
        }
      }
      components.push(component);
    }

    // Use the largest connected component
    components.sort((a, b) => b.size - a.size);
    const largest = components[0]!;

    // Convert to pixel coordinates
    this.reachableFloorTiles = [];
    largest.forEach((key) => {
      const [r, c] = key.split(',').map(Number) as [number, number];
      const px = c * TILE + TILE / 2;
      const py = r * TILE + TILE / 2;
      this.reachableFloorTiles.push({ x: px, y: py });
    });

    // Find boss arena: largest NxN open area within reachable tiles
    this.bossArenaCenter = null;
    for (const size of [5, 4, 3]) {
      if (this.bossArenaCenter) break;
      for (let r = 0; r <= GRID - size; r++) {
        if (this.bossArenaCenter) break;
        for (let c = 0; c <= GRID - size; c++) {
          let allOpen = true;
          for (let dr = 0; dr < size && allOpen; dr++) {
            for (let dc = 0; dc < size && allOpen; dc++) {
              if (!largest.has(`${r + dr},${c + dc}`)) allOpen = false;
            }
          }
          if (allOpen) {
            const centerR = r + Math.floor(size / 2);
            const centerC = c + Math.floor(size / 2);
            this.bossArenaCenter = {
              x: centerC * TILE + TILE / 2,
              y: centerR * TILE + TILE / 2,
            };
          }
        }
      }
    }

    // If no open area found, use center of reachable tiles
    if (!this.bossArenaCenter && this.reachableFloorTiles.length > 0) {
      this.bossArenaCenter = this.reachableFloorTiles[Math.floor(this.reachableFloorTiles.length / 2)]!;
    }
  }

  /**
   * Find the nearest reachable floor tile to a given world position.
   * Used by chest/power-up drops and ability targeting.
   */
  private nearestReachableTile(worldX: number, worldY: number): { x: number; y: number } {
    const tiles = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles : this.floorTiles;
    let best = tiles[0]!;
    let bestDist = Infinity;
    for (const t of tiles) {
      const d = Phaser.Math.Distance.Between(worldX, worldY, t.x, t.y);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    return best;
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

      // Bosses have their own AI in updateBossAI()
      if (enemy.getData('isBoss')) return;

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
              // Rogue passive: 25% dodge chance
              if (this.playerClass === 'rogue' && Math.random() < 0.25) {
                const dodgeText = this.add.text(this.player.x, this.player.y - 40, 'DODGE!', {
                  fontSize: '18px', color: '#a855f7', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
                }).setOrigin(0.5).setDepth(100);
                this.tweens.add({ targets: dodgeText, y: dodgeText.y - 30, alpha: 0, duration: 800, onComplete: () => dodgeText.destroy() });
                this.player.setAlpha(0.4);
                this.time.delayedCall(200, () => { if (this.player.active) this.player.setAlpha(1); });
                enemy.setData('attackCooldown', kind === 'skeleton' ? 800 : kind === 'vampire' ? 600 : 1000);
                return;
              }

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
        hp -= 8;  // DK fire burns hard
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
    const spawnTiles = this.reachableFloorTiles.length > 1 ? this.reachableFloorTiles : this.floorTiles;
    for (let i = 0; i < count && spawnTiles.length > 1; i++) {
      const tile = spawnTiles[Math.floor(Math.random() * (spawnTiles.length - 1)) + 1];
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
    enemy.setCollideWorldBounds(true);

    // Sizes from actual pixel content bounding boxes:
    //   Orc:      23x18 content in 100x100 frame, at (43,42) → display reduced 50%
    //   Skeleton: 15x15 content in 32x32 frame, at (7,14) → display reduced 50%
    //   Vampire:  12x16 content in 32x32 frame, at (7,13) → display reduced 50%
    const displaySizes: Record<EnemyKind, { w: number; h: number }> = {
      orc:      { w: 135, h: 135 },
      skeleton: { w: 57,  h: 57 },
      vampire:  { w: 55,  h: 55 },
    };
    const ds = displaySizes[kind];
    enemy.setDisplaySize(ds.w * bossScale, ds.h * bossScale);

    // Save the target scale so spawn-in animation can restore it correctly
    const targetScaleX = enemy.scaleX;
    const targetScaleY = enemy.scaleY;
    enemy.setData('targetScaleX', targetScaleX);
    enemy.setData('targetScaleY', targetScaleY);

    // Physics body in NATIVE sprite coords — perfectly centered for all enemies
    const bodySizes: Record<EnemyKind, { w: number; h: number; ox: number; oy: number }> = {
      orc:      { w: 35, h: 32, ox: 32, oy: 34 },   // centered in 100x100 frame, very large hitbox
      skeleton: { w: 14, h: 14, ox: 9,  oy: 9  },   // centered in 32x32 frame
      vampire:  { w: 16, h: 18, ox: 8,  oy: 7  },   // centered in 32x32 frame
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
    const waveMul = 1 + (this.currentWave - 1) * 0.10;
    const hp = Math.floor(template.hp * waveMul * bossScale * (bossScale > 1 ? 5 : 1));
    const damage = Math.floor(template.damage * Math.min(waveMul, 2.0) * bossScale);

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
    // Use boss arena center (largest open area) or center of reachable tiles
    const tile = this.bossArenaCenter
      || (this.reachableFloorTiles.length > 0
          ? this.reachableFloorTiles[Math.floor(this.reachableFloorTiles.length / 2)]
          : this.floorTiles[Math.floor(this.floorTiles.length / 2)]);
    if (!tile) return;

    // Determine which boss from schedule
    const schedule = BOSS_WAVE_SCHEDULE[this.currentWave];
    const bossKind: BossKind = schedule?.kind || (['pink', 'owlet', 'dude'][this.currentWave % 3] as BossKind);
    const enraged = schedule?.enraged || this.currentWave > 18;
    this.bossKind = bossKind;
    this.bossPhase = 1;
    this.bossAbilityTimer = 2000; // First ability after 2s

    const template = BOSS_TEMPLATES[bossKind];
    const waveMul = 1 + (this.currentWave - 1) * 0.1;
    const hpMul = enraged ? 1.5 : 1;
    const hp = Math.floor(template.hp * waveMul * hpMul);

    // Create boss sprite
    const textureKey = `boss-${bossKind}-idle`;
    const boss = this.enemies.create(tile.x, tile.y, textureKey) as Phaser.Physics.Arcade.Sprite;
    boss.setDepth(12).setCollideWorldBounds(true);

    // Boss is 2.5x-3x a regular tile (they're 32×32 native with full frame content)
    const bossSize = bossKind === 'dude' ? 160 : 130;
    boss.setDisplaySize(bossSize, bossSize);

    const targetScaleX = boss.scaleX;
    const targetScaleY = boss.scaleY;
    boss.setData('targetScaleX', targetScaleX);
    boss.setData('targetScaleY', targetScaleY);

    if (boss.body) {
      boss.body.setSize(22, 22);
      boss.body.setOffset(5, 5);
    }

    boss.setData('kind', bossKind);
    boss.setData('isBoss', true);
    boss.setData('bossKind', bossKind);
    boss.setData('hp', hp);
    boss.setData('maxHp', hp);
    boss.setData('damage', Math.floor(template.damage * waveMul));
    boss.setData('speed', template.speed);
    boss.setData('attackRange', 250);
    boss.setData('attackCooldown', 0);
    boss.setData('enraged', enraged);
    boss.setData('baseTint', 0xffffff);
    boss.setData('barWidth', 0); // No overhead bar for boss — uses bottom bar

    // Don't create overhead HP bar for bosses — they get the bottom bar
    boss.setData('healthBarBg', null);
    boss.setData('healthBar', null);

    if (this.anims.exists(`boss-${bossKind}-idle-anim`)) {
      boss.play(`boss-${bossKind}-idle-anim`);
    }

    this.activeBoss = boss;

    // ── Boss entrance cinematic ──
    // 1) Screen darkens
    if (this.vignetteOverlay) {
      this.tweens.add({ targets: this.vignetteOverlay, alpha: 0.5, duration: 800 });
    }

    // 2) Portal entrance effect
    if (this.textures.exists('portal-fx-1')) {
      const portal = this.add.sprite(tile.x, tile.y, 'portal-fx-1').setDisplaySize(120, 120).setDepth(11).setAlpha(0.8);
      if (this.anims.exists('portal-fx-anim')) portal.play('portal-fx-anim');
      this.time.delayedCall(1500, () => portal.destroy());
    }

    // 3) Boss emerges with scale animation
    boss.setAlpha(0);
    boss.setScale(0.1, 0.1);
    this.tweens.add({
      targets: boss,
      scaleX: targetScaleX, scaleY: targetScaleY, alpha: 1,
      duration: 1000, ease: 'Back.easeOut', delay: 400,
    });

    // 4) Heavy screen shake
    this.time.delayedCall(400, () => {
      this.cameras.main.shake(600, 0.025);
    });
    // 4b) Boss entrance sound — delayed to sync with portal emergence
    this.time.delayedCall(900, () => {
      this.playSfx('boss');
    });

    // 5) Boss title card with artwork panel
    const titleColor = bossKind === 'pink' ? '#ff69b4' : bossKind === 'owlet' ? '#60a5fa' : '#f59e0b';
    const titleParts: Phaser.GameObjects.GameObject[] = [];
    const cardW = 340, cardH = 80;
    if (this.textures.exists('ui-bg')) {
      const cardBg = this.add.image(320, 290, 'ui-bg').setDisplaySize(cardW, cardH).setDepth(1004).setScrollFactor(0).setAlpha(0);
      titleParts.push(cardBg);
      this.tweens.add({ targets: cardBg, alpha: 0.9, duration: 300 });
      this.tweens.add({ targets: cardBg, alpha: 0, duration: 800, delay: 2500, onComplete: () => cardBg.destroy() });
    }
    if (this.textures.exists('ui-border')) {
      const cardBorder = this.add.image(320, 290, 'ui-border').setDisplaySize(cardW + 6, cardH + 6).setDepth(1004).setScrollFactor(0).setAlpha(0);
      titleParts.push(cardBorder);
      this.tweens.add({ targets: cardBorder, alpha: 0.7, duration: 300 });
      this.tweens.add({ targets: cardBorder, alpha: 0, duration: 800, delay: 2500, onComplete: () => cardBorder.destroy() });
    }
    const label = this.add.text(320, 280, `${template.emoji} ${template.title} ${template.emoji}`, {
      fontSize: '36px', color: titleColor, fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
    if (enraged) {
      const enragedLabel = this.add.text(320, 310, '⚠️ ENRAGED ⚠️', {
        fontSize: '20px', color: '#ef4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
      this.tweens.add({ targets: enragedLabel, alpha: 0, y: 300, duration: 3000, delay: 1500, onComplete: () => enragedLabel.destroy() });
    }
    this.tweens.add({ targets: label, scale: 1.2, yoyo: true, duration: 400, repeat: 2 });
    this.tweens.add({ targets: label, alpha: 0, y: 240, duration: 2500, delay: 1500, onComplete: () => label.destroy() });

    // 6) Restore vignette
    this.time.delayedCall(2000, () => {
      if (this.vignetteOverlay && !this.activeBoss) {
        this.tweens.add({ targets: this.vignetteOverlay, alpha: 0, duration: 500 });
      }
    });

    // 7) Create bottom boss HP bar
    this.createBossHPBar(template, enraged);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEXT WAVE
  // ═══════════════════════════════════════════════════════════════════════════
  private startNextWave() {
    this.waveInProgress = false;
    const prevWasBoss = this.isBossWave && this.bossSpawned;
    this.currentWave++;
    this.waveStartHP = this.playerHP;
    this.waveStartTime = Date.now();
    this.playSfx('wave');

    // Victory after wave 20!
    if (this.currentWave > 20) {
      this.handleVictory();
      return;
    }

    this.isBossWave = this.currentWave % 3 === 0;   // Boss every 3rd wave
    this.bossSpawned = false;

    this.maxHP += 20;
    this.playerHP = Math.min(this.playerHP + 30, this.maxHP + this.equipBonusHP);

    // Grant full HP on boss defeat
    if (prevWasBoss) {
      this.playerHP = this.maxHP + this.equipBonusHP;
      const fullHPText = this.add.text(320, 200, '💚 FULL HP RESTORED!', {
        fontSize: '28px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
      this.tweens.add({ targets: fullHPText, y: 170, alpha: 0, duration: 2000, ease: 'Power2', onComplete: () => fullHPText.destroy() });
    } else {
      const rw = this.add.text(320, 200, '+30 HP!', {
        fontSize: '28px', color: '#22c55e', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5);
      this.tweens.add({ targets: rw, y: 170, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => rw.destroy() });
    }

    this.enemiesPerWave = Math.min(3 + Math.floor(this.currentWave / 2), 8);

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
    // Class-specific screen shake — Warrior hits feel heavy
    const shakeIntensity = this.playerClass === 'warrior' ? 0.012 : 0.006;
    this.cameras.main.shake(60, shakeIntensity);

    const facingRight = !this.player.flipX;
    // Class-dependent lunge distance
    const lungeDistances: Record<PlayerClass, number> = { warrior: 22, rogue: 18, 'dark-knight': 14 };
    const lx = facingRight ? lungeDistances[this.playerClass] : -lungeDistances[this.playerClass];
    this.tweens.add({ targets: this.player, x: this.player.x + lx, duration: 80, yoyo: true, ease: 'Power2.easeOut' });

    const baseDmg = this.playerDamage + this.equipBonusDamage;
    const dmgMul = this.activePowerUps.has('damage') ? 2 : 1;
    const finalDmg = baseDmg * dmgMul;

    let element = this.playerElement;
    if (this.activePowerUps.has('freeze')) element = 'ice';

    // Hit pattern: Warrior cleaves 3 wide, Rogue dual-strikes, DK sweeps
    const hitCount = this.playerClass === 'warrior' ? 3 :
                     this.playerClass === 'rogue' ? 2 :
                     (this.activePowerUps.has('multiShot') ? 3 : 1);
    const angleSpread = this.playerClass === 'warrior' ? Math.PI / 5 :
                        hitCount > 1 ? Math.PI / 8 : 0;

    // Class-dependent attack reach
    const atkOffsets: Record<PlayerClass, { forward: number; sweep: number; radius: number }> = {
      warrior:       { forward: 8, sweep: 20, radius: 55 },  // wide cleave
      rogue:         { forward: 6, sweep: 18, radius: 36 },  // precise strikes
      'dark-knight': { forward: 5, sweep: 10, radius: 65 },  // huge dark sweep
    };
    const atkCfg = atkOffsets[this.playerClass];

    for (let i = 0; i < hitCount; i++) {
      const a = (i - Math.floor(hitCount / 2)) * angleSpread;
      const ox = Math.cos(a) * atkCfg.sweep * (facingRight ? 1 : -1);
      const oy = Math.sin(a) * atkCfg.sweep;

      const hbX = this.player.x + ox + (facingRight ? atkCfg.forward : -atkCfg.forward);
      const hbY = this.player.y + oy;
      const hb = this.attackHitbox.create(hbX, hbY, undefined) as Phaser.Physics.Arcade.Sprite;
      hb.setCircle(atkCfg.radius);
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

    // Warrior passive: on-hit heal — every attack restores 3% max HP
    if (this.playerClass === 'warrior') {
      const onHitHeal = Math.floor((this.maxHP + this.equipBonusHP) * 0.03);
      this.playerHP = Math.min(this.playerHP + onHitHeal, this.maxHP + this.equipBonusHP);
    }

    // Dark Knight fire trail on every attack
    if (this.playerClass === 'dark-knight') {
      const fxX = this.player.x + (facingRight ? 35 : -35);
      const fx = this.playMagicEffect('fire-ball', fxX, this.player.y, 55);
      if (fx) fx.setRotation(facingRight ? 0 : Math.PI);
    }

    // Forward lunge on attack — Warrior gets a strong lunge
    const lungeSpeed: Record<PlayerClass, number> = {
      warrior: 220,
      rogue: 100,
      'dark-knight': 160
    };
    const lungeDuration: Record<PlayerClass, number> = {
      warrior: 130,
      rogue: 80,
      'dark-knight': 120
    };
    this.player.setVelocity(facingRight ? lungeSpeed[this.playerClass] : -lungeSpeed[this.playerClass], 0);
    this.time.delayedCall(lungeDuration[this.playerClass], () => { 
      if (!this.gameOver) {
        this.player.setVelocity(0, 0);
        this.snapPlayerOutOfWalls();
      }
    });

    this.playSfx('attack');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ARROW PROJECTILE (Q)
  // ═══════════════════════════════════════════════════════════════════════════
  private shootArrow() {
    const dmgMul = this.activePowerUps.has('damage') ? 2 : 1;
    const baseDmg = Math.floor((this.playerDamage + this.equipBonusDamage) * dmgMul);

    // Find nearest enemy to aim at
    let aimAngle: number;
    let closest: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDist = 400;
    this.enemies.children.entries.forEach((obj) => {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      if (!e.active) return;
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
      if (d < closestDist) { closest = e; closestDist = d; }
    });
    if (closest) {
      aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, (closest as Phaser.Physics.Arcade.Sprite).x, (closest as Phaser.Physics.Arcade.Sprite).y);
    } else {
      // Fall back to current velocity, then last movement direction
      const vx = this.player.body!.velocity.x;
      const vy = this.player.body!.velocity.y;
      if (vx !== 0 || vy !== 0) {
        aimAngle = Math.atan2(vy, vx);
        this.lastAimAngle = aimAngle;
      } else {
        // Standing still — use last known movement direction
        aimAngle = this.lastAimAngle;
      }
    }

    // DK shoots fire projectile, others shoot arrow
    const isFireArrow = this.playerClass === 'dark-knight';
    const arrowCount = this.activePowerUps.has('multiShot') ? 3 : 1;
    const spread = arrowCount > 1 ? Math.PI / 10 : 0;

    for (let i = 0; i < arrowCount; i++) {
      const a = aimAngle + (i - Math.floor(arrowCount / 2)) * spread;
      const arrow = this.projectiles.create(this.player.x, this.player.y, 'arrow-img') as Phaser.Physics.Arcade.Sprite;
      arrow.setDisplaySize(32, 32).setDepth(12);
      arrow.setData('damage', baseDmg);
      arrow.setData('element', isFireArrow ? 'fire' : this.playerElement);
      arrow.setRotation(a);

      const speed = 450;
      arrow.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);

      // Fire tint for DK arrows
      if (isFireArrow) {
        arrow.setTint(0xff6600);
      }

      this.time.delayedCall(2000, () => { if (arrow.active) arrow.destroy(); });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DASH (SHIFT)
  // ═══════════════════════════════════════════════════════════════════════════
  private dash() {
    const vx = this.player.body!.velocity.x;
    const vy = this.player.body!.velocity.y;
    if (vx === 0 && vy === 0) return;
    this.playSfx('dash');

    const angle = Math.atan2(vy, vx);
    this.lastAimAngle = angle;
    const dashSpeed = this.playerClass === 'rogue' ? 800 : this.playerClass === 'warrior' ? 650 : 700;
    const dashDuration = this.playerClass === 'rogue' ? 180 : this.playerClass === 'warrior' ? 220 : 200;

    this.invincible = this.playerClass === 'rogue' ? 600 : this.playerClass === 'warrior' ? 450 : 400;

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
        // Purple vanish effect — portal at start position
        this.playMagicEffect('portal-fx', this.player.x, this.player.y, 80);

        // Teleport behind the closest enemy — find a valid floor tile near the target
        const cx = (closest as Phaser.Physics.Arcade.Sprite).x;
        const cy = (closest as Phaser.Physics.Arcade.Sprite).y;
        const awayAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, cx, cy);
        const behindX = cx + Math.cos(awayAngle + Math.PI) * 60;
        const behindY = cy + Math.sin(awayAngle + Math.PI) * 60;
        // Find the nearest reachable floor tile to the desired position (avoids landing inside walls)
        const shadowTiles = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles : this.floorTiles;
        let bestTile = shadowTiles[0]!;
        let bestDist = Infinity;
        shadowTiles.forEach(ft => {
          const d = Phaser.Math.Distance.Between(behindX, behindY, ft.x, ft.y);
          if (d < bestDist) { bestDist = d; bestTile = ft; }
        });
        this.player.setPosition(bestTile.x, bestTile.y);

        // Appear effect — portal at destination
        this.playMagicEffect('portal-fx', this.player.x, this.player.y, 70);

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
    // Class-specific dash trail effects (kept lean for performance)
    if (this.playerClass === 'warrior') {
      this.playMagicEffect('earth-spike', this.player.x, this.player.y, 60);
      this.time.delayedCall(80, () => this.playMagicEffect('rocks-fx', this.player.x, this.player.y, 50));
    } else if (this.playerClass === 'dark-knight') {
      const fx = this.playMagicEffect('fire-ball', this.player.x, this.player.y, 55);
      if (fx) fx.setRotation(angle);
      this.time.delayedCall(80, () => this.playMagicEffect('explosion', this.player.x, this.player.y, 45));
    } else {
      this.playMagicEffect('wind-fx', this.player.x, this.player.y, 50);
      this.time.delayedCall(80, () => this.playMagicEffect('wind-fx', this.player.x, this.player.y, 40));
    }

    // Dash attack: damage enemies we pass through
    const dashDmgMul = this.playerClass === 'warrior' ? 1.2 : this.playerClass === 'dark-knight' ? 1.0 : 0.8;
    const dashDmg = Math.floor((this.playerDamage + this.equipBonusDamage) * dashDmgMul);
    const dashHitRadius = this.playerClass === 'warrior' ? 60 : 50;
    const hitEnemies = new Set<Phaser.Physics.Arcade.Sprite>();
    
    // Check for enemies hit during dash (multiple checks during dash)
    for (let checkTime = 0; checkTime < dashDuration; checkTime += 40) {
      this.time.delayedCall(checkTime, () => {
        this.enemies.children.entries.forEach((obj) => {
          const e = obj as Phaser.Physics.Arcade.Sprite;
          if (!e.active || hitEnemies.has(e)) return;
          const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y);
          if (d < dashHitRadius) {
            hitEnemies.add(e);
            let hp = e.getData('hp');
            hp -= dashDmg;
            e.setData('hp', hp);
            const kind = e.getData('kind') as EnemyKind;
            e.play(this.enemyAnim(kind, 'hurt'), true);
            e.setTint(0xff4444);
            
            // Damage number
            const dashDmgColor = this.playerClass === 'dark-knight' ? '#ef4444' : this.playerClass === 'warrior' ? '#fbbf24' : '#a855f7';
            const dt = this.add.text(e.x, e.y - 30, `-${dashDmg}`, {
              fontSize: '18px', color: dashDmgColor,
              fontStyle: 'bold', stroke: '#000', strokeThickness: 3
            }).setOrigin(0.5).setDepth(100);
            this.tweens.add({ targets: dt, y: dt.y - 30, alpha: 0, duration: 500, onComplete: () => dt.destroy() });
            
            // Knockback
            const kb = Phaser.Math.Angle.Between(this.player.x, this.player.y, e.x, e.y);
            this.tweens.add({
              targets: e,
              x: e.x + Math.cos(kb) * 20,
              y: e.y + Math.sin(kb) * 20,
              duration: 100, ease: 'Power2',
              onComplete: () => { const bt = e.getData('baseTint') || 0xffffff; e.setTint(bt); }
            });
            
            this.playSfx('hit');
            if (hp <= 0) this.handleEnemyDeath(e);
          }
        });
      });
    }

    // Dark Knight: leave fire on dash path
    if (this.playerClass === 'dark-knight') {
      this.playMagicEffect('fire-ball', this.player.x, this.player.y, 70);
      this.playMagicEffect('molten-spear', this.player.x, this.player.y, 60);
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

    // Reset velocity after dash duration and snap out of walls
    this.time.delayedCall(dashDuration, () => {
      if (!this.gameOver) {
        this.player.setVelocity(0, 0);
        this.snapPlayerOutOfWalls();
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AREA ATTACK (E)
  // ═══════════════════════════════════════════════════════════════════════════
  private areaAttack() {
    const radius = this.playerClass === 'warrior' ? 220 : this.playerClass === 'dark-knight' ? 190 : 140;
    const areaMul = this.playerClass === 'warrior' ? 2.0 : this.playerClass === 'dark-knight' ? 1.8 : 1.5;
    const areaDmg = Math.floor((this.playerDamage + this.equipBonusDamage) * areaMul);

    // Class-specific visual effects
    if (this.playerClass === 'warrior') {
      // Shield slam — earth spike + rocks + golden shockwave + invincibility + self-heal
      this.invincible = Math.max(this.invincible, 1000);
      // Heal 10% max HP on slam
      const healAmt = Math.floor((this.maxHP + this.equipBonusHP) * 0.1);
      this.playerHP = Math.min(this.playerHP + healAmt, this.maxHP + this.equipBonusHP);
      const ht = this.add.text(this.player.x, this.player.y - 30, `+${healAmt}`, {
        fontSize: '18px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ht, y: ht.y - 35, alpha: 0, duration: 800, onComplete: () => ht.destroy() });

      this.playMagicEffect('earth-spike', this.player.x, this.player.y, 130);
      this.playMagicEffect('rocks-fx', this.player.x, this.player.y, 110);
      // Shield glow ring
      const ring1 = this.add.circle(this.player.x, this.player.y, 30, 0xfacc15, 0.6).setDepth(99);
      this.tweens.add({ targets: ring1, scale: radius / 30, alpha: 0, duration: 500, onComplete: () => ring1.destroy() });
      // Shield shimmer on player
      const shield = this.add.circle(this.player.x, this.player.y, 45, 0x22c55e, 0.4).setDepth(99);
      this.tweens.add({ targets: shield, scale: 1.8, alpha: 0, duration: 700, onComplete: () => shield.destroy() });
    } else if (this.playerClass === 'dark-knight') {
      // Fire eruption — explosion + fireballs around player
      this.playMagicEffect('explosion', this.player.x, this.player.y, 120);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        this.playMagicEffect('fire-ball', this.player.x + Math.cos(a) * 60, this.player.y + Math.sin(a) * 60, 65);
      }
      const ring = this.add.circle(this.player.x, this.player.y, radius, 0xff4400, 0.35).setDepth(99);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.4, duration: 600, onComplete: () => ring.destroy() });
    } else {
      // Rogue — wind blade flurry + tornado
      this.playMagicEffect('tornado-fx', this.player.x, this.player.y, 90);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        this.playMagicEffect('wind-fx',
          this.player.x + Math.cos(a) * Phaser.Math.Between(30, 70),
          this.player.y + Math.sin(a) * Phaser.Math.Between(30, 70), 50);
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

        // Apply element — DK always burns on area
        this.applyElement(enemy, this.playerClass === 'dark-knight' ? 'fire' : this.playerElement);

        // Strong knockback — Warrior has massive knockback
        const kbAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
        const kbForce = this.playerClass === 'warrior' ? 600 : 350;
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
    let damage = hitbox.getData('damage');
    const element = hitbox.getData('element') as ElementType;
    
    // Boss armor reduces damage by 50%
    if (enemy.getData('armor')) damage = Math.floor(damage * 0.5);
    
    let hp = enemy.getData('hp');
    const kind = enemy.getData('kind') as EnemyKind;
    hp -= damage;
    enemy.setData('hp', hp);

    this.playSfx('hit');

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
    // Guard: prevent double-counting if multiple hits kill on same frame
    if (enemy.getData('dead')) return;
    enemy.setData('dead', true);

    const kind = enemy.getData('kind') as EnemyKind | BossKind;
    const isBoss = enemy.getData('isBoss') || false;
    this.totalKills++;
    if (isBoss) this.bossesKilled++;

    this.playSfx('kill');

    // Class passive on kill: DK lifesteal, Warrior sustain
    if (this.playerClass === 'dark-knight') {
      const heal = Math.floor((this.maxHP + this.equipBonusHP) * 0.08);
      this.playerHP = Math.min(this.playerHP + heal, this.maxHP + this.equipBonusHP);
      const ht = this.add.text(this.player.x, this.player.y - 25, `+${heal}`, {
        fontSize: '14px', color: '#ef4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ht, y: ht.y - 25, alpha: 0, duration: 600, onComplete: () => ht.destroy() });
    } else if (this.playerClass === 'warrior') {
      const heal = Math.floor((this.maxHP + this.equipBonusHP) * 0.08);
      this.playerHP = Math.min(this.playerHP + heal, this.maxHP + this.equipBonusHP);
      const ht2 = this.add.text(this.player.x, this.player.y - 25, `+${heal}`, {
        fontSize: '14px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ht2, y: ht2.y - 25, alpha: 0, duration: 600, onComplete: () => ht2.destroy() });
    } else if (this.playerClass === 'rogue') {
      // Rogue on-kill heal: 6% max HP — sustain through aggression
      const heal = Math.floor((this.maxHP + this.equipBonusHP) * 0.06);
      this.playerHP = Math.min(this.playerHP + heal, this.maxHP + this.equipBonusHP);
      const ht3 = this.add.text(this.player.x, this.player.y - 25, `+${heal}`, {
        fontSize: '14px', color: '#a855f7', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(100);
      this.tweens.add({ targets: ht3, y: ht3.y - 25, alpha: 0, duration: 600, onComplete: () => ht3.destroy() });
    }

    // Combo
    const now = Date.now();
    if (now - this.lastKillTime < 3000) { this.comboCount++; } else { this.comboCount = 1; }
    this.lastKillTime = now;
    this.comboTimer = 3000;

    const comboBonus = Math.min(this.comboCount, 5);
    this.score += (isBoss ? 500 : 100) * this.currentWave * comboBonus;

    this.burnEffects.delete(enemy);
    this.freezeEffects.delete(enemy);

    // Boss-specific death sequence
    if (isBoss) {
      this.handleBossDeath(enemy);
      return;
    }

    // Regular enemy drops — ensure items spawn on reachable tiles
    const dropTile = this.nearestReachableTile(enemy.x, enemy.y);
    if (Math.random() < 0.15) this.dropHealth(dropTile.x, dropTile.y);
    if (Math.random() < 0.10) this.spawnPowerUp(dropTile.x, dropTile.y);
    if (Math.random() < 0.08) this.spawnChest(dropTile.x, dropTile.y);

    // Death animation — use explosion magic effect
    const hasExplosion = this.textures.exists('explosion-1');
    if (hasExplosion) {
      this.playMagicEffect('explosion', enemy.x, enemy.y, 70);
    }

    enemy.play(this.enemyAnim(kind as EnemyKind, 'death'));
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

  private handleBossDeath(boss: Phaser.Physics.Arcade.Sprite) {
    const bossKind = boss.getData('bossKind') as BossKind;

    // 1) Slowmo effect — slow physics and tweens
    this.physics.world.timeScale = 3;     // higher = slower (inverse of game speed)
    this.tweens.timeScale = 0.3;
    this.time.delayedCall(2000, () => {
      this.physics.world.timeScale = 1;
      this.tweens.timeScale = 1;
    });

    // 2) Boss death animation
    const deathAnim = `boss-${bossKind}-death-anim`;
    if (this.anims.exists(deathAnim)) boss.play(deathAnim, true);

    // 3) Chain explosions
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 150, () => {
        const ox = boss.x + Phaser.Math.Between(-50, 50);
        const oy = boss.y + Phaser.Math.Between(-50, 50);
        this.playMagicEffect('explosion', ox, oy, 90);
      });
    }

    // 4) Rock debris
    this.playMagicEffect('rocks-fx', boss.x, boss.y, 100);

    // 5) Screen flash + heavy shake
    this.cameras.main.flash(300, 255, 255, 255);
    this.cameras.main.shake(800, 0.04);

    // 6) "BOSS DEFEATED!" text
    const defeatText = this.add.text(320, 250, '💀 BOSS DEFEATED!', {
      fontSize: '36px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
    this.tweens.add({ targets: defeatText, scale: 1.3, yoyo: true, duration: 400, repeat: 2 });
    this.tweens.add({ targets: defeatText, alpha: 0, y: 220, duration: 3000, delay: 1500, onComplete: () => defeatText.destroy() });

    // 7) Full HP restore text
    const hpText = this.add.text(320, 300, '💚 FULL HP RESTORED!', {
      fontSize: '24px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
    this.tweens.add({ targets: hpText, y: 280, alpha: 0, duration: 2500, delay: 500, onComplete: () => hpText.destroy() });

    // 8) Guaranteed epic chest drop — on nearest reachable tile
    const bossDropTile = this.nearestReachableTile(boss.x, boss.y);
    this.spawnChest(bossDropTile.x, bossDropTile.y);

    // 9) Remove boss and clean up
    boss.setVelocity(0, 0);
    boss.setData('speed', 0);
    this.tweens.add({
      targets: boss,
      alpha: 0,
      duration: 1000,
      delay: 600,
      onComplete: () => {
        boss.destroy();
        this.activeBoss = null;
        this.destroyBossHPBar();
        // Clear vignette
        if (this.vignetteOverlay) {
          this.tweens.add({ targets: this.vignetteOverlay, alpha: 0, duration: 500 });
        }
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

    const pickup = this.powerUpPickups.create(x, y, '__DEFAULT') as Phaser.Physics.Arcade.Sprite;
    pickup.setVisible(false);
    pickup.body!.setSize(26, 26);
    (pickup.body as Phaser.Physics.Arcade.Body).setOffset(-13, -13);
    const vis = this.add.star(0, 0, 6, 7, 13, pu.color).setStrokeStyle(2, 0xffffff).setDepth(15);
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
    this.playSfx('pickup');

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

    // Ability cooldown indicators — simplified on mobile (button arcs show cooldowns)
    const dashReady = this.dashCooldown <= 0;
    const areaReady = this.areaCooldown <= 0;
    const classLabel = this.playerClass === 'warrior' ? '⚔️ Warrior' : this.playerClass === 'rogue' ? '🗡️ Rogue' : '🔥 Dark Knight';
    if (this.isMobile) {
      // On mobile, just show class name + auto-attack status (cooldown shown on buttons)
      const aaStr = this.autoAttackEnabled ? '🟢 AA' : '🔴 AA';
      this.classText.setText(`${classLabel}  |  ${aaStr}`);
    } else {
      const dashStr = dashReady ? '🟢 Dash[SHIFT]' : `🔴 Dash ${(this.dashCooldown / 1000).toFixed(1)}s`;
      const abilityName = this.playerClass === 'warrior' ? 'Shield[E]' : this.playerClass === 'rogue' ? 'Flurry[E]' : 'Flame[E]';
      const areaStr = areaReady ? `🟢 ${abilityName}` : `🔴 ${abilityName} ${(this.areaCooldown / 1000).toFixed(1)}s`;
      this.classText.setText(`${classLabel}  |  ${dashStr}  |  ${areaStr}`);
    }

    // Power-up icons — only rebuild when set changes, just update countdown text otherwise
    const currentKeys = Array.from(this.activePowerUps.keys()).sort().join(',');
    if (currentKeys !== (this as any)._lastPowerUpKeys) {
      (this as any)._lastPowerUpKeys = currentKeys;
      // Rebuild icons
      this.powerUpIconSprites.forEach(s => s.destroy());
      this.powerUpIconSprites = [];
      const iconMap: Record<string, number> = {
        speed: 0, shield: 1, damage: 2, attackSpeed: 3, lifeSteal: 4,
        multiShot: 5, magnet: 6, freeze: 7
      };
      const iconTints: Record<string, number> = {
        speed: 0xffff00, shield: 0x00ff88, damage: 0xff4444, attackSpeed: 0xff8800,
        lifeSteal: 0x44ff44, multiShot: 0x44aaff, magnet: 0xaa44ff, freeze: 0x44ffff
      };
      let iconIdx = 0;
      const iconBaseX = 185, iconBaseY = 589;
      this.activePowerUps.forEach((_time, type) => {
        const iconNum = iconMap[type] ?? 9;
        const iconKey = `magic-icon-${iconNum}`;
        if (this.textures.exists(iconKey)) {
          const ix = iconBaseX + iconIdx * 34;
          const bg = this.add.circle(ix, iconBaseY, 15, 0x000000, 0.4).setDepth(1003).setScrollFactor(0);
          this.powerUpIconSprites.push(bg);
          const icon = this.add.image(ix, iconBaseY, iconKey)
            .setDisplaySize(26, 26).setDepth(1004).setScrollFactor(0)
            .setTint(iconTints[type] || 0xffffff);
          this.powerUpIconSprites.push(icon);
          const label = this.add.text(ix, iconBaseY + 15, '', {
            fontSize: '9px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
          }).setOrigin(0.5).setDepth(1004).setScrollFactor(0);
          label.setData('puType', type);
          this.powerUpIconSprites.push(label);
          iconIdx++;
        }
      });
    }
    // Update countdown labels (cheap — just setText on existing objects)
    const abilInfo: string[] = [];
    this.powerUpIconSprites.forEach(s => {
      if (s instanceof Phaser.GameObjects.Text && s.getData('puType')) {
        const t = this.activePowerUps.get(s.getData('puType'));
        (s as Phaser.GameObjects.Text).setText(t ? `${Math.ceil(t / 1000)}s` : '');
      }
    });
    // Fallback text for icons without textures
    this.activePowerUps.forEach((time, type) => {
      const iconKey = `magic-icon-${({speed:0,shield:1,damage:2,attackSpeed:3,lifeSteal:4,multiShot:5,magnet:6,freeze:7}[type] ?? 9)}`;
      if (!this.textures.exists(iconKey)) {
        const icons: Record<string, string> = { speed: '⚡', shield: '🛡️', damage: '💥', attackSpeed: '⚔️', lifeSteal: '💚', multiShot: '🎯', magnet: '🧲', freeze: '❄️' };
        abilInfo.push(`${icons[type] || '✨'} ${(time / 1000).toFixed(0)}s`);
      }
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
    // Push player away from enemy to prevent overlap (reduced speed to avoid tunneling)
    this.player.setVelocity(Math.cos(angle) * 150, Math.sin(angle) * 150);
    // Also push enemy slightly back
    enemy.setVelocity(Math.cos(angle + Math.PI) * 60, Math.sin(angle + Math.PI) * 60);
    // Schedule a wall-overlap correction after a short delay
    this.time.delayedCall(80, () => this.snapPlayerOutOfWalls());
  }

  /** If the player is overlapping a wall, snap them to the nearest floor tile */
  private snapPlayerOutOfWalls() {
    if (!this.player || !this.player.active) return;
    const px = this.player.x, py = this.player.y;
    const gx = Math.floor(px / 64);
    const gy = Math.floor(py / 64);
    if (gx < 0 || gx > 9 || gy < 0 || gy > 9 || this.tileGrid[gy * 10 + gx] === '0') {
      // Player is inside a wall — snap to nearest reachable floor tile
      const snapTiles = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles : this.floorTiles;
      let bestTile = snapTiles[0]!;
      let bestDist = Infinity;
      snapTiles.forEach(ft => {
        const d = Phaser.Math.Distance.Between(px, py, ft.x, ft.y);
        if (d < bestDist) { bestDist = d; bestTile = ft; }
      });
      this.player.setPosition(bestTile.x, bestTile.y);
      this.player.setVelocity(0, 0);
    }
  }

  private handleDeath() {
    this.gameOver = true;
    this._won = false;
    this.player.play(this.playerAnim('death'), true);
    this.player.setVelocity(0, 0);
    this.playSfx('gameOver');

    // Dramatic slowmo + screen shake
    this.cameras.main.shake(600, 0.03);
    this.cameras.main.flash(200, 200, 0, 0);

    // Clean up boss if active
    if (this.activeBoss) {
      this.destroyBossHPBar();
      this.activeBoss = null;
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, 640, 640, 0x000000, 0.75).setOrigin(0, 0).setDepth(2000).setScrollFactor(0);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

    // Death explosion effect
    this.playMagicEffect('explosion', this.player.x, this.player.y, 120);

    // Panel background — use Artwork sprites
    const panelW = 380, panelH = 340;
    if (this.textures.exists('ui-bg')) {
      const panelBg = this.add.image(cx, cy, 'ui-bg').setDisplaySize(panelW, panelH).setDepth(2001).setScrollFactor(0).setAlpha(0.95);
      panelBg.setScale(0);
      this.tweens.add({ targets: panelBg, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });
    }
    if (this.textures.exists('ui-border')) {
      const panelBorder = this.add.image(cx, cy, 'ui-border').setDisplaySize(panelW + 10, panelH + 10).setDepth(2001).setScrollFactor(0).setAlpha(0.8);
      panelBorder.setScale(0);
      this.tweens.add({ targets: panelBorder, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });
    }
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a2e, this.textures.exists('ui-bg') ? 0 : 0.95).setDepth(2001).setScrollFactor(0)
      .setStrokeStyle(this.textures.exists('ui-border') ? 0 : 3, 0xef4444);
    panel.setScale(0);
    this.tweens.add({ targets: panel, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });

    // Title
    const title = this.add.text(cx, cy - 130, '💀 GAME OVER', {
      fontSize: '38px', color: '#ef4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 300, delay: 500 });

    // Stats
    const statsY = cy - 70;
    const statStyle = { fontSize: '16px', color: '#e5e7eb', stroke: '#000', strokeThickness: 2 };
    const valStyle = { fontSize: '16px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 };

    const statsData = [
      ['Score:', `${this.score}`],
      ['Wave Reached:', `${this.currentWave}`],
      ['Enemies Slain:', `${this.totalKills}`],
      ['Bosses Defeated:', `${this.bossesKilled}`],
      ['Best Combo:', `${this.comboCount}x`],
    ];

    statsData.forEach((pair, i) => {
      const row = this.add.text(cx - 140, statsY + i * 28, pair[0]!, statStyle)
        .setDepth(2002).setScrollFactor(0).setAlpha(0);
      const val = this.add.text(cx + 140, statsY + i * 28, pair[1]!, valStyle)
        .setOrigin(1, 0).setDepth(2002).setScrollFactor(0).setAlpha(0);
      this.tweens.add({ targets: [row, val], alpha: 1, duration: 200, delay: 600 + i * 80 });
    });

    // Equipment display
    const equipNames = Array.from(this.equipment.values()).map(e => e.name);
    if (equipNames.length > 0) {
      const eqText = this.add.text(cx, statsY + statsData.length * 28 + 10, `⚔️ ${equipNames.join(' | ')}`, {
        fontSize: '13px', color: '#a78bfa', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
      this.tweens.add({ targets: eqText, alpha: 1, duration: 200, delay: 1000 });
    }

    // Restart hint
    const restartText = this.add.text(cx, cy + 100, '[ R ] Restart', {
      fontSize: '18px', color: '#9ca3af', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: restartText, alpha: 1, duration: 200, delay: 1100 });
    this.tweens.add({ targets: restartText, alpha: 0.5, yoyo: true, repeat: -1, duration: 800, delay: 1300 });

    // Share to Reddit button
    this.time.delayedCall(1200, () => {
      this.createShareButton(cx, cy + 135, this.score, this.currentWave, false);
    });

    // Submit score and show rank
    this.submitScoreToServer(false, cx, cy + 160);

    if (this.onGameOverCallback) {
      this.onGameOverCallback(this.score, Math.floor(this.player.x / 64), Math.floor(this.player.y / 64));
    }
  }

  private handleVictory() {
    this.gameOver = true;
    this._won = true;
    this.playSfx('victory');

    // Clean up boss
    if (this.activeBoss) {
      this.destroyBossHPBar();
      this.activeBoss = null;
    }

    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Celebration effects
    this.cameras.main.flash(400, 50, 200, 50);
    for (let i = 0; i < 8; i++) {
      this.time.delayedCall(i * 200, () => {
        const fx = Phaser.Math.Between(0, 2);
        const rx = Phaser.Math.Between(80, 560);
        const ry = Phaser.Math.Between(80, 560);
        if (fx === 0) this.playMagicEffect('explosion', rx, ry, 70);
        else if (fx === 1) this.playMagicEffect('fire-ball', rx, ry, 60);
        else this.playMagicEffect('portal-fx', rx, ry, 60);
      });
    }

    // Overlay
    const overlay = this.add.rectangle(0, 0, 640, 640, 0x000000, 0.7).setOrigin(0, 0).setDepth(2000).setScrollFactor(0);
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 1, duration: 600 });

    // Panel — use Artwork UI
    const panelW = 400, panelH = 320;
    if (this.textures.exists('ui-bg')) {
      const panelBg = this.add.image(cx, cy, 'ui-bg').setDisplaySize(panelW, panelH).setDepth(2001).setScrollFactor(0).setAlpha(0.95);
      panelBg.setScale(0);
      this.tweens.add({ targets: panelBg, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });
    }
    if (this.textures.exists('ui-border')) {
      const panelBorder = this.add.image(cx, cy, 'ui-border').setDisplaySize(panelW + 10, panelH + 10).setDepth(2001).setScrollFactor(0).setAlpha(0.8);
      panelBorder.setScale(0);
      this.tweens.add({ targets: panelBorder, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });
    }
    const panel = this.add.rectangle(cx, cy, panelW, panelH, 0x0a1628, this.textures.exists('ui-bg') ? 0 : 0.95).setDepth(2001).setScrollFactor(0)
      .setStrokeStyle(this.textures.exists('ui-border') ? 0 : 3, 0x22c55e);
    panel.setScale(0);
    this.tweens.add({ targets: panel, scale: 1, duration: 400, delay: 300, ease: 'Back.easeOut' });

    // Title
    const title = this.add.text(cx, cy - 120, '🏆 VICTORY!', {
      fontSize: '44px', color: '#22c55e', fontStyle: 'bold', stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 300, delay: 500 });
    this.tweens.add({ targets: title, scale: 1.05, yoyo: true, repeat: -1, duration: 1200 });

    // Stats
    const statsY = cy - 60;
    const statStyle = { fontSize: '17px', color: '#e5e7eb', stroke: '#000', strokeThickness: 2 };
    const valStyle = { fontSize: '17px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 2 };
    const statsData = [
      ['Final Score:', `${this.score}`],
      ['Total Kills:', `${this.totalKills}`],
      ['Bosses Defeated:', `${this.bossesKilled}`],
    ];
    statsData.forEach((pair, i) => {
      const row = this.add.text(cx - 140, statsY + i * 30, pair[0]!, statStyle).setDepth(2002).setScrollFactor(0).setAlpha(0);
      const val = this.add.text(cx + 140, statsY + i * 30, pair[1]!, valStyle).setOrigin(1, 0).setDepth(2002).setScrollFactor(0).setAlpha(0);
      this.tweens.add({ targets: [row, val], alpha: 1, duration: 200, delay: 600 + i * 80 });
    });

    // Restart + share
    const restartText = this.add.text(cx, cy + 70, '[ R ] Play Again', {
      fontSize: '18px', color: '#9ca3af', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2002).setScrollFactor(0).setAlpha(0);
    this.tweens.add({ targets: restartText, alpha: 1, duration: 200, delay: 900 });
    this.tweens.add({ targets: restartText, alpha: 0.5, yoyo: true, repeat: -1, duration: 800, delay: 1100 });

    this.time.delayedCall(1000, () => {
      this.createShareButton(cx, cy + 105, this.score, this.currentWave, true);
    });

    // Submit score and show rank
    this.submitScoreToServer(true, cx, cy + 130);

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
    const award = (id: string, title: string, desc: string) => {
      if (!this.achievements.has(id)) {
        this.achievements.add(id);
        this.showAchievementBadge(title, desc);
      }
    };

    // Wave progression
    if (this.currentWave >= 5)  award('w5',  '🗡️ Survivor',      'Reached Wave 5');
    if (this.currentWave >= 10) award('w10', '⚔️ Veteran',       'Reached Wave 10');
    if (this.currentWave >= 15) award('w15', '💀 Undying',       'Reached Wave 15');
    if (this.currentWave >= 20) award('w20', '🏆 Champion',      'Completed All 20 Waves');

    // Kill milestones
    if (this.totalKills >= 10)  award('k10',  '🩸 First Blood',   'Slayed 10 Enemies');
    if (this.totalKills >= 50)  award('k50',  '⚔️ Slayer',        'Slayed 50 Enemies');
    if (this.totalKills >= 100) award('k100', '💀 Executioner',   'Slayed 100 Enemies');
    if (this.totalKills >= 200) award('k200', '☠️ Death Incarnate', 'Slayed 200 Enemies');

    // Boss kills
    if (this.bossesKilled >= 1) award('b1', '👑 Boss Hunter',    'Defeated First Boss');
    if (this.bossesKilled >= 3) award('b3', '🐉 Dragon Slayer',  'Defeated 3 Bosses');
    if (this.bossesKilled >= 5) award('b5', '⚡ Boss Destroyer', 'Defeated 5 Bosses');

    // Combo achievements
    if (this.comboCount >= 5)  award('c5',  '🔥 Combo Starter', '5x Kill Combo');
    if (this.comboCount >= 10) award('c10', '💥 Combo Master',  '10x Kill Combo');
    if (this.comboCount >= 20) award('c20', '🌟 Unstoppable',   '20x Kill Combo');

    // Score achievements
    if (this.score >= 5000)  award('s5k',  '⭐ Rising Star',   '5,000 Points');
    if (this.score >= 10000) award('s10k', '🌟 High Scorer',   '10,000 Points');
    if (this.score >= 25000) award('s25k', '💫 Score Legend',  '25,000 Points');
    if (this.score >= 50000) award('s50k', '✨ Score God',     '50,000 Points');

    // Equipment collection
    if (this.equipment.size >= 1) award('e1', '🛡️ Equipped',      'First Equipment');
    if (this.equipment.size >= 3) award('e3', '⚙️ Geared Up',     '3 Equipment Items');
    if (this.equipment.size >= 5) award('e5', '🎖️ Fully Loaded', '5 Equipment Items');

    // Perfect wave (no damage taken)
    if (this.waveStartHP > 0 && this.playerHP === this.waveStartHP && this.currentWave > 1) {
      award('perfect', '✨ Perfect Wave', 'No Damage Taken');
    }

    // Speed clear (wave under 30 seconds)
    const waveTime = (Date.now() - this.waveStartTime) / 1000;
    if (this.waveStartTime > 0 && waveTime < 30 && this.enemies.countActive() === 0 && this.currentWave > 1) {
      award('speed', '⚡ Speed Demon', 'Wave Under 30 Seconds');
    }

    // Class-specific achievements
    if (this.playerClass === 'warrior' && this.totalKills >= 50) {
      award('warrior50', '🛡️ True Warrior', '50 Kills as Warrior');
    }
    if (this.playerClass === 'rogue' && this.totalKills >= 50) {
      award('rogue50', '🗡️ Shadow Assassin', '50 Kills as Rogue');
    }
    if (this.playerClass === 'dark-knight' && this.totalKills >= 50) {
      award('dk50', '⚔️ Dark Champion', '50 Kills as Dark Knight');
    }
  }

  private async fetchGhosts() {
    try {
      const res = await fetch('/api/ghosts');
      if (!res.ok) return;
      const data = await res.json();
      // Limit to 10 most recent ghosts to avoid clutter
      const ghosts = (data.ghosts || []).slice(0, 10);
      ghosts.forEach((g: any) => {
        // Random offset to prevent overlapping labels when multiple deaths at same spot
        const offsetX = Phaser.Math.Between(-8, 8);
        const offsetY = Phaser.Math.Between(-8, 8);
        const gx = g.x * 64 + 32 + offsetX;
        const gy = g.y * 64 + 32 + offsetY;

        // Ghost marker — small translucent circle where players died
        const gs = this.add.circle(gx, gy, 10, 0xc4b5fd, 0.35);
        gs.setDepth(3);
        this.ghosts.add(gs);
        this.tweens.add({ targets: gs, y: gs.y - 8, yoyo: true, duration: 2000, repeat: -1, ease: 'Sine.easeInOut' });

        // Ghost username label
        const label = this.add.text(gx, gy - 20, g.username || '💀', {
          fontSize: '8px', color: '#c4b5fd', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(3).setAlpha(0.5);
        this.ghosts.add(label);
      });
    } catch (_err) {
      // Ghosts are optional — game works without backend
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOBILE TOUCH CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  private createTouchControls() {
    const camW = this.cameras.main.width;
    const camH = this.cameras.main.height;

    // ── Virtual Joystick (left side) ──
    const joyX = 100;
    const joyY = camH - 120;
    const joyRadius = 60;
    const thumbRadius = 28;
    const deadZone = 12; // pixels

    // Outer ring (direction indicator)
    const joyRing = this.add.circle(joyX, joyY, joyRadius + 4, 0x000000, 0)
      .setStrokeStyle(2, 0x888888, 0.3)
      .setDepth(3000).setScrollFactor(0);

    const joyBase = this.add.circle(joyX, joyY, joyRadius, 0x1a1a2e, 0.55)
      .setStrokeStyle(2, 0x4a4a6a, 0.6)
      .setDepth(3000).setScrollFactor(0);

    const joyThumb = this.add.circle(joyX, joyY, thumbRadius, 0x6366f1, 0.8)
      .setStrokeStyle(2, 0xa5b4fc, 0.6)
      .setDepth(3001).setScrollFactor(0);

    this.touchJoystick = {
      base: joyBase,
      thumb: joyThumb,
      ring: joyRing,
      baseX: joyX,
      baseY: joyY,
      radius: joyRadius,
      pointerId: -1,
      active: false,
      dx: 0,
      dy: 0,
      magnitude: 0
    };

    // ── Action Buttons (right side — diamond layout) ──
    const btnRadius = 30;
    const btnSpacing = 72;
    const centerX = camW - 90;
    const centerY = camH - 120;

    const classAbilityLabel: Record<string, string> = {
      warrior: '🛡️', rogue: '⚡', 'dark-knight': '🔥'
    };
    const classAbilityName: Record<string, string> = {
      warrior: 'SHIELD', rogue: 'FLURRY', 'dark-knight': 'FLAME'
    };

    const buttons = [
      // Top: Attack (primary — largest)
      { name: 'attack', color: 0xe74c3c, glow: 0xff6b6b, label: '⚔️', subLabel: 'ATK',
        x: centerX, y: centerY - btnSpacing * 0.6, radius: btnRadius + 4, hold: true },
      // Left: Dash
      { name: 'dash', color: 0x3498db, glow: 0x60b0f4, label: '💨', subLabel: 'DASH',
        x: centerX - btnSpacing * 0.7, y: centerY + btnSpacing * 0.15, radius: btnRadius, hold: false },
      // Right: Area ability
      { name: 'area', color: 0x9b59b6, glow: 0xc084fc, label: classAbilityLabel[this.playerClass] || '💥', subLabel: classAbilityName[this.playerClass] || 'AREA',
        x: centerX + btnSpacing * 0.7, y: centerY + btnSpacing * 0.15, radius: btnRadius, hold: false },
      // Bottom: Arrow
      { name: 'arrow', color: 0xf59e0b, glow: 0xfbbf24, label: '🏹', subLabel: 'ARROW',
        x: centerX, y: centerY + btnSpacing * 0.7, radius: btnRadius - 2, hold: false }
    ];

    buttons.forEach(btn => {
      // Shadow for depth
      this.add.circle(btn.x + 2, btn.y + 2, btn.radius, 0x000000, 0.3)
        .setDepth(2999).setScrollFactor(0);

      // Main button circle
      const circle = this.add.circle(btn.x, btn.y, btn.radius, btn.color, 0.65)
        .setStrokeStyle(2.5, btn.glow, 0.5)
        .setDepth(3000).setScrollFactor(0).setInteractive();

      // Emoji label
      const label = this.add.text(btn.x, btn.y - 3, btn.label, {
        fontSize: '22px'
      }).setOrigin(0.5).setDepth(3002).setScrollFactor(0);

      // Sub-label text
      this.add.text(btn.x, btn.y + btn.radius + 8, btn.subLabel, {
        fontSize: '8px', color: '#aaa', fontStyle: 'bold',
        stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(3001).setScrollFactor(0);

      // Cooldown overlay (Graphics object per button)
      const cooldownArc = this.add.graphics().setDepth(3003).setScrollFactor(0);

      this.touchButtons.set(btn.name, {
        circle,
        label,
        cooldownArc,
        pressed: false,
        held: false,
        pointerId: -1
      });
    });

    // ── Auto-Attack Toggle Button ──
    const aaBg = this.add.circle(0, 0, 18, 0x333333, 0.5)
      .setStrokeStyle(1.5, 0x666666, 0.4);
    const aaLabel = this.add.text(0, 0, 'AA', {
      fontSize: '11px', color: '#888', fontStyle: 'bold',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);
    this.autoAttackBtn = this.add.container(centerX, centerY - btnSpacing * 0.6 - 52, [aaBg, aaLabel])
      .setDepth(3004).setScrollFactor(0).setSize(36, 36).setInteractive();
    this.autoAttackBtn.on('pointerdown', () => {
      this.autoAttackEnabled = !this.autoAttackEnabled;
      aaBg.setFillStyle(this.autoAttackEnabled ? 0x22c55e : 0x333333, this.autoAttackEnabled ? 0.7 : 0.5);
      aaLabel.setColor(this.autoAttackEnabled ? '#fff' : '#888');
    });

    // ── Touch Event Handlers (multi-touch aware) ──
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.touchJoystick) return;

      // Check joystick area (generous hit zone — entire left half below HUD)
      if (pointer.x < camW * 0.4 && pointer.y > 350 && !this.touchJoystick.active) {
        this.touchJoystick.active = true;
        this.touchJoystick.pointerId = pointer.id;
        // Snap joystick base to touch if far from default position
        const distFromBase = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.touchJoystick.baseX, this.touchJoystick.baseY);
        if (distFromBase > joyRadius * 2) {
          const clampedX = Phaser.Math.Clamp(pointer.x, 50, camW * 0.35);
          const clampedY = Phaser.Math.Clamp(pointer.y, camH - 200, camH - 50);
          this.touchJoystick.baseX = clampedX;
          this.touchJoystick.baseY = clampedY;
          joyBase.setPosition(clampedX, clampedY);
          joyRing.setPosition(clampedX, clampedY);
          joyThumb.setPosition(clampedX, clampedY);
        }
        return;
      }

      // Check buttons (generous touch zones)
      this.touchButtons.forEach((btn, _name) => {
        const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, btn.circle.x, btn.circle.y);
        const hitRadius = (btn.circle as any).radius * 1.4;
        if (dist <= hitRadius && btn.pointerId < 0) {
          btn.pressed = true;
          btn.held = true;
          btn.pointerId = pointer.id;
          // Visual press feedback
          this.tweens.add({
            targets: btn.circle,
            scaleX: 0.85, scaleY: 0.85,
            duration: 60, ease: 'Quad.easeOut'
          });
          btn.circle.setAlpha(1);
          btn.circle.setStrokeStyle(3, 0xffffff, 0.8);
        }
      });
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.touchJoystick) return;
      if (this.touchJoystick.active && this.touchJoystick.pointerId === pointer.id) {
        const dx = pointer.x - this.touchJoystick.baseX;
        const dy = pointer.y - this.touchJoystick.baseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = joyRadius;

        // Apply dead zone
        if (dist < deadZone) {
          this.touchJoystick.dx = 0;
          this.touchJoystick.dy = 0;
          this.touchJoystick.magnitude = 0;
          joyThumb.setPosition(this.touchJoystick.baseX, this.touchJoystick.baseY);
          return;
        }

        // Speed curve: gentle ramp from dead zone to max
        const normalizedDist = Math.min((dist - deadZone) / (maxDist - deadZone), 1);
        const speedCurve = normalizedDist * normalizedDist; // quadratic curve
        this.touchJoystick.magnitude = speedCurve;

        if (dist > maxDist) {
          this.touchJoystick.dx = (dx / dist) * maxDist;
          this.touchJoystick.dy = (dy / dist) * maxDist;
        } else {
          this.touchJoystick.dx = dx;
          this.touchJoystick.dy = dy;
        }

        joyThumb.setPosition(
          this.touchJoystick.baseX + this.touchJoystick.dx,
          this.touchJoystick.baseY + this.touchJoystick.dy
        );
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.touchJoystick) return;
      if (this.touchJoystick.pointerId === pointer.id) {
        this.touchJoystick.active = false;
        this.touchJoystick.pointerId = -1;
        this.touchJoystick.dx = 0;
        this.touchJoystick.dy = 0;
        this.touchJoystick.magnitude = 0;
        joyThumb.setPosition(this.touchJoystick.baseX, this.touchJoystick.baseY);
        // Reset base position smoothly
        this.tweens.add({
          targets: [joyBase, joyRing, joyThumb],
          x: joyX, y: joyY, duration: 200, ease: 'Quad.easeOut',
          onUpdate: () => {
            this.touchJoystick!.baseX = joyBase.x;
            this.touchJoystick!.baseY = joyBase.y;
          }
        });
      }

      this.touchButtons.forEach((btn) => {
        if (btn.pointerId === pointer.id) {
          btn.held = false;
          btn.pointerId = -1;
          // Visual release feedback
          this.tweens.add({
            targets: btn.circle,
            scaleX: 1, scaleY: 1,
            duration: 80, ease: 'Quad.easeOut'
          });
          btn.circle.setAlpha(0.65);
          const btnDef = buttons.find(b => this.touchButtons.get(b.name) === btn);
          if (btnDef) {
            btn.circle.setStrokeStyle(2.5, btnDef.glow, 0.5);
          }
        }
      });
    });
  }

  private isTouchBtnPressed(name: string): boolean {
    const btn = this.touchButtons.get(name);
    if (btn && btn.pressed) {
      btn.pressed = false; // One-shot trigger
      return true;
    }
    return false;
  }

  private isTouchBtnHeld(name: string): boolean {
    const btn = this.touchButtons.get(name);
    return btn ? btn.held : false;
  }

  private updateMobileCooldowns() {
    if (!this.isMobile) return;
    const classStats = CLASS_STATS[this.playerClass];
    
    // Update cooldown arcs on buttons
    const cooldownMap: Record<string, { current: number; max: number }> = {
      'attack': { current: this.attackCooldown, max: classStats.attackRate },
      'dash': { current: this.dashCooldown, max: classStats.dashCooldown },
      'area': { current: this.areaCooldown, max: classStats.areaCooldown },
      'arrow': { current: this.attackCooldown, max: classStats.attackRate * 0.8 }
    };

    this.touchButtons.forEach((btn, name) => {
      if (!btn.cooldownArc) return;
      btn.cooldownArc.clear();
      const cd = cooldownMap[name];
      if (cd && cd.current > 0) {
        const pct = Math.min(cd.current / cd.max, 1);
        const cx = btn.circle.x;
        const cy = btn.circle.y;
        const r = (btn.circle as any).radius || 30;
        // Gray overlay
        btn.cooldownArc.fillStyle(0x000000, 0.5);
        btn.cooldownArc.slice(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct, true);
        btn.cooldownArc.fillPath();
        btn.cooldownArc.closePath();
        // Dim the button
        btn.circle.setAlpha(0.35);
      } else {
        if (btn.pointerId < 0) btn.circle.setAlpha(0.65);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOWLER.JS SOUND EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  private initializeSounds() {
    // Initialize Howler.js with EPIC retro sound effects
    // Increased volumes for maximum impact and energy
    this.sfx = {
      attack: new Howl({
        src: ['sounds/attack.ogg', 'sounds/attack.mp3'],
        volume: 0.6,  // Punchy sword slash
        html5: true
      }),
      hit: new Howl({
        src: ['sounds/hit.ogg', 'sounds/hit.mp3'],
        volume: 0.7,  // Strong impact
        html5: true
      }),
      kill: new Howl({
        src: ['sounds/kill.ogg', 'sounds/kill.mp3'],
        volume: 0.8,  // Dramatic kill sound
        html5: true
      }),
      dash: new Howl({
        src: ['sounds/dash.ogg', 'sounds/dash.mp3'],
        volume: 0.6,  // Powerful whoosh
        html5: true
      }),
      wave: new Howl({
        src: ['sounds/wave.ogg', 'sounds/wave.mp3'],
        volume: 0.9,  // Triumphant fanfare
        html5: true
      }),
      boss: new Howl({
        src: ['sounds/boss.ogg', 'sounds/boss.mp3'],
        volume: 0.85,  // Epic boss entrance (balanced)
        html5: true
      }),
      gameOver: new Howl({
        src: ['sounds/gameOver.ogg', 'sounds/gameOver.mp3'],
        volume: 0.9,  // Dramatic failure
        html5: true
      }),
      victory: new Howl({
        src: ['sounds/victory.ogg', 'sounds/victory.mp3'],
        volume: 0.9,  // Epic win (balanced)
        html5: true
      }),
      pickup: new Howl({
        src: ['sounds/pickup.ogg', 'sounds/pickup.mp3'],
        volume: 0.7,  // Satisfying collect
        html5: true
      })
    };

    // Global Howler settings
    if (typeof Howler !== 'undefined') {
      Howler.autoUnlock = true; // Auto-unlock audio on mobile
      Howler.html5PoolSize = 10; // Pool size for HTML5 Audio instances
    }

    // Initialize EPIC background music (looping)
    this.bgMusic = new Howl({
      src: ['sounds/bgmusic.ogg', 'sounds/bgmusic.mp3'],
      volume: 0.25,  // Audible but not overpowering SFX
      loop: true,
      html5: true,
      autoplay: true
    });
  }

  private playSfx(name: string) {
    if (this.soundEnabled && this.sfx[name]) {
      try {
        this.sfx[name].play();
      } catch (e) {
        // Silently ignore audio errors (file not found, etc.)
        console.warn(`Sound '${name}' failed to play:`, e);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT BADGE DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════
  private showAchievementBadge(title: string, desc: string) {
    this.badgeQueue.push({ title, desc });
    if (!this.badgeShowing) {
      this.displayNextBadge();
    }
  }

  private displayNextBadge() {
    if (this.badgeQueue.length === 0) {
      this.badgeShowing = false;
      return;
    }

    this.badgeShowing = true;
    const badge = this.badgeQueue.shift()!;
    const cx = this.cameras.main.width / 2;

    // Badge container
    const bg = this.add.rectangle(cx, -60, 280, 60, 0x1a1a2e, 0.95)
      .setStrokeStyle(2, 0xfbbf24)
      .setDepth(4000)
      .setScrollFactor(0);

    const titleText = this.add.text(cx, -70, badge.title, {
      fontSize: '18px', color: '#fbbf24', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(4001).setScrollFactor(0);

    const descText = this.add.text(cx, -50, badge.desc, {
      fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5).setDepth(4001).setScrollFactor(0);

    this.playSfx('pickup');

    // Slide in
    this.tweens.add({
      targets: [bg, titleText, descText],
      y: '+=100',
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Hold, then slide out
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: [bg, titleText, descText],
            y: '-=100',
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
              bg.destroy();
              titleText.destroy();
              descText.destroy();
              this.displayNextBadge();
            }
          });
        });
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOSS HP BAR (BOTTOM OF SCREEN)
  // ═══════════════════════════════════════════════════════════════════════════
  private createBossHPBar(template: BossTemplate, enraged: boolean) {
    this.destroyBossHPBar();
    const y = 548;
    const barW = 500;
    const barH = 14;
    const cx = 320;

    const barBg = this.add.rectangle(cx, y, barW + 6, barH + 6, 0x000000, 0.85)
      .setDepth(1010).setScrollFactor(0);
    const barBorder = this.add.rectangle(cx, y, barW + 6, barH + 6, 0x000000, 0)
      .setStrokeStyle(2, template.barColor).setDepth(1011).setScrollFactor(0);
    const barFill = this.add.rectangle(cx - barW / 2, y, barW, barH, template.barColor)
      .setOrigin(0, 0.5).setDepth(1012).setScrollFactor(0);

    const nameStr = `${template.emoji} ${template.name} — ${template.title} ${enraged ? '⚠️ ENRAGED' : ''}`;
    const nameText = this.add.text(cx, y - 16, nameStr, {
      fontSize: '13px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(1013).setScrollFactor(0);

    const phaseText = this.add.text(cx + barW / 2, y - 16, 'Phase 1', {
      fontSize: '11px', color: '#fbbf24', stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0.5).setDepth(1013).setScrollFactor(0);

    this.bossHPBarBg = barBg;
    this.bossHPBarFill = barFill;
    this.bossNameText = nameText;
    this.bossPhaseText = phaseText;
    this.bossBarContainer = [barBg, barBorder, barFill, nameText, phaseText];
  }

  private updateBossHPBar() {
    if (!this.activeBoss || !this.bossHPBarFill) return;
    const hp = this.activeBoss.getData('hp') || 0;
    const maxHp = this.activeBoss.getData('maxHp') || 1;
    const pct = Math.max(0, hp / maxHp);
    this.bossHPBarFill.width = 500 * pct;
    this.bossHPBarFill.setFillStyle(pct > 0.5 ? 0x22c55e : pct > 0.25 ? 0xf59e0b : 0xef4444);
    if (this.bossPhaseText) this.bossPhaseText.setText(`Phase ${this.bossPhase}`);
  }

  private destroyBossHPBar() {
    this.bossBarContainer.forEach(obj => obj.destroy());
    this.bossBarContainer = [];
    this.bossHPBarFill = undefined as any;
    this.bossHPBarBg = undefined as any;
    this.bossNameText = undefined as any;
    this.bossPhaseText = undefined as any;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // BOSS AI
  // ═══════════════════════════════════════════════════════════════════════════
  private updateBossAI(delta: number) {
    const boss = this.activeBoss!;
    if (!boss.active) { this.activeBoss = null; return; }

    const hp = boss.getData('hp') || 0;
    const maxHp = boss.getData('maxHp') || 1;
    const kind = boss.getData('bossKind') as BossKind;
    const speed = boss.getData('speed') || 100;
    const dist = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);

    // Phase transition at 50% HP
    if (this.bossPhase === 1 && hp <= maxHp * 0.5) {
      this.bossPhase = 2;
      this.cameras.main.flash(200, 255, 255, 255);
      this.cameras.main.shake(400, 0.03);
      boss.setTint(0xff6666);

      const phaseTxt = this.add.text(320, 280, '⚠️ PHASE 2 — ENRAGED!', {
        fontSize: '28px', color: '#ef4444', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
      }).setOrigin(0.5).setDepth(1005).setScrollFactor(0);
      this.tweens.add({ targets: phaseTxt, alpha: 0, y: 250, duration: 2000, onComplete: () => phaseTxt.destroy() });

      // Explosion effect on phase change
      this.playMagicEffect('explosion', boss.x, boss.y, 100);
    }

    // Movement — chase player
    if (dist > 30) {
      const chaseSpeed = this.bossPhase === 2 ? speed * 1.3 : speed;
      this.physics.moveToObject(boss, this.player, chaseSpeed);
      boss.setFlipX(boss.x > this.player.x);

      const animKey = `boss-${kind}-${this.bossPhase === 2 ? 'run' : 'walk'}-anim`;
      const curAnim = boss.anims.currentAnim?.key;
      if (curAnim !== animKey && !curAnim?.includes('attack') && !curAnim?.includes('hurt') && !curAnim?.includes('throw') && !curAnim?.includes('jump')) {
        if (this.anims.exists(animKey)) boss.play(animKey, true);
      }

      // Boss dust trail (small particles behind the boss while moving)
      if (Math.random() < (this.bossPhase === 2 ? 0.08 : 0.04)) {
        const dustX = boss.x + Phaser.Math.Between(-10, 10);
        const dustY = boss.y + 20;
        const dust = this.add.circle(dustX, dustY, Phaser.Math.Between(3, 6), 0xaa8855, 0.5).setDepth(8);
        this.tweens.add({ targets: dust, alpha: 0, scale: 0.3, y: dustY + 8, duration: 350, onComplete: () => dust.destroy() });
      }
    }

    // Boss ability timer
    this.bossAbilityTimer -= delta;
    if (this.bossAbilityTimer <= 0) {
      this.executeBossAbility(boss, kind, dist);
      const abilCD = this.bossPhase === 2 ? 2500 : 4000;
      this.bossAbilityTimer = abilCD;
    }

    // Boss melee attack
    if (dist < 50 && boss.getData('attackCooldown') <= 0) {
      const atkAnim = `boss-${kind}-attack1-anim`;
      if (this.anims.exists(atkAnim)) boss.play(atkAnim, true);

      if (this.invincible <= 0 && !this.activePowerUps.has('shield')) {
        // Rogue passive: 25% dodge chance vs boss melee
        if (this.playerClass === 'rogue' && Math.random() < 0.25) {
          const dodgeText = this.add.text(this.player.x, this.player.y - 40, 'DODGE!', {
            fontSize: '18px', color: '#a855f7', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({ targets: dodgeText, y: dodgeText.y - 30, alpha: 0, duration: 800, onComplete: () => dodgeText.destroy() });
          this.player.setAlpha(0.4);
          this.time.delayedCall(200, () => { if (this.player.active) this.player.setAlpha(1); });
        } else {
          const dmg = boss.getData('damage') || 15;
          this.playerHP -= dmg;
          this.cameras.main.shake(150, 0.02);
          this.invincible = 600;
          this.player.play(this.playerAnim('hurt'), true);
          const dt = this.add.text(this.player.x, this.player.y - 40, `-${dmg}`, {
            fontSize: '26px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
          }).setOrigin(0.5).setDepth(100);
          this.tweens.add({ targets: dt, y: dt.y - 35, alpha: 0, duration: 800, onComplete: () => dt.destroy() });
        }
      }
      boss.setData('attackCooldown', 1200);
    }

    let atkCD = boss.getData('attackCooldown') || 0;
    if (atkCD > 0) boss.setData('attackCooldown', atkCD - delta);

    // Update boss HP bar
    this.updateBossHPBar();
  }

  private executeBossAbility(boss: Phaser.Physics.Arcade.Sprite, kind: BossKind, _dist: number) {
    const abil = Phaser.Math.Between(1, this.bossPhase === 2 ? 4 : 3);

    switch (kind) {
      case 'pink': // BERSERKER
        if (abil === 1) {
          // Charge attack — run at player fast
          const chargeAnim = `boss-${kind}-run-anim`;
          if (this.anims.exists(chargeAnim)) boss.play(chargeAnim, true);
          this.physics.moveToObject(boss, this.player, 350);
          this.time.delayedCall(600, () => { if (boss.active) boss.setVelocity(0, 0); });
          this.playMagicEffect('rocks-fx', boss.x, boss.y, 80);
        } else if (abil === 2) {
          // Rock throw
          const throwAnim = `boss-${kind}-throw-anim`;
          if (this.anims.exists(throwAnim)) boss.play(throwAnim, true);
          this.time.delayedCall(200, () => {
            if (!boss.active) return;
            const rock = this.projectiles.create(boss.x, boss.y, `boss-${kind}-rock1`) as Phaser.Physics.Arcade.Sprite;
            rock.setDisplaySize(24, 24).setDepth(12);
            rock.setData('damage', boss.getData('damage'));
            rock.setData('element', 'none');
            rock.setData('isBossProjectile', true);
            this.physics.moveToObject(rock, this.player, 300);
            this.time.delayedCall(3000, () => { if (rock.active) rock.destroy(); });
          });
        } else if (abil === 3) {
          // Ground pound — jump then earth spike
          const jumpAnim = `boss-${kind}-jump-anim`;
          if (this.anims.exists(jumpAnim)) boss.play(jumpAnim, true);
          this.time.delayedCall(500, () => {
            if (!boss.active) return;
            this.cameras.main.shake(300, 0.03);
            this.playMagicEffect('earth-spike', this.player.x, this.player.y, 90);
            // Damage player if nearby
            const d = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
            if (d < 120 && this.invincible <= 0) {
              this.playerHP -= Math.floor(boss.getData('damage') * 1.5);
              this.invincible = 400;
            }
          });
        } else {
          // Phase 2: Walk+Attack frenzy
          const frenzyAnim = `boss-${kind}-walk_attack-anim`;
          if (this.anims.exists(frenzyAnim)) boss.play(frenzyAnim, true);
          this.physics.moveToObject(boss, this.player, 250);
          this.time.delayedCall(1000, () => { if (boss.active) boss.setVelocity(0, 0); });
        }
        break;

      case 'owlet': // ARCHMAGE
        if (abil === 1) {
          // Fire ball barrage
          const throwAnim = `boss-${kind}-throw-anim`;
          if (this.anims.exists(throwAnim)) boss.play(throwAnim, true);
          for (let i = 0; i < 3; i++) {
            this.time.delayedCall(i * 200, () => {
              if (!boss.active) return;
              const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y) + (i - 1) * 0.3;
              this.spawnBossProjectile(boss, angle, 'fire-ball', 250);
            });
          }
        } else if (abil === 2) {
          // Tornado summon
          const abilTiles = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles : this.floorTiles;
          const tile = abilTiles[Phaser.Math.Between(0, abilTiles.length - 1)];
          if (tile) {
            this.playMagicEffect('tornado-fx', tile.x, tile.y, 70, true, 5000);
            // Damage in area over time
            this.time.addEvent({
              delay: 500, repeat: 9,
              callback: () => {
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, tile.x, tile.y);
                if (d < 50 && this.invincible <= 0) {
                  this.playerHP -= 10;
                  this.invincible = 300;
                }
              }
            });
          }
        } else if (abil === 3) {
          // Teleport to random reachable tile
          const teleTiles = this.reachableFloorTiles.length > 0 ? this.reachableFloorTiles : this.floorTiles;
          const rTile = teleTiles[Phaser.Math.Between(0, teleTiles.length - 1)];
          if (rTile) {
            this.playMagicEffect('portal-fx', boss.x, boss.y, 80);
            boss.setAlpha(0);
            this.time.delayedCall(400, () => {
              if (!boss.active) return;
              boss.setPosition(rTile.x, rTile.y);
              boss.setAlpha(1);
              this.playMagicEffect('portal-fx', rTile.x, rTile.y, 80);
            });
          }
        } else {
          // Phase 2: Molten spear rain
          for (let i = 0; i < 4; i++) {
            this.time.delayedCall(i * 300, () => {
              const tx = this.player.x + Phaser.Math.Between(-80, 80);
              const ty = this.player.y + Phaser.Math.Between(-80, 80);
              // Warning indicator
              const warn = this.add.circle(tx, ty, 25, 0xff0000, 0.3).setDepth(5);
              this.tweens.add({ targets: warn, scale: 0.5, alpha: 0.8, duration: 500, onComplete: () => {
                warn.destroy();
                this.playMagicEffect('molten-spear', tx, ty, 70);
                const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty);
                if (d < 40 && this.invincible <= 0) {
                  this.playerHP -= 12;
                  this.invincible = 300;
                }
              }});
            });
          }
        }
        break;

      case 'dude': // TITAN
        if (abil === 1) {
          // Heavy slam + earth spikes
          const atkAnim = `boss-${kind}-attack2-anim`;
          if (this.anims.exists(atkAnim)) boss.play(atkAnim, true);
          this.time.delayedCall(400, () => {
            if (!boss.active) return;
            this.cameras.main.shake(400, 0.04);
            for (let i = 0; i < 4; i++) {
              const angle = (i / 4) * Math.PI * 2;
              const sx = boss.x + Math.cos(angle) * 80;
              const sy = boss.y + Math.sin(angle) * 80;
              this.playMagicEffect('earth-spike', sx, sy, 70);
            }
            // Area damage
            this.enemies.children.entries.forEach(() => {}); // no-op for enemies
            const d = Phaser.Math.Distance.Between(boss.x, boss.y, this.player.x, this.player.y);
            if (d < 120 && this.invincible <= 0) {
              this.playerHP -= Math.floor(boss.getData('damage') * 1.2);
              this.invincible = 500;
            }
          });
        } else if (abil === 2) {
          // Boulder push
          const pushAnim = `boss-${kind}-push-anim`;
          if (this.anims.exists(pushAnim)) boss.play(pushAnim, true);
          this.time.delayedCall(300, () => {
            if (!boss.active) return;
            const angle = Phaser.Math.Angle.Between(boss.x, boss.y, this.player.x, this.player.y);
            this.spawnBossProjectile(boss, angle, 'rocks-fx', 200);
          });
        } else if (abil === 3) {
          // Stomp — speed boost all enemies
          const jumpAnim = `boss-${kind}-jump-anim`;
          if (this.anims.exists(jumpAnim)) boss.play(jumpAnim, true);
          this.cameras.main.shake(500, 0.035);
          this.enemies.children.entries.forEach((obj) => {
            const e = obj as Phaser.Physics.Arcade.Sprite;
            if (e.active && e !== boss) {
              const spd = e.getData('speed') || 100;
              e.setData('speed', spd * 1.3);
              e.setTint(0xff8800);
              this.time.delayedCall(5000, () => {
                if (e.active) { e.setData('speed', spd); e.clearTint(); }
              });
            }
          });
        } else {
          // Phase 2: Rock armor
          boss.setTint(0x888888);
          boss.setData('armor', true);
          this.playMagicEffect('rocks-fx', boss.x, boss.y, 90, true, 8000);
          this.time.delayedCall(8000, () => {
            if (boss.active) { boss.clearTint(); boss.setData('armor', false); }
          });
        }
        break;
    }
  }

  private spawnBossProjectile(boss: Phaser.Physics.Arcade.Sprite, angle: number, effectName: string, speed: number) {
    const proj = this.physics.add.sprite(boss.x, boss.y, `${effectName}-1`).setDisplaySize(48, 48).setDepth(12);
    if (this.anims.exists(`${effectName}-anim`)) proj.play(`${effectName}-anim`);
    proj.setRotation(angle);  // Rotate sprite to face movement direction
    proj.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Boss projectile damages player
    this.physics.add.overlap(proj, this.player, () => {
      if (this.invincible <= 0 && !this.activePowerUps.has('shield')) {
        const dmg = boss.getData('damage') || 15;
        this.playerHP -= dmg;
        this.invincible = 400;
        this.cameras.main.shake(100, 0.015);
        this.player.play(this.playerAnim('hurt'), true);
        const dt = this.add.text(this.player.x, this.player.y - 40, `-${dmg}`, {
          fontSize: '22px', color: '#ff0000', fontStyle: 'bold', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);
        this.tweens.add({ targets: dt, y: dt.y - 30, alpha: 0, duration: 700, onComplete: () => dt.destroy() });
      }
      proj.destroy();
    });

    this.physics.add.collider(proj, this.walls, () => proj.destroy());
    this.time.delayedCall(4000, () => { if (proj.active) proj.destroy(); });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAGIC EFFECT HELPER
  // ═══════════════════════════════════════════════════════════════════════════
  private playMagicEffect(name: string, x: number, y: number, size: number, persistent = false, duration = 1000): Phaser.GameObjects.Sprite | null {
    const frameKey = `${name}-1`;
    if (!this.textures.exists(frameKey)) return null;

    const fx = this.add.sprite(x, y, frameKey).setDisplaySize(size, size).setDepth(99).setAlpha(0.85);
    const animKey = `${name}-anim`;
    const animExists = this.anims.exists(animKey);
    const isLooping = animExists && this.anims.get(animKey).repeat === -1;

    if (animExists) {
      fx.play(animKey);
      if (!persistent && !isLooping) {
        // Non-looping animation: destroy when complete
        fx.on('animationcomplete', () => {
          this.tweens.add({ targets: fx, alpha: 0, duration: 200, onComplete: () => fx.destroy() });
        });
      }
    }

    if (persistent) {
      // Persistent effects: destroy after explicit duration
      this.time.delayedCall(duration, () => {
        if (fx.active) this.tweens.add({ targets: fx, alpha: 0, duration: 300, onComplete: () => fx.destroy() });
      });
    } else if (isLooping || !animExists) {
      // Looping animations or no animation: always destroy after duration
      this.time.delayedCall(duration, () => {
        if (fx.active) this.tweens.add({ targets: fx, alpha: 0, duration: 200, onComplete: () => fx.destroy() });
      });
    }
    return fx;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TELEPORT SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  private checkTeleport() {
    if (this.teleportTiles.length < 2 || this.teleportCooldown > 0) return;

    for (let i = 0; i < this.teleportTiles.length; i++) {
      const tp = this.teleportTiles[i]!;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, tp.x, tp.y);
      if (dist < 25) {
        // Find the OTHER teleport tile
        const dest = this.teleportTiles[(i + 1) % this.teleportTiles.length]!;

        // Teleport effect at source
        this.playMagicEffect('portal-fx', tp.x, tp.y, 80);

        // Flash and teleport
        this.player.setAlpha(0);
        this.invincible = Math.max(this.invincible, 500);
        this.time.delayedCall(200, () => {
          this.player.setPosition(dest.x, dest.y);
          this.player.setAlpha(1);
          this.playMagicEffect('portal-fx', dest.x, dest.y, 80);
          this.cameras.main.flash(200, 100, 50, 200);
        });

        this.teleportCooldown = 3000;
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAUSE MENU
  // ═══════════════════════════════════════════════════════════════════════════
  private pauseGame() {
    if (this.gameOver || this.isPaused) return;
    this.isPaused = true;
    this.physics.pause();

    const cx = 320;
    const cy = 280;

    const overlay = this.add.rectangle(cx, cy, 640, 640, 0x000000, 0.7).setDepth(5000).setScrollFactor(0);

    // Panel background using Artwork
    const panelW = 360, panelH = 340;
    const panelParts: Phaser.GameObjects.GameObject[] = [];
    if (this.textures.exists('ui-bg')) {
      panelParts.push(this.add.image(cx, cy, 'ui-bg').setDisplaySize(panelW, panelH).setDepth(5000).setScrollFactor(0).setAlpha(0.95));
    } else {
      panelParts.push(this.add.rectangle(cx, cy, panelW, panelH, 0x1a1a2e, 0.95).setDepth(5000).setScrollFactor(0));
    }
    if (this.textures.exists('ui-border')) {
      panelParts.push(this.add.image(cx, cy, 'ui-border').setDisplaySize(panelW + 8, panelH + 8).setDepth(5000).setScrollFactor(0).setAlpha(0.8));
    }

    const title = this.add.text(cx, cy - 130, '⏸ PAUSED', {
      fontSize: '36px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 5
    }).setOrigin(0.5).setDepth(5001).setScrollFactor(0);

    const stats = [
      `Wave: ${this.currentWave}   Score: ${this.score}`,
      `Kills: ${this.totalKills}   Bosses: ${this.bossesKilled}`,
      `HP: ${Math.floor(this.playerHP)}/${this.maxHP + this.equipBonusHP}`,
    ];
    const statsTexts = stats.map((s, i) =>
      this.add.text(cx, cy - 50 + i * 25, s, {
        fontSize: '16px', color: '#ddd', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(5001).setScrollFactor(0)
    );

    // Equipment display with slot sprites
    const equipItems: Phaser.GameObjects.GameObject[] = [];
    const equipHeader = this.add.text(cx, cy + 30, '🎒 Equipment:', {
      fontSize: '14px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(5001).setScrollFactor(0);
    equipItems.push(equipHeader);

    let eqIdx = 0;
    this.equipment.forEach((item) => {
      const eqY = cy + 52 + eqIdx * 24;
      // Slot background sprite
      if (this.textures.exists('ui-slot')) {
        const slot = this.add.image(cx, eqY, 'ui-slot').setDisplaySize(300, 22).setDepth(5001).setScrollFactor(0).setAlpha(0.5);
        equipItems.push(slot);
      }
      const ri: Record<string, string> = { common: '⬜', rare: '🔷', epic: '🔶' };
      const rarityColors: Record<string, string> = { common: '#d4d4d4', rare: '#60a5fa', epic: '#f59e0b' };
      const eqText = this.add.text(cx, eqY, `${ri[item.rarity]} ${item.name} (+${item.value} ${item.stat})`, {
        fontSize: '12px', color: rarityColors[item.rarity] || '#ccc', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(5002).setScrollFactor(0);
      equipItems.push(eqText);
      eqIdx++;
    });
    if (eqIdx === 0) {
      const noEq = this.add.text(cx, cy + 52, 'None yet', {
        fontSize: '12px', color: '#777', stroke: '#000', strokeThickness: 2
      }).setOrigin(0.5).setDepth(5002).setScrollFactor(0);
      equipItems.push(noEq);
    }

    // Resume button — use Artwork button if available
    const resumeY = cy + 135;
    let resumeBtn: Phaser.GameObjects.GameObject;
    if (this.textures.exists('ui-btn1')) {
      resumeBtn = this.add.image(cx, resumeY, 'ui-btn1').setDisplaySize(200, 44).setDepth(5001).setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      (resumeBtn as Phaser.GameObjects.Image).on('pointerover', () => (resumeBtn as Phaser.GameObjects.Image).setTint(0xaaffaa));
      (resumeBtn as Phaser.GameObjects.Image).on('pointerout', () => (resumeBtn as Phaser.GameObjects.Image).clearTint());
    } else {
      resumeBtn = this.add.rectangle(cx, resumeY, 200, 40, 0x22c55e, 0.9)
        .setDepth(5001).setScrollFactor(0).setInteractive({ useHandCursor: true });
    }
    const resumeText = this.add.text(cx, resumeY, '▶ Resume (ESC)', {
      fontSize: '16px', color: '#fff', fontStyle: 'bold', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(5002).setScrollFactor(0);
    (resumeBtn as Phaser.GameObjects.Image).on('pointerdown', () => this.resumeGame());

    this.pauseOverlay = [overlay, ...panelParts, title, ...statsTexts, ...equipItems, resumeBtn, resumeText];
  }

  private resumeGame() {
    this.isPaused = false;
    this.physics.resume();
    this.pauseOverlay.forEach(obj => obj.destroy());
    this.pauseOverlay = [];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIGNETTE / SCREEN EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  private updateVignette() {
    if (!this.vignetteOverlay) return;

    const effectiveMaxHP = this.maxHP + this.equipBonusHP;
    const hpPct = this.playerHP / effectiveMaxHP;

    // Low HP: red pulse
    if (hpPct < 0.3 && hpPct > 0) {
      const pulse = 0.15 + Math.sin(Date.now() / 300) * 0.1;
      this.vignetteOverlay.setFillStyle(0xff0000, pulse);
    }
    // Boss active: colored vignette
    else if (this.activeBoss && this.activeBoss.active) {
      const bossColors: Record<BossKind, number> = { pink: 0xff69b4, owlet: 0x3b82f6, dude: 0xf59e0b };
      this.vignetteOverlay.setFillStyle(bossColors[this.bossKind] || 0x000000, 0.08);
    }
    // High combo: gold tint
    else if (this.comboCount >= 10) {
      this.vignetteOverlay.setFillStyle(0xfbbf24, 0.06);
    }
    else {
      this.vignetteOverlay.setAlpha(0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SCORE SUBMISSION & RANK DISPLAY
  // ═══════════════════════════════════════════════════════════════════════════
  private async submitScoreToServer(survived: boolean, labelX: number, labelY: number) {
    try {
      const body: any = {
        score: this.score,
        survived,
      };
      if (!survived) {
        body.deathPosition = {
          x: Math.floor(this.player.x / 64),
          y: Math.floor(this.player.y / 64)
        };
      }
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        // Show rank on screen
        if (data.rank) {
          const rankText = this.add.text(labelX, labelY, `🏅 Rank #${data.rank}`, {
            fontSize: '14px', color: '#fbbf24', fontStyle: 'bold', stroke: '#000', strokeThickness: 3
          }).setOrigin(0.5).setDepth(2003).setScrollFactor(0).setAlpha(0);
          this.tweens.add({ targets: rankText, alpha: 1, duration: 300, delay: 200 });
        }
        // Show streak
        if (data.streak?.isNewDay) {
          const streakText = this.add.text(labelX, labelY + 20, `🔥 ${data.streak.current} Day Streak!`, {
            fontSize: '12px', color: '#f97316', stroke: '#000', strokeThickness: 2
          }).setOrigin(0.5).setDepth(2003).setScrollFactor(0).setAlpha(0);
          this.tweens.add({ targets: streakText, alpha: 1, duration: 300, delay: 400 });
        }
      }
    } catch (_err) {
      // Score submission is best-effort; game works offline
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SHARE TO REDDIT
  // ═══════════════════════════════════════════════════════════════════════════
  private createShareButton(x: number, y: number, score: number, wave: number, won: boolean) {
    const btnBg = this.add.rectangle(x, y, 180, 36, 0xff4500, 1)
      .setDepth(2002)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    
    const btnText = this.add.text(x, y, '📤 Share to Reddit', {
      fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(2003).setScrollFactor(0);

    // Hover effects
    btnBg.on('pointerover', () => {
      btnBg.setFillStyle(0xff6030);
      btnText.setScale(1.05);
    });

    btnBg.on('pointerout', () => {
      btnBg.setFillStyle(0xff4500);
      btnText.setScale(1);
    });

    btnBg.on('pointerdown', async () => {
      // Disable immediately to prevent double-clicks
      btnBg.disableInteractive();
      btnText.setText('⏳ Sharing...');
      btnBg.setFillStyle(0x888888);

      try {
        await this.shareToReddit(score, wave, won);
        btnBg.setFillStyle(0x22c55e);
        btnText.setText('✓ Shared!');
      } catch (_err) {
        btnBg.setFillStyle(0xef4444);
        btnText.setText('✗ Failed');
        // Re-enable after 2s so user can retry
        this.time.delayedCall(2000, () => {
          btnBg.setFillStyle(0xff4500);
          btnText.setText('📤 Share to Reddit');
          btnBg.setInteractive({ useHandCursor: true });
        });
      }
    });
  }

  private async shareToReddit(score: number, wave: number, won: boolean): Promise<void> {
    const status = won ? '🏆 VICTORY' : `💀 Died on Wave ${wave}`;
    const emoji = won ? '🎉' : '⚔️';
    const classEmoji = this.playerClass === 'warrior' ? '🛡️' : 
                       this.playerClass === 'rogue' ? '🗡️' : '⚔️';
    
    const shareText = [
      `${emoji} Snoo's Dungeon Score: ${score.toLocaleString()} points!`,
      `${classEmoji} Class: ${this.playerClass.charAt(0).toUpperCase() + this.playerClass.slice(1)}`,
      `📊 ${status}`,
      `🏅 Badges: ${this.achievements.size}`,
      `💀 Kills: ${this.totalKills}`,
      '',
      'Can you beat my score? 🎮'
    ].join('\n');

    const res = await fetch('/api/share-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: shareText }),
    });
    if (!res.ok) throw new Error(`Share failed: ${res.status}`);
    this.playSfx('pickup');
  }
}
