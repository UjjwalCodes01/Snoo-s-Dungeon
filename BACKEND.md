# Snoo's Ever-Shifting Dungeon - API Documentation

## Backend API Endpoints

### Public Endpoints

#### GET `/api/daily-dungeon`
Get today's dungeon layout, monster, and modifier.

**Response:**
```json
{
  "layout": "0101010101...", // 100-character binary string
  "monster": "Goblin",
  "modifier": "Speed Boost",
  "date": "2026-01-20"
}
```

#### POST `/api/submit-score`
Submit player score and optional death position for ghost system.

**Request:**
```json
{
  "score": 1250,
  "deathPosition": {
    "x": 5,
    "y": 7
  }
}
```

**Response:**
```json
{
  "success": true,
  "rank": 42,
  "score": 1250
}
```

#### GET `/api/leaderboard`
Get top players, user's rank, and total players.

**Response:**
```json
{
  "topPlayers": [
    { "username": "player1", "score": 5000, "rank": 1 },
    { "username": "player2", "score": 4500, "rank": 2 }
  ],
  "userRank": 42,
  "totalPlayers": 1523
}
```

#### GET `/api/ghosts`
Get all death positions for today's dungeon.

**Response:**
```json
{
  "ghosts": [
    { "x": 5, "y": 7, "username": "player1" },
    { "x": 3, "y": 2, "username": "player2" }
  ]
}
```

### Admin Endpoints (Moderator Only)

#### POST `/admin/set-submission-post`
Configure which Reddit post to parse for community submissions.

**Request:**
```json
{
  "postId": "t3_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Submission post set to: t3_abc123"
}
```

#### GET `/admin/submission-post`
Get the currently configured submission post ID.

**Response:**
```json
{
  "postId": "t3_abc123",
  "configured": true
}
```

#### POST `/admin/trigger-generation`
Manually trigger dungeon generation from comments (for testing).

**Response:**
```json
{
  "success": true,
  "message": "Dungeon generated successfully",
  "dungeon": {
    "monster": "Dragon",
    "modifier": "Double Damage",
    "author": "u/gamedesigner123"
  }
}
```

### Internal Endpoints

#### POST `/internal/scheduler/generate-daily`
Scheduled job that runs at midnight (00:00) daily. Parses comments from the submission post and generates tomorrow's dungeon from the top-voted design.

## Setup Instructions

### 1. Configure Submission Post

After installing the app, create a daily submission post where users can share dungeon designs. Then configure it:

```bash
# Use the admin endpoint to set the post ID
curl -X POST https://your-app-url/admin/set-submission-post \
  -H "Content-Type: application/json" \
  -d '{"postId": "t3_YOUR_POST_ID"}'
```

### 2. Comment Format

Users should submit dungeons in this format:

```
Layout: 0101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101
Monster: Dragon
Modifier: Speed Boost
```

Or using code blocks:
```
```
0101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101010101
```
Monster: Skeleton
Modifier: Double Damage
```

### 3. Scheduler Configuration

The scheduler is configured in `devvit.json`:

```json
{
  "scheduler": {
    "tasks": {
      "generate-daily": {
        "endpoint": "/internal/scheduler/generate-daily",
        "cron": "0 0 * * *"
      }
    }
  }
}
```

This runs at midnight UTC every day, parsing the previous day's submissions and selecting the top-voted design for today's dungeon.

### 4. Redis Data Structure

All data is stored with 7-day TTL:

- `dungeon:YYYY-MM-DD` - Daily dungeon layout (JSON)
- `leaderboard:YYYY-MM-DD` - Sorted set of player scores
- `ghosts:YYYY-MM-DD` - Set of death positions (JSON)
- `config:submission_post_id` - Current submission post ID (permanent)

### 5. GameMaker Integration

The GameMaker game should:

1. Fetch dungeon data from `/api/daily-dungeon`
2. Parse the 100-character layout string (0=wall, 1=floor)
3. Generate level procedurally
4. On player death/win, POST to `/api/submit-score`
5. Fetch ghosts from `/api/ghosts` for rendering
6. Fetch leaderboard from `/api/leaderboard` for UI

## Testing

### Manual Trigger
```bash
# Test the generation process
curl -X POST https://your-app-url/admin/trigger-generation
```

### Check Current Dungeon
```bash
curl https://your-app-url/api/daily-dungeon
```

### Submit Test Score
```bash
curl -X POST https://your-app-url/api/submit-score \
  -H "Content-Type: application/json" \
  -d '{"score": 1000, "deathPosition": {"x": 5, "y": 5}}'
```

## Deployment Workflow

Since you're working locally and your friend uploads:

1. Code locally in VS Code
2. Run `npm run build` to verify
3. Commit and push to GitHub
4. Friend pulls from GitHub
5. Friend runs `devvit upload` from their account
6. Friend enables the app on the subreddit

## Architecture

```
┌─────────────────┐
│  React Client   │ ← Tile Editor, Game Embed
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Express Server │ ← API Routes
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌──────────┐
│ Redis │ │  Reddit  │
│Storage│ │   API    │
└───────┘ └──────────┘
```

## Next Steps

1. ✅ Backend API complete
2. ⏳ GameMaker game development
3. ⏳ Frontend integration testing
4. ⏳ Mobile optimization
5. ⏳ Production deployment
