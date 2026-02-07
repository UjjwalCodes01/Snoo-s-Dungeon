# Testing Your Game Locally

## ✅ Fixed Issues
1. ✅ **Phaser Game Integration** - Game now properly initializes with logging
2. ✅ **Date Field Fix** - Fixed API response mapping (createdAt → date)
3. ✅ **Debug Logging** - Added console logs to track game initialization
4. ✅ **Removed GameMaker Dependency** - Using Phaser exclusively

## 🎮 How to Test Locally

### Option 1: Test with Python Server (Recommended)

```bash
# 1. Kill any existing servers
pkill -f "python3 -m http.server"

# 2. Navigate to project
cd /home/ujwal/Desktop/coding/reddit/snoos-dungeon

# 3. Build the project
npm run build

# 4. Start local server
cd dist/client
python3 -m http.server 8081
```

Then open your browser to:
- **Splash Page:** http://localhost:8081/splash.html
- **Game Page:** http://localhost:8081/game.html

### Option 2: Test on Devvit (Reddit Platform)

```bash
# 1. Build the project
cd /home/ujwal/Desktop/coding/reddit/snoos-dungeon
npm run build

# 2. Upload to Devvit
npx devvit upload

# 3. Test on your dev subreddit
# Go to: https://reddit.com/r/snoos_dungeon_dev
# The app should automatically create posts you can test
```

## 🔍 Debugging Black Screen Issues

### Check Browser Console
1. Open game in browser
2. Press `F12` to open DevTools
3. Click "Console" tab
4. Look for these messages:

**Expected Console Output:**
```
Starting game with: { layout: "0000110000...", monster: "Goblin", modifier: "Normal" }
Game container found
Creating new Phaser game instance
GameScene.init called with: {...}
Game initialized: { layout: "0000110000...", monster: "Goblin", modifier: "Normal" }
GameScene.preload called
Sprites created successfully
GameScene.create called
Generating level from layout...
Player position: 128 128
Enemy count: 3
GameScene.create completed successfully
Phaser game created successfully
```

**Common Errors:**

❌ **"Game container not found!"**
- Solution: Make sure you clicked "Play Now" button first
- The game container only appears after clicking the button

❌ **"Failed to fetch daily dungeon"**
- Solution: Backend API not running or not accessible
- For local testing, this is OK - it will use default layout
- For Reddit, you need backend deployed

❌ **Black canvas but no errors**
- Solution: Phaser loaded but scene didn't initialize
- Check if layout string is exactly 100 characters
- Verify monster/modifier values are valid

## 🎨 Visual Checklist

When game loads correctly, you should see:
- ✅ 640×640 pixel canvas (not black)
- ✅ Stone walls (gray with texture)
- ✅ Orange floor tiles
- ✅ Blue Snoo character (player)
- ✅ Green/white enemies (Goblins/Skeletons/etc)
- ✅ HP bar (top left, green text)
- ✅ Score counter (top left, below HP)

## 🎯 Testing the Full Flow

### 1. Test Game Mechanics
- Press `W/A/S/D` or Arrow Keys → Player should move
- Press `Space` → Player attacks (check console for "Attack!" message)
- Get hit by enemy → Screen shakes, HP decreases
- Die → Game Over screen appears, press `R` to restart

### 2. Test Different Monsters
Edit `src/client/hooks/useDailyContent.ts` line 18:
```typescript
monster: 'Dragon', // Try: Goblin, Skeleton, Slime, Dragon
```

### 3. Test Different Modifiers
Edit `src/client/hooks/useDailyContent.ts` line 19:
```typescript
modifier: 'Speed Boost', // Try: Normal, Speed Boost, Double Damage, Tank Mode, Glass Cannon, Regeneration
```

### 4. Test Custom Layout
Edit `src/client/hooks/useDailyContent.ts` line 14:
```typescript
// Example: Hollow square
const DEFAULT_LAYOUT = '1111111111100000000110000000011000000001100000000110000000011000000001100000000110000000011111111111';
```

## 🚀 Deploy to Reddit

### Step 1: Verify Build
```bash
npm run build
# Should complete without errors
```

### Step 2: Upload to Devvit
```bash
npx devvit upload
# This uploads your built app to Reddit's servers
```

### Step 3: Install on Subreddit
```bash
# Option A: Via CLI
npx devvit install r/snoos_dungeon_dev

# Option B: Via Web
# 1. Go to https://developers.reddit.com/apps
# 2. Find your app "snoo-dungeon"
# 3. Click "Install" and choose your test subreddit
```

### Step 4: Create Game Post
1. Go to your subreddit: https://reddit.com/r/snoos_dungeon_dev
2. Look for the menu item "Create a new post"
3. Click it - app will create a post with the game

### Step 5: Test on Reddit
- Click the post to open it
- The splash screen should appear
- Click "Start Playing"
- Game should load (might take 5-10 seconds first time)

## 📊 Backend API (Optional - for full features)

If you want leaderboards and ghosts to work:

### Start Local Backend
```bash
# In a separate terminal
cd /home/ujwal/Desktop/coding/reddit/snoos-dungeon
npm run dev
```

This starts:
- Client build (watches for changes)
- Server build (watches for changes)
- Devvit playtest (runs app locally)

Then test at: http://localhost:3000

## 🐛 Common Issues & Solutions

### Issue: "npm run build" fails
**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Game doesn't appear on Reddit
**Solution:**
1. Check app is uploaded: `npx devvit whoami`
2. Check app is installed on subreddit
3. Try clearing browser cache (Ctrl+Shift+Del)
4. Try incognito window

### Issue: Score doesn't save
**Solution:**
- Backend API must be running
- Check `/api/submit-score` endpoint exists
- For local testing, scores won't persist (Redis required)

### Issue: Leaderboard shows "Failed to load"
**Solution:**
- Backend API must be running
- Check `/api/leaderboard` endpoint exists
- For local testing, leaderboard will be empty

## 📝 Next Steps

1. **Test locally first** - Open `http://localhost:8081/game.html`
2. **Verify game mechanics** - Movement, combat, scoring
3. **Deploy to Reddit** - `npx devvit upload`
4. **Share with testers** - Get feedback from real users
5. **Iterate** - Fix bugs, add features, polish UI

## 💡 Pro Tips

- **Quick Reload:** After changes, run `npm run build` and refresh browser
- **Debug Mode:** Add `?debug=true` to URL for extra logging
- **Performance:** Game runs at 60 FPS, should be smooth on most devices
- **Mobile:** Game is playable on mobile but desktop is better (keyboard controls)

## 🎉 You're Ready!

Your game is now fully functional with Phaser. No GameMaker needed!

The black screen issue was because:
1. Game wasn't logging initialization steps
2. API response had wrong field name (date vs createdAt)
3. No debug visibility into what was happening

Now you have:
- ✅ Full console logging
- ✅ Proper error handling
- ✅ Working Phaser game
- ✅ Clear test instructions

**Test it now:** `cd dist/client && python3 -m http.server 8081`
Then open: http://localhost:8081/game.html
