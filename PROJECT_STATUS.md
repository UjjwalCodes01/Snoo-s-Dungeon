# Snoo's Ever-Shifting Dungeon - Project Status

## 🎯 Project Overview

**Game:** Snoo's Ever-Shifting Dungeon  
**Platform:** Reddit Devvit (Daily Games Hackathon)  
**Hackathon:** Jan 15 - Feb 12, 2026  
**Target Prizes:** Grand Prize ($15k), GameMaker Prize ($5k), User Contribution Prize ($3k)

---

## ✅ Completed Components

### Backend (100% Complete)

| Component | Status | File |
|-----------|--------|------|
| DungeonStorage | ✅ | `src/server/core/storage.ts` |
| CommentParser | ✅ | `src/server/core/parser.ts` |
| AdminHelper | ✅ | `src/server/core/admin.ts` |
| Post Helpers | ✅ | `src/server/core/post.ts` |
| Main Server | ✅ | `src/server/index.ts` |

**API Endpoints:**
- ✅ `GET /api/daily-dungeon` - Get today's dungeon data
- ✅ `POST /api/submit-score` - Submit player score
- ✅ `GET /api/leaderboard` - Get top players + user rank
- ✅ `GET /api/ghosts` - Get death position markers
- ✅ `POST /admin/set-submission-post` - Set submission post ID
- ✅ `GET /admin/submission-post` - Get current config
- ✅ `POST /admin/trigger-generation` - Manual dungeon generation
- ✅ `POST /internal/scheduler/generate-daily` - Midnight cron job

### Frontend (100% Complete)

| Component | Status | File |
|-----------|--------|------|
| App (Main View) | ✅ | `src/client/game/App.tsx` |
| GameEmbed (Iframe + Preview) | ✅ | `src/client/game/GameEmbed.tsx` |
| Leaderboard | ✅ | `src/client/game/Leaderboard.tsx` |
| GhostViewer | ✅ | `src/client/game/GhostViewer.tsx` |
| AdminPanel | ✅ | `src/client/game/AdminPanel.tsx` |
| SubmissionGuide | ✅ | `src/client/game/SubmissionGuide.tsx` |
| TileEditor | ✅ | `src/client/game/TileEditor.tsx` |
| Splash Screen | ✅ | `src/client/splash/splash.tsx` |
| useDailyContent Hook | ✅ | `src/client/hooks/useDailyContent.ts` |

### Documentation (100% Complete)

| Document | Status | File |
|----------|--------|------|
| GameMaker Guide | ✅ | `GAMEMAKER_GUIDE.md` |
| Backend Docs | ✅ | `BACKEND.md` |
| README | ✅ | `README.md` |
| Checklist | ✅ | `CHECKLIST.md` |

---

## 🔄 Remaining Work

### GameMaker Game Development (Requires Windows)

**Status:** 📋 Documented, awaiting implementation  
**Location:** See `GAMEMAKER_GUIDE.md` for complete step-by-step guide

#### Objects to Create:
- [ ] `obj_game_controller` - Main game manager
- [ ] `obj_wall` - Solid wall tile
- [ ] `obj_floor` - Walkable floor tile
- [ ] `obj_player` - Player character with movement/combat
- [ ] `obj_enemy` - Parent enemy class
- [ ] `obj_goblin` - Fast, weak enemy
- [ ] `obj_skeleton` - Balanced enemy
- [ ] `obj_slime` - Slow, tanky enemy
- [ ] `obj_dragon` - Boss enemy
- [ ] `obj_attack` - Player attack hitbox
- [ ] `obj_ghost` - Death marker

#### Scripts to Create:
- [ ] `generate_level()` - Parse layout string into tiles
- [ ] `submit_score()` - POST to API
- [ ] `fetch_ghosts()` - GET from API

#### Export & Host:
- [ ] Export to HTML5
- [ ] Test locally
- [ ] Host on GitHub Pages/Netlify
- [ ] Update `GameEmbed.tsx` with hosted URL

---

## 🔧 Integration Steps (After GameMaker)

### 1. Update GameEmbed.tsx

```typescript
// Change this line:
const gameUrl = ''; // Set this after GameMaker export

// To:
const gameUrl = 'https://yourusername.github.io/snoos-dungeon-game/index.html';
```

### 2. Rebuild and Deploy

```bash
npm run build
npx devvit upload
```

### 3. Test Full Flow

1. Open app on Reddit
2. Click "Start Playing"
3. Verify dungeon loads in iframe
4. Play game, die, check leaderboard updates
5. Test ghost markers appear for other users

---

## 📁 Project Structure

```
snoos-dungeon/
├── src/
│   ├── client/
│   │   ├── game/
│   │   │   ├── App.tsx           # Main game view with tabs
│   │   │   ├── GameEmbed.tsx     # Game iframe + mock preview
│   │   │   ├── Leaderboard.tsx   # Top 10 leaderboard
│   │   │   ├── GhostViewer.tsx   # Death marker stats
│   │   │   ├── AdminPanel.tsx    # Mod configuration
│   │   │   ├── SubmissionGuide.tsx # How to submit designs
│   │   │   ├── TileEditor.tsx    # Visual level editor
│   │   │   └── game.tsx          # Game entry point
│   │   ├── splash/
│   │   │   └── splash.tsx        # Entry splash screen
│   │   └── hooks/
│   │       └── useDailyContent.ts # API data hook
│   ├── server/
│   │   ├── core/
│   │   │   ├── storage.ts        # Redis operations
│   │   │   ├── parser.ts         # Comment parsing
│   │   │   ├── admin.ts          # Admin utilities
│   │   │   └── post.ts           # Post helpers
│   │   └── index.ts              # Express server
│   └── shared/
│       └── types/
│           ├── api.ts            # API type definitions
│           └── dungeon.ts        # Game type definitions
├── GAMEMAKER_GUIDE.md            # Complete GM implementation guide
├── BACKEND.md                    # Backend documentation
├── README.md                     # Project overview
└── CHECKLIST.md                  # Pre-launch checklist
```

---

## 🎮 Game Concept

**Daily Flow:**
1. Each day at midnight (UTC), a new dungeon generates
2. Dungeon is built from community-submitted room designs
3. Top-voted design from previous day's thread becomes today's dungeon
4. Players compete for high scores on the daily leaderboard
5. Death positions are recorded and shown as "ghosts" to other players

**Controls:**
- WASD / Arrow Keys: Move
- Space: Attack
- R: Restart (after game over)

**Modifiers:**
- Normal: No changes
- Speed Boost: 50% faster movement
- Double Damage: 2x attack power
- Tank Mode: 2x HP, slower movement
- Glass Cannon: Half HP, 3x damage
- Regeneration: Slow HP recovery

**Monsters:**
- Goblin: Fast, weak (HP: 25, DMG: 8)
- Skeleton: Balanced (HP: 40, DMG: 12)
- Slime: Slow, tanky (HP: 60, DMG: 5)
- Dragon: Boss (HP: 150, DMG: 20)

---

## 🏆 Hackathon Strategy

### GameMaker Sponsor Prize
- Using GameMaker specifically for sponsor preference
- Complete GML guide available in `GAMEMAKER_GUIDE.md`
- Credit GameMaker in submission

### User Contribution Prize
- Community designs become daily dungeons
- Easy submission format with templates
- Voting determines which design is selected

### Grand Prize
- Complete game loop with daily content
- Social features (ghosts, leaderboards)
- Polished UI with Reddit theming

---

## 📝 Quick Commands

```bash
# Development
npm run dev          # Run all watchers
npm run build        # Build for production

# Deployment
npx devvit upload    # Upload to Reddit
npx devvit playtest  # Local testing

# Type checking
npm run type-check   # TypeScript validation
npm run lint         # ESLint
```

---

## ⚠️ Known Limitations

1. **GameMaker on Linux:** GameMaker doesn't run natively on Linux. Implementation must be done on Windows.

2. **API Testing:** API endpoints can only be tested via `devvit playtest` - they run within Devvit's infrastructure, not as a standalone server.

3. **isModerator:** Currently hardcoded to `false` in `App.tsx`. Need to get from Devvit context when deploying.

---

## 🚀 Launch Checklist

- [x] Backend API complete
- [x] Frontend components complete
- [x] GameMaker documentation complete
- [x] Build passes with no errors
- [ ] GameMaker game implemented
- [ ] Game hosted on GitHub Pages
- [ ] GameEmbed updated with game URL
- [ ] Final testing on Reddit
- [ ] Submit to hackathon

---

**Last Updated:** Session in progress  
**Build Status:** ✅ Passing  
**TypeScript Errors:** 0
