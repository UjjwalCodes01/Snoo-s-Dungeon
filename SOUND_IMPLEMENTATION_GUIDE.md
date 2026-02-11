# Sound Implementation Guide - Replacing Procedural Audio

## 📋 Overview
This guide shows how to replace the current Web Audio API procedural sounds with high-quality audio files using Phaser's built-in sound system.

---

## 🎵 Option A: Using Phaser's Built-in Sound System (RECOMMENDED)

### Step 1: Download Sound Effects

**Recommended Sound Pack:** Kenney Digital Audio Pack
- Download: https://kenney.nl/assets/digital-audio
- License: CC0 (Public Domain)
- Format: .ogg and .wav
- Perfect for retro games

**Alternative:** Freesound.org
Search for these terms:
- "8-bit attack"
- "retro hit sound"
- "game over 8-bit"
- "victory fanfare"
- "dash whoosh"

### Step 2: Organize Sound Files

Create sound directory:
```bash
src/client/public/sounds/
├── attack.ogg
├── hit.ogg
├── kill.ogg
├── dash.ogg
├── wave.ogg
├── boss.ogg
├── gameOver.ogg
├── victory.ogg
└── pickup.ogg
```

**File Format Recommendations:**
- Use `.ogg` for web (best compression)
- Fallback to `.mp3` for Safari compatibility
- Avoid `.wav` (too large)

### Step 3: Update GameScene.ts

#### A. Remove Web Audio API Code

**DELETE** lines 2895-2975 (procedural sound generation):
```typescript
// Remove the entire generateSfx() method
```

#### B. Add Sound Loading in preload()

Add to `preload()` method around line 350:
```typescript
// ── Sound Effects ──
const sounds = ['attack', 'hit', 'kill', 'dash', 'wave', 'boss', 'gameOver', 'victory', 'pickup'];
sounds.forEach(name => {
  this.load.audio(name, `sounds/${name}.ogg`);
});
```

#### C. Add Sound Initialization in create()

Add to `create()` method around line 570:
```typescript
// ── Initialize Sounds ──
this.sfx = {
  attack: this.sound.add('attack', { volume: 0.3 }),
  hit: this.sound.add('hit', { volume: 0.4 }),
  kill: this.sound.add('kill', { volume: 0.5 }),
  dash: this.sound.add('dash', { volume: 0.3 }),
  wave: this.sound.add('wave', { volume: 0.6 }),
  boss: this.sound.add('boss', { volume: 0.7 }),
  gameOver: this.sound.add('gameOver', { volume: 0.8 }),
  victory: this.sound.add('victory', { volume: 0.8 }),
  pickup: this.sound.add('pickup', { volume: 0.5 })
};
```

#### D. Update playSfx() Method

Replace existing `playSfx()` around line 2970:
```typescript
private playSfx(name: string) {
  if (this.soundEnabled && this.sfx[name]) {
    try {
      (this.sfx[name] as Phaser.Sound.BaseSound).play();
    } catch (e) {
      // Silently ignore audio errors
    }
  }
}
```

---

## 🎵 Option B: Using Howler.js (Advanced)

### Step 1: Install Howler.js
```bash
npm install howler
npm install --save-dev @types/howler
```

### Step 2: Import Howler
Add to top of GameScene.ts:
```typescript
import { Howl } from 'howler';
```

### Step 3: Update Sound Initialization

Replace `generateSfx()` with:
```typescript
private initializeSounds() {
  this.sfx = {
    attack: new Howl({ src: ['sounds/attack.ogg'], volume: 0.3 }),
    hit: new Howl({ src: ['sounds/hit.ogg'], volume: 0.4 }),
    kill: new Howl({ src: ['sounds/kill.ogg'], volume: 0.5 }),
    dash: new Howl({ src: ['sounds/dash.ogg'], volume: 0.3 }),
    wave: new Howl({ src: ['sounds/wave.ogg'], volume: 0.6 }),
    boss: new Howl({ src: ['sounds/boss.ogg'], volume: 0.7 }),
    gameOver: new Howl({ src: ['sounds/gameOver.ogg'], volume: 0.8 }),
    victory: new Howl({ src: ['sounds/victory.ogg'], volume: 0.8 }),
    pickup: new Howl({ src: ['sounds/pickup.ogg'], volume: 0.5 })
  };
}
```

Call in `create()`:
```typescript
this.initializeSounds();
```

### Step 4: Update playSfx()
```typescript
private playSfx(name: string) {
  if (this.soundEnabled && this.sfx[name]) {
    try {
      (this.sfx[name] as Howl).play();
    } catch (e) {
      // Silently ignore audio errors
    }
  }
}
```

---

## 🎮 Advanced Features

### Sound Sprite Sheet (Multiple Sounds in One File)

**Benefits:**
- Faster loading (1 HTTP request instead of 9)
- Better mobile performance
- Reduced file size

**Implementation:**
```typescript
// In preload()
this.load.audio('sfxSprite', 'sounds/game-sounds.ogg');
this.load.json('sfxSpriteData', 'sounds/game-sounds.json');

// In create()
const spriteData = this.cache.json.get('sfxSpriteData');
this.sfxSprite = this.sound.addAudioSprite('sfxSprite', spriteData);

// In playSfx()
private playSfx(name: string) {
  if (this.soundEnabled && this.sfxSprite) {
    this.sfxSprite.play(name);
  }
}
```

**JSON Format (game-sounds.json):**
```json
{
  "resources": ["sounds/game-sounds.ogg"],
  "spritemap": {
    "attack": { "start": 0, "end": 0.2, "loop": false },
    "hit": { "start": 0.3, "end": 0.4, "loop": false },
    "kill": { "start": 0.5, "end": 0.8, "loop": false }
  }
}
```

---

## 🎧 Background Music

### Option 1: Simple Background Music
```typescript
// In preload()
this.load.audio('bgm', 'sounds/dungeon-theme.ogg');

// In create()
this.bgm = this.sound.add('bgm', { 
  volume: 0.2, 
  loop: true 
});
this.bgm.play();

// Pause on game over
private showGameOverScreen() {
  this.bgm.pause();
  // ... rest of code
}
```

### Option 2: Dynamic Music (Changes with Boss)
```typescript
// In preload()
this.load.audio('bgm-normal', 'sounds/normal.ogg');
this.load.audio('bgm-boss', 'sounds/boss-theme.ogg');

// In create()
this.bgmNormal = this.sound.add('bgm-normal', { volume: 0.2, loop: true });
this.bgmBoss = this.sound.add('bgm-boss', { volume: 0.3, loop: true });
this.bgmNormal.play();

// In spawnBoss()
private spawnBoss() {
  // ... existing code
  
  // Transition to boss music
  this.tweens.add({
    targets: this.bgmNormal,
    volume: 0,
    duration: 1000,
    onComplete: () => {
      this.bgmNormal.pause();
      this.bgmBoss.play();
    }
  });
}
```

---

## 🔊 Volume Controls

### Add Mute Button
```typescript
// In create()
const muteBtn = this.add.text(600, 10, this.soundEnabled ? '🔊' : '🔇', {
  fontSize: '24px'
}).setDepth(1000).setScrollFactor(0).setInteractive({ useHandCursor: true });

muteBtn.on('pointerdown', () => {
  this.soundEnabled = !this.soundEnabled;
  this.sound.mute = !this.soundEnabled;
  muteBtn.setText(this.soundEnabled ? '🔊' : '🔇');
});
```

### Volume Slider
```typescript
// Add to UI
const volumeSlider = this.add.rectangle(580, 40, 40, 10, 0x333333)
  .setDepth(1000).setScrollFactor(0).setInteractive();

volumeSlider.on('pointermove', (pointer: Phaser.Input.Pointer) => {
  if (pointer.isDown) {
    const vol = Phaser.Math.Clamp((pointer.x - 560) / 40, 0, 1);
    this.sound.volume = vol;
  }
});
```

---

## 🎯 Recommended Sound Mapping

### Your Current Sounds → Kenney Pack Equivalents

| Your Sound | Kenney File | Description |
|------------|-------------|-------------|
| `attack` | `pepSound1.ogg` | High-pitch blip |
| `hit` | `impactPunch_medium_001.ogg` | Short impact |
| `kill` | `explosionCrunch_000.ogg` | Crunchy explosion |
| `dash` | `swoosh.ogg` | Quick whoosh |
| `wave` | `powerUp12.ogg` | Success chime |
| `boss` | `lowDown.ogg` | Ominous tone |
| `gameOver` | `lowThreeTone.ogg` | Sad descent |
| `victory` | `highUp.ogg` | Triumphant ascent |
| `pickup` | `pickupCoin.ogg` | Coin pickup |

---

## 📦 Creating Sound Sprite (Advanced)

### Using Audiosprite Tool
```bash
# Install
npm install -g audiosprite

# Create sprite
audiosprite --output game-sounds --format howler sounds/*.ogg

# Generates:
# - game-sounds.ogg (combined audio)
# - game-sounds.json (timing data)
```

---

## 🐛 Troubleshooting

### Sound Not Playing on Mobile
```typescript
// Add user interaction trigger
this.input.once('pointerdown', () => {
  this.sound.unlock();
});
```

### iOS Autoplay Restrictions
```typescript
// Check if context is suspended
if (this.sound.context && this.sound.context.state === 'suspended') {
  this.sound.context.resume();
}
```

### Volume Too Loud
```typescript
// Global volume control
this.sound.volume = 0.5; // 50% of max

// Or per-sound
this.sfx.explosion.setVolume(0.3);
```

---

## 🚀 Quick Start Script

### Automated Setup
```bash
#!/bin/bash
# setup-sounds.sh

# Create directory
mkdir -p src/client/public/sounds

# Download Kenney Digital Audio Pack
curl -L "https://kenney.nl/content/3-assets/80-digital-audio/digitalaudio.zip" -o sounds.zip
unzip sounds.zip -d tmp/
mv tmp/Audio/*.ogg src/client/public/sounds/
rm -rf tmp sounds.zip

echo "✅ Sounds downloaded and organized!"
```

---

## 📊 Performance Comparison

| Method | Bundle Size | Load Time | Quality | Mobile |
|--------|-------------|-----------|---------|--------|
| **Web Audio (Current)** | 0 KB | Instant | ⭐⭐ | ⭐⭐⭐ |
| **Phaser Built-in** | ~100 KB | 0.5s | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Howler.js** | ~110 KB | 0.6s | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Sound Sprite** | ~50 KB | 0.3s | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## ✅ Recommended Implementation (Final)

**For Your Hackathon Game:**
1. Download Kenney Digital Audio Pack
2. Use Phaser's built-in sound system
3. Add 9 .ogg files to `public/sounds/`
4. Implement using Option A above
5. Add mute button for user control

**Why This Wins:**
- ✅ Professional quality sounds
- ✅ No extra dependencies
- ✅ Fast loading (~100 KB total)
- ✅ Works on mobile
- ✅ Easy to implement (30 minutes)

---

## 🎊 Next Steps

1. Download sounds from Kenney.nl
2. Replace procedural audio code
3. Test on desktop + mobile
4. Adjust volumes to taste
5. Add background music (optional)

**Estimated Time:** 30-60 minutes  
**Impact:** Massive UX improvement  
**Hackathon Boost:** +20% polish score
