# 🎵 Sound Files Setup Guide

## ✅ Howler.js Successfully Installed!

Howler.js audio library has been integrated into your game. Now you need to add sound files.

---

## 📦 Quick Setup: Download FREE Sounds from Kenney.nl

### Option 1: Automated Download (Recommended)
```bash
chmod +x download-sounds.sh
./download-sounds.sh
```

### Option 2: Manual Download

1. **Visit Kenney Digital Audio Pack:**
   https://kenney.nl/assets/digital-audio

2. **Download the pack** (free, no account required)

3. **Extract and rename files:**

| Copy This File | Rename To | Sound Type |
|----------------|-----------|------------|
| `pepSound1.ogg` | `attack.ogg` | Player attack |
| `impactPunch_medium_001.ogg` | `hit.ogg` | Enemy hit |
| `explosionCrunch_000.ogg` | `kill.ogg` | Enemy death |
| `forceField_001.ogg` | `dash.ogg` | Dash movement |
| `powerUp12.ogg` | `wave.ogg` | Wave complete |
| `lowDown.ogg` | `boss.ogg` | Boss appears |
| `lowThreeTone.ogg` | `gameOver.ogg` | Game over |
| `highUp.ogg` | `victory.ogg` | Victory |
| `pickupCoin.ogg` | `pickup.ogg` | Item pickup |

4. **Place all renamed files in:**
   ```
   src/client/public/sounds/
   ```

---

## 🎧 Alternative Sound Sources

### Freesound.org (Free with Attribution)
1. Visit: https://freesound.org
2. Search for: "8-bit game sound", "retro sfx"
3. Download .ogg or .mp3 files
4. Rename to match the list above

### OpenGameArt.org (Various Licenses)
1. Visit: https://opengameart.org/art-search-advanced?keys=sound
2. Filter by: Sound Effects, License: CC0
3. Download and rename files

### Zapsplat (Free with Attribution)
1. Visit: https://www.zapsplat.com/sound-effect-category/game-sounds/
2. Create free account
3. Download game sound effects

---

## 🚀 Temporary Placeholder (Silent Sounds)

If you want to test immediately without sounds, run:

```bash
# Creates silent placeholder .ogg files
cd src/client/public/sounds/
for sound in attack hit kill dash wave boss gameOver victory pickup; do
  echo "data:audio/ogg;base64,T2dnUw==" | base64 -d > ${sound}.ogg
done
```

This prevents errors but you won't hear anything.

---

## 🎮 Testing Your Sounds

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Play the game** and listen for:
   - ⚔️ Attack sound when you hit Space
   - 💥 Hit sound when enemy takes damage
   - 💀 Kill sound when enemy dies
   - 💨 Dash sound when you press Shift
   - 🌊 Wave sound when wave completes
   - 👾 Boss sound when boss appears
   - 💀 Game over sound on death
   - 🏆 Victory sound on win
   - 🎁 Pickup sound for items

3. **Volume too loud/quiet?** Edit volumes in GameScene.ts:
   ```typescript
   // In initializeSounds() method
   attack: new Howl({
     src: ['sounds/attack.ogg'],
     volume: 0.3, // ← Change this (0.0 to 1.0)
     html5: true
   }),
   ```

---

## 🔧 Advanced: Add Background Music

Want music too? Add this to `initializeSounds()`:

```typescript
this.bgm = new Howl({
  src: ['sounds/background-music.ogg', 'sounds/background-music.mp3'],
  volume: 0.2,
  loop: true,
  html5: true
});

// Play music
this.bgm.play();
```

**Free Music Sources:**
- https://incompetech.com (Kevin MacLeod - CC BY)
- https://freemusicarchive.org (Various licenses)
- https://opengameart.org (Game music)

---

## 🎚️ Howler.js Features You Can Use

### Fade In/Out
```typescript
this.sfx.boss.fade(0, 1, 1000); // Fade from 0 to 1 over 1 second
```

### Stop a Sound
```typescript
this.sfx.victory.stop();
```

### Check if Playing
```typescript
if (this.sfx.boss.playing()) {
  console.log("Boss music is playing!");
}
```

### Global Mute
```typescript
Howler.mute(true); // Mute all sounds
```

### Global Volume
```typescript
Howler.volume(0.5); // Set all sounds to 50%
```

---

## 📋 File Structure

Your project should look like:
```
src/client/public/
├── sounds/
│   ├── attack.ogg
│   ├── hit.ogg
│   ├── kill.ogg
│   ├── dash.ogg
│   ├── wave.ogg
│   ├── boss.ogg
│   ├── gameOver.ogg
│   ├── victory.ogg
│   └── pickup.ogg
└── sprites/
    └── ... (your existing sprites)
```

---

## ✅ What Was Changed in GameScene.ts

1. ✅ **Added Howler.js import**
   ```typescript
   import { Howl } from 'howler';
   ```

2. ✅ **Updated sound type definition**
   ```typescript
   private sfx: Record<string, Howl> = {};
   ```

3. ✅ **Replaced Web Audio API with Howler**
   - Removed: `generateSfx()` method
   - Added: `initializeSounds()` method

4. ✅ **Updated `playSfx()` method**
   - Now uses `this.sfx[name].play()` instead of `this.sfx[name]()`

5. ✅ **Mobile-friendly settings**
   - `html5: true` for better mobile compatibility
   - `Howler.autoUnlock = true` for autoplay restrictions

---

## 🐛 Troubleshooting

### "Sound files not found" error
- Check files are in `src/client/public/sounds/`
- File names must match exactly (case-sensitive)
- Files must be .ogg or .mp3 format

### Sounds not playing on mobile
Add this to your game's first user interaction:
```typescript
// In GameScene create() method
this.input.once('pointerdown', () => {
  Howler.ctx.resume();
});
```

### Console warnings about files
This is normal if files don't exist yet. Game will still run, just silently.

---

## 🎊 You're Done!

Howler.js is now fully integrated. Download sounds from Kenney.nl and enjoy professional audio in your game!

**Questions?** Check the full guide in `SOUND_IMPLEMENTATION_GUIDE.md`
