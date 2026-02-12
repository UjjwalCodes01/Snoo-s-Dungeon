# Snoo's Dungeon 🎮

A real-time dungeon crawler game built for Reddit with Phaser 3 and React.

## Overview

Snoo's Dungeon is an interactive dungeon crawling game deployed as a Reddit Devvit app. Players explore procedurally-generated dungeons, defeat enemies, collect power-ups, and face epic bosses across multiple waves.

**Subreddit:** [r/snooss_dungeon_dev](https://www.reddit.com/r/snooss_dungeon_dev/)

## Features

### Gameplay
- **Real-time Combat**: Attack, dash, area abilities, and ranged attacks
- **Multiple Character Classes**: Warrior, Rogue, Dark Knight with unique abilities
- **Enemy Variety**: Skeletons, vampires, and challenging bosses
- **Wave-Based Progression**: Increasing difficulty across encounters
- **Procedural Dungeons**: Randomly-generated level layouts
- **Leaderboard**: Compete with other players
- **Power-ups**: Collect temporary boosts (attack speed, damage, healing)

### Controls

#### Desktop
- **WASD/Arrow Keys**: Move
- **Space**: Attack
- **Q**: Shoot Arrow
- **Shift**: Dash
- **E**: Area Ability

#### Mobile
- **Left Side**: Virtual joystick for movement
- **Right Side**: Action buttons (Attack, Arrow, Dash, Area)
- **Multi-touch**: Move AND attack simultaneously

### Mobile Features
- Optimized UI for small screens
- 2x2 button grid layout for clear separation
- Multi-touch support (3+ simultaneous touches)
- Responsive scaling

## Project Structure

```
src/
├── client/              # Frontend React + Phaser
│   ├── game/           # React components
│   │   ├── App.tsx     # Main app wrapper
│   │   ├── GameEmbed.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── AdminPanel.tsx
│   │   └── TileEditor.tsx
│   ├── phaser/         # Phaser game engine
│   │   ├── GameScene.ts      # Core game logic
│   │   ├── index.ts          # Game initialization
│   ├── hooks/          # React hooks
│   └── public/         # Static assets (sprites, sounds)
│       └── sprites/    # Character/enemy sprites
│
├── server/             # Backend
│   ├── core/
│   │   ├── parser.ts   # Game data parsing
│   │   ├── storage.ts  # Data persistence
│   │   └── admin.ts    # Admin functions
│   └── index.ts        # Server entry point
│
└── shared/             # Shared types
    └── types/
        ├── api.ts      # API interfaces
        └── dungeon.ts  # Game data types
```

## Tech Stack

- **Phaser 3.86.0** - Game engine
- **React 18** - UI framework
- **TypeScript** - Type-safe development
- **Vite** - Build tool
- **Howler.js** - Sound effects
- **Reddit Devvit** - Platform

## Installation & Setup

### Prerequisites
- Node.js 16+
- npm or yarn
- Reddit Developer Account

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.template .env
   ```

3. **Run development server**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Deploy to Reddit

1. **Upload app**
   ```bash
   npx devvit upload
   ```

2. **Install to subreddit**
   ```bash
   npx devvit install r/YOUR_SUBREDDIT
   ```

## Game Mechanics

### Character Classes

| Class | Ability | Special | Attack Rate |
|-------|---------|---------|-------------|
| **Warrior** | Shield (🛡️) | High HP | Normal |
| **Rogue** | Flurry (⚡) | Speed boost | Fast |
| **Dark Knight** | Flame (🔥) | Fire damage | Normal |

### Combat System
- **Attack**: Melee damage with cooldown
- **Arrow**: Ranged projectile attack
- **Dash**: Quick movement to avoid enemies
- **Area Ability**: Class-specific AOE attack
- **Auto-Attack**: Toggle for holding attack

### Wave System
- Enemies spawn in waves
- Each wave increases difficulty
- Boss spawns at final wave
- Victory unlocks next level

### Power-ups
- **Attack Speed**: Faster attack rate
- **Damage Boost**: Increased damage
- **Healing**: Restore HP
- **Duration**: 10-15 seconds each

## Audio

Game includes epic retro-style sound effects:
- Attack/Arrow/Dash sounds
- Enemy hit/death effects
- Boss encounter theme
- Power-up jingle
- Game over sound

Audio managed with Howler.js for cross-browser compatibility.

## Asset Attribution

### Character Sprites
- Tiny RPG Character Asset Pack
- Sprout Lands Sprite Pack
- Custom vampire and dark knight sprites

### Sound Effects
- Original retro-style SFX
- Generated with audio synthesis

## Recent Updates (v0.0.24)

✅ **Fixed button triggering** - Attack and arrow no longer trigger together  
✅ **Multi-touch support** - Move and attack simultaneously on mobile  
✅ **Separate cooldowns** - Arrow has independent cooldown from attack  
✅ **Boss size optimization** - Reduced for better mobile experience  
✅ **Button layout redesign** - 2x2 grid for clear separation  

## Known Limitations

- WebGL requirement for browser compatibility
- Best played on devices with touch screen or mouse
- Devvit platform requires Reddit account
- Single-player only (shared leaderboard)

## Performance

- **Loading Time**: ~2-3 seconds (optimized asset loading)
- **Asset Count**: ~40 images (reduced from 130)
- **Touch Response**: <100ms
- **60 FPS** target on modern devices

## Troubleshooting

### Buttons triggering together
- Ensure v0.0.23+ is installed
- Clear Reddit app cache and refresh

### Movement not working
- Check browser supports touch events
- Try different browser if on web

### Sound not playing
- Check volume settings
- Verify audio files are loaded
- Try different browser

### Lag during gameplay
- Close other browser tabs
- Restart the game
- Clear browser cache

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run deploy       # Build + deploy to Reddit
npm run lint         # Check code quality
npm run type-check   # TypeScript validation
```

## Contributing

For bug reports or feature requests, please open an issue on the subreddit.

## License

Licensed under the terms in LICENSE file.

---

**Current Version**: v0.0.24  
**Last Updated**: February 2026  
**Status**: Active Development

Join the adventure at [r/snooss_dungeon_dev](https://www.reddit.com/r/snooss_dungeon_dev/)!
