# Snoo's Ever-Shifting Dungeon - Setup & Development Guide

## Overview

**Snoo's Ever-Shifting Dungeon** is a web-based dungeon crawler game built for Reddit's Daily Games Hackathon (deadline: February 12, 2026). The game combines a React-based UI with Phaser 3 for dynamic gameplay, featuring daily community-designed dungeons, leaderboards, and ghost tracking system.

### Key Features
- **Phaser 3 Game Engine**: HTML5 2D game with Arcade physics
- **React 18 UI**: Modern frontend with component-based architecture
- **Real-time Gameplay**: WASD/Arrow key movement, Space bar combat
- **Daily Dungeons**: Community-submitted dungeon layouts via Reddit comments
- **Leaderboard System**: Track top player scores with Redis backend
- **Ghost Markers**: Semi-transparent player death markers visible to others
- **Modifiers**: 5 gameplay modifiers (Speed Boost, Double Damage, Tank Mode, Glass Cannon, Regeneration)
- **Enemies**: 3 enemy types with varying stats and behaviors (Orc, Skeleton, Vampire)

### Prize Categories
- Grand Prize: $15,000
- GameMaker Prize: $5,000
- User Contribution Prize: $3,000

---

## Architecture

### Project Structure
```
Snoo-s-Dungeon/
├── src/
│   ├── client/                 # Frontend (React + Phaser)
│   │   ├── game/               # Game UI components
│   │   │   ├── AdminPanel.tsx
│   │   │   ├── App.tsx
│   │   │   ├── GameEmbed.tsx   # Main game container
│   │   │   ├── GhostViewer.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── SubmissionGuide.tsx
│   │   │   └── TileEditor.tsx
│   │   ├── hooks/
│   │   │   ├── useCounter.ts
│   │   │   └── useDailyContent.ts
│   │   ├── phaser/             # Game logic
│   │   │   ├── GameScene.ts    # Core game (500+ lines)
│   │   │   └── index.ts        # Phaser initialization
│   │   ├── splash/
│   │   │   └── splash.tsx      # Landing page
│   │   ├── public/             # Static assets
│   │   ├── game.html
│   │   ├── splash.html
│   │   ├── index.html
│   │   ├── index.css
│   │   ├── global.ts
│   │   ├── module.d.ts
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   ├── server/                 # Backend (Express + Redis)
│   │   ├── core/
│   │   │   ├── admin.ts        # Admin utilities
│   │   │   ├── parser.ts       # Comment parser for submissions
│   │   │   ├── post.ts         # Reddit post creation
│   │   │   └── storage.ts      # Redis storage layer
│   │   ├── index.ts            # Main API server
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── shared/                 # Shared types
│       └── types/
│           ├── api.ts
│           └── dungeon.ts
├── tools/
│   └── tsconfig-base.json
├── package.json
├── tsconfig.json
├── eslint.config.js
├── devvit.json
└── dist/                       # Build output
    ├── client/
    ├── server/
```

### Technology Stack
- **Frontend**: React 18, TypeScript, Vite, Phaser 3.86.0
- **Backend**: Express, Redis, Devvit API
- **Build**: Vite 6.2.4, TypeScript 5.x
- **Deployment**: Devvit platform for Reddit

---

## Installation & Setup

### Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for version control)
- **Python 3** (optional, only for local testing with http.server)

### ❌ DO NOT Install
- **GameMaker** - Not compatible with Linux, not used in this project
- **Phaser Studio** - Not required, configured via npm
- **Docker** - Not needed for development (optional for production)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-repo/Snoo-s-Dungeon.git
cd Snoo-s-Dungeon
```

### Step 2: Install Dependencies
```bash
npm install
```

This installs:
- **React 18** - UI framework
- **Phaser 3.86.0** - Game engine
- **Vite** - Build tool
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Devvit SDK** - Reddit integration

### Step 3: Verify Installation
```bash
npm run build
```

This builds both client and server. You should see:
```
> snoos-dungeon@0.0.0 build
> npm run build:client && npm run build:server
...
(!) Some chunks are larger than 500 kB after minification...
```

✅ **Build successful if no errors appear** (warnings about chunk size are acceptable)

---

## Running the Game

### Option 1: Development Mode (Recommended for Testing)

#### Build and Serve Locally
```bash
# Build the project
npm run build

# Start Python HTTP server on port 8081
cd dist/client
python3 -m http.server 8081
```

Then open your browser to: **http://localhost:8081/game.html**

#### Features in Local Mode
- Play the game with local data
- No backend connection required
- Uses fallback dungeon data (default 10x10 grid)
- All API calls return 404 (expected - backend not running)
- Game fully playable with all features functional

### Option 2: Start Backend Server (Full Integration)

#### Prerequisites
- **Redis** running locally or accessible at `localhost:6379`
- Reddit Devvit credentials (for production)

#### Build and Run Backend
```bash
# Build both client and server
npm run build

# Start the server (requires Redis)
npm start
```

The server runs on `http://localhost:3000` and provides:
- `/api/daily-dungeon` - Today's dungeon layout
- `/api/submit-score` - Submit player scores
- `/api/leaderboard` - Top 10 players
- `/api/ghosts` - Death markers from other players
- `/admin/` endpoints - Administrative functions

#### Connect Frontend to Backend
Open `src/client/hooks/useDailyContent.ts` and update API base URL from `localhost:8081` to your server address.

---

## Game Controls

### Movement
- **W / Up Arrow** - Move up
- **A / Left Arrow** - Move left
- **S / Down Arrow** - Move down
- **D / Right Arrow** - Move right

### Combat
- **Space Bar** - Attack (creates hitbox around player)

### Game Flow
- **▶ PLAY NOW** - Start the game (shows preview first)
- **Show Info** - Toggle dungeon info during gameplay
- **R** - Restart after game over

---

## Game Mechanics

### Player Stats
- **Base HP**: 100
- **Base Damage**: 10
- **Base Speed**: 200
- **Attack Cooldown**: 333ms
- **Invincibility**: 1000ms after taking damage (visual flicker)

### Enemies
| Enemy | HP | Damage | Speed | Attack Range |
|-------|----|----|-------|--------------|
| Orc | 45 | 10 | 100 | 200 |
| Skeleton | 35 | 20 | 180 | 180 |
| Vampire | 55 | 12 | 150 | 220 |

### Modifiers (Random, One Per Game)
- **Speed Boost**: +100 speed (300 total)
- **Double Damage**: +10 damage (20 total)
- **Tank Mode**: +100 HP (200 total), -50 speed (150 total)
- **Glass Cannon**: -50 HP (50 total), +20 damage (30 total)
- **Regeneration**: +0.05 HP per frame (~3 HP/sec)

### Level Design
- **100-character layout string**: `0` = wall, `1` = floor
- **Player spawns** on first floor tile
- **3 enemies spawn** on random floor tiles (or 1 dragon)
- **Walls**: Static obstacles that block movement
- **Ghosts**: Semi-transparent death markers from other players

### Scoring
- **Time-based**: `(Date.now() - startTime) / 100`
- Updates every frame
- Survives only if all enemies defeated

---

## API Endpoints

### GET `/api/daily-dungeon`
Returns today's dungeon layout and modifiers
```json
{
  "layout": "1111111111...",
  "monster": "goblin",
  "modifier": "speed-boost",
  "createdAt": 1707340800000,
  "submittedBy": "username"
}
```

### POST `/api/submit-score`
Save player score and optional death position
```json
{
  "score": 5432,
  "survived": true,
  "deathPosition": { "x": 320, "y": 240 }
}
```

### GET `/api/leaderboard`
Get top 10 players and user's rank
```json
{
  "entries": [
    { "rank": 1, "username": "player1", "score": 9999, "timestamp": 1707340800000 },
    ...
  ],
  "userRank": 5,
  "totalPlayers": 1234
}
```

### GET `/api/ghosts`
Get death markers from today's dungeon
```json
{
  "ghosts": [
    { "x": 320, "y": 240, "username": "player1" },
    { "x": 480, "y": 320, "username": "player2" }
  ]
}
```

---

## Development Workflow

### Build Commands
```bash
# Build both client and server
npm run build

# Build only client
npm run build:client

# Build only server
npm run build:server

# Lint code
npm run lint

# Type check
npm run type-check
```

### File Organization
- **GameScene.ts** (500+ lines) - All game logic in single file
  - Player controller
  - Enemy AI
  - Physics interactions
  - Scoring system
  - Callbacks to React

- **GameEmbed.tsx** - React wrapper with dual view modes
  - Preview mode (shows dungeon info)
  - Game mode (Phaser canvas)
  - State management
  - Lifecycle hooks

- **storage.ts** - Redis data layer
  - Leaderboard persistence
  - Ghost tracking
  - Daily dungeon management

---

## Debugging

### Common Issues

**Issue**: Game canvas not appearing
- **Cause**: `showPreview=true` stuck, game not created
- **Solution**: Check browser console for JavaScript errors, verify Phaser initialization in GameEmbed.tsx

**Issue**: API calls returning 404
- **Cause**: Backend server not running
- **Solution**: This is normal for local development. Game uses fallback data.

**Issue**: Build fails with TypeScript errors
- **Cause**: Type mismatches or missing exports
- **Solution**: Run `npm run type-check` to see all errors

**Issue**: Phaser canvas is blank
- **Cause**: Graphics creation failed or sprite generation error
- **Solution**: Check browser DevTools console for Phaser errors

### Useful Browser Console Commands
```javascript
// Get game instance
window.__gameInstance

// Check Phaser scene
window.__gameInstance?.scene.scenes[0]

// Check player position
window.__gameInstance?.scene.scenes[0].player?.body?.position
```

---

## Performance Optimization

### Current Stats
- **Client Bundle**: ~500KB (after minification)
- **Canvas Size**: 640x640 pixels
- **FPS Target**: 60 (Phaser default)
- **Physics**: Arcade (lighter than other engines)

### Tips for Optimization
1. Use dynamic imports for large components
2. Memoize React components with `React.memo()`
3. Use object pooling for particle effects
4. Disable graphics rotation when not needed in Phaser

---

## Deployment to Reddit

### Prerequisites
- Moderator/admin access to test subreddit
- Reddit Devvit CLI installed: `npm install -g devvit`

### Deployment Steps
```bash
# Login to Reddit
devvit auth login

# Upload extension
npx devvit upload

# Install on subreddit
# Follow CLI prompts to select subreddit

# Enable on subreddit
devvit config
```

### Pre-Deployment Checklist
- ✅ All TypeScript errors fixed
- ✅ Build completes without errors
- ✅ Game plays locally without backend
- ✅ All API endpoints return proper responses
- ✅ Leaderboard shows fallback data
- ✅ Ghost markers render correctly
- ✅ Restart functionality works (R key)

---

## Project Status

### ✅ Completed
- Phaser 3 game engine integration
- Complete game mechanics (movement, combat, AI)
- React component architecture
- TypeScript type safety (40+ errors fixed)
- Build system (Vite)
- API endpoint definitions
- Redis data layer
- Admin panel utilities
- Ghost system

### 🔄 In Progress
- Backend server testing
- Full leaderboard integration
- Daily dungeon generation from comments

### 🔲 TODO (Post-MVP)
- Mobile optimization (touch controls)
- Visual polish (particle effects, animations)
- Sound effects
- Performance optimization
- Cross-browser testing
- Final Reddit deployment

---

## Troubleshooting Quick Reference

| Problem | Solution |
|---------|----------|
| `npm install` fails | Delete `node_modules` and `package-lock.json`, run again |
| Port 8081 already in use | `lsof -i :8081` to find process, then `kill -9 <PID>` |
| Vite build hangs | Cancel with Ctrl+C, use http.server instead |
| Game canvas white/blank | Check browser console, verify graphics creation |
| Enemies not spawning | Check console for undefined floor tiles error |
| Can't move player | Verify keyboard event listeners, check physics enabled |
| Score not saving | Backend not running (expected), uses fallback |

---

## Resources

- [Phaser 3 Documentation](https://photonstorm.github.io/phaser3-docs/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Reddit Devvit Docs](https://developers.reddit.com/docs/reference/devvit)

---

## Contributing

When adding new features:
1. Keep game logic in GameScene.ts for physics/rendering
2. Keep UI logic in React components
3. Use TypeScript for type safety
4. Run `npm run lint` before committing
5. Test in local environment before deployment

---

## License

Copyright © 2026 Snoo's Dungeon Team. All rights reserved.

---

**Last Updated**: February 7, 2026
**Deadline**: February 12, 2026
**Days Remaining**: 5 days
