# 🎨 Sprite Assets Guide

## Step 1: Download Free Sprite Packs

### Recommended: Kenney's Asset Packs (Best Quality, No Attribution Required!)

**Download these packs:**

1. **Tiny Dungeon Pack** (Perfect for your game!)
   - Link: https://kenney.nl/assets/tiny-dungeon
   - Click "Download" button (it's FREE!)
   - Contains: Heroes, monsters, tiles, items
   - Size: ~1MB

2. **Micro Roguelike** (Alternative, more pixel art style)
   - Link: https://kenney.nl/assets/micro-roguelike
   - More retro pixel look
   - Great enemy variety

3. **1-Bit Pack** (Minimal black/white style)
   - Link: https://kenney.nl/assets/bit-pack
   - Clean, simple aesthetic
   - Fast to integrate

### Alternative Sources:

**OpenGameArt.org**
- Search: "dungeon sprite sheet"
- Filter by: CC0 (Public Domain)
- Link: https://opengameart.org/

**itch.io**
- Search: "free dungeon sprites"
- Many creators allow game jam use
- Link: https://itch.io/game-assets/free

---

## Step 2: Extract and Organize Sprites

After downloading, extract the ZIP file and find these files:

### What You Need:

1. **Player Character Sprite Sheet**
   - File with multiple frames of character (idle, walk, attack)
   - Usually named: `knight.png`, `hero.png`, `character.png`
   - Size: Usually 16x16 or 32x32 pixels per frame

2. **Enemy Sprite Sheets**
   - Goblin, skeleton, slime sprites
   - Multiple frames for animation
   - Usually: `goblin.png`, `skeleton.png`, etc.

3. **Tileset** (Optional - can improve later)
   - Floor and wall tiles
   - File: `tileset.png` or `dungeon-tiles.png`

---

## Step 3: Place Files in Project

### Required File Structure:

```
snoos-dungeon/
  src/
    client/
      public/
        sprites/              <- CREATE THIS FOLDER
          player.png          <- Your player sprite sheet
          goblin.png          <- Enemy sprite
          skeleton.png        <- Enemy sprite
          slime.png           <- Enemy sprite
          dragon.png          <- Boss sprite (optional)
          tiles.png           <- Floor/wall tiles (optional)
```

### Copy Commands:

After downloading Kenney's Tiny Dungeon pack:

```bash
# Navigate to your project
cd /home/ujwal/Desktop/coding/reddit/snoos-dungeon/src/client/public/sprites

# Copy sprite files from downloaded pack
# (adjust path based on where you extracted the ZIP)
cp ~/Downloads/tinyDungeon_*.png ./

# Or manually:
# 1. Open file manager
# 2. Navigate to Downloads/kenney-tiny-dungeon/
# 3. Copy PNG files to: snoos-dungeon/src/client/public/sprites/
```

---

## Step 4: Sprite Sheet Format

### What is a Sprite Sheet?

A sprite sheet is a single image file containing multiple frames:

```
[Frame 1][Frame 2][Frame 3][Frame 4]
  Idle     Walk1    Walk2    Attack
```

### Frame Information Needed:

For each sprite sheet, note:
- **Frame Width**: Width of one frame (e.g., 16px or 32px)
- **Frame Height**: Height of one frame (e.g., 16px or 32px)
- **Total Frames**: How many frames in the sheet

Example:
- `player.png` = 128px wide, 32px tall
- Frame size = 32x32
- Total frames = 4 (128 ÷ 32)

---

## Step 5: Quick Start Files (If No Download Yet)

### Placeholder Sprites

If you want to test the code before downloading, I can:
1. Generate simple placeholder sprites
2. Test the animation system
3. Swap in real sprites later

**Or** you can use these quick free options:

### Browser-Based Sprite Creator (5 minutes):

**Piskel** - https://www.piskelapp.com/
1. Create 32x32 pixel sprites
2. Draw 4 frames (idle, walk, attack, death)
3. Export as sprite sheet
4. Save to `public/sprites/` folder

### AI-Generated Sprites (1 minute):

Use **DALL-E Mini** or **Stable Diffusion**:
- Prompt: "pixel art game character sprite sheet, 32x32, 4 frames, dungeon crawler"
- Download and crop to frames

---

## Step 6: Sprite Specifications for This Game

### Recommended Sizes:

**Player:**
- Frame size: 32x32 or 48x48 pixels
- Animations needed:
  - Idle: 1-2 frames
  - Walk: 2-4 frames
  - Attack: 2-4 frames
  - Death: 3-6 frames (optional)

**Enemies:**
- Frame size: 24x24 or 32x32 pixels
- Animations:
  - Idle: 1-2 frames
  - Walk: 2-4 frames
  - Death: 2-4 frames

**Tiles:**
- Size: 64x64 pixels (current tile size)
- Can be single images or sprite sheets

---

## Step 7: Naming Convention

Save files with these exact names (or I'll update code to match):

```
player.png          - Main character
enemy-goblin.png    - Green enemy
enemy-skeleton.png  - White enemy
enemy-slime.png     - Fast enemy
enemy-dragon.png    - Boss enemy
tile-floor.png      - Floor tile
tile-wall.png       - Wall tile
```

---

## Quick Test After Setup

After placing sprites, run:

```bash
cd /home/ujwal/Desktop/coding/reddit/snoos-dungeon
npm run build
```

Then refresh browser - sprites should load automatically!

---

## 🎯 Action Items for You:

1. ✅ **Download** Kenney's Tiny Dungeon pack (2 minutes)
2. ✅ **Extract** the ZIP file (1 minute)
3. ✅ **Copy** sprite PNG files to `src/client/public/sprites/` (2 minutes)
4. ✅ **Note** frame widths/heights from sprite sheets
5. ✅ **Tell me** which files you placed and their frame sizes
6. ✅ I'll update the code to load and animate them!

---

## Need Help?

**If you get stuck:**
- Tell me which pack you downloaded
- Share the file names you see
- I'll help configure the exact settings

**Don't want to download?**
- I can generate placeholder sprites
- Or use emoji-style sprites temporarily
- Switch to real sprites later

Let me know when you've downloaded the sprites or if you need help! 🚀
