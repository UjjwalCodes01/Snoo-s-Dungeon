import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, DailyDungeonResponse, SubmitScoreRequest, SubmitScoreResponse, LeaderboardResponse, GhostsResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { DungeonStorage } from './core/storage';
import { CommentParser } from './core/parser';
import { AdminHelper } from './core/admin';
import { validateLayout } from './core/mapValidator';
import { getCuratedMapForDate } from './data/curatedMaps';

const app = express();

// Middleware for JSON body parsing
app.use(express.json());
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true }));
// Middleware for plain text body parsing
app.use(express.text());

const router = express.Router();

// Dungeon API Endpoints

// Get today's dungeon layout, monster, and modifier
router.get('/api/daily-dungeon', async (_req, res) => {
  try {
    const dungeon = await DungeonStorage.getDailyDungeon();
    
    if (!dungeon) {
      res.status(404).json({ error: 'No dungeon available' });
      return;
    }
    
    const response: DailyDungeonResponse = {
      layout: dungeon.layout,
      monster: dungeon.monster,
      modifier: dungeon.modifier,
      createdAt: dungeon.createdAt
    };
    
    if (dungeon.submittedBy) {
      response.submittedBy = dungeon.submittedBy;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch daily dungeon:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon data' });
  }
});

// Submit player score and optional ghost position
router.post('/api/submit-score', async (req, res) => {
  try {
    const { score, survived, deathPosition } = req.body as SubmitScoreRequest;
    const username = context.username || 'Anonymous';
    
    // Submit score to leaderboard
    await DungeonStorage.submitScore(username, {
      username,
      score,
      timestamp: Date.now(),
      survived
    });
    
    // Add ghost if player died
    if (deathPosition) {
      await DungeonStorage.addGhost({
        x: deathPosition.x,
        y: deathPosition.y,
        username
      });
    }
    
    // Get player's rank
    const rank = await DungeonStorage.getUserRank(username);
    
    // Update streak when submitting score
    const streakResult = await DungeonStorage.updateStreak(username);
    
    const response: SubmitScoreResponse = {
      success: true,
      message: 'Score submitted successfully'
    };
    
    if (rank !== null) {
      response.rank = rank;
    }
    
    // Include streak info in response
    (response as any).streak = {
      current: streakResult.current,
      best: streakResult.best,
      isNewDay: streakResult.isNewDay
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to submit score:', error);
    res.status(500).json({ success: false, error: 'Failed to submit score' });
  }
});

// Get user's streak data
router.get('/api/streak', async (_req, res) => {
  try {
    const username = context.username || 'Anonymous';
    const streak = await DungeonStorage.getStreak(username);
    
    res.json({
      username,
      current: streak.current,
      best: streak.best,
      lastPlayed: streak.lastPlayed
    });
  } catch (error) {
    console.error('Failed to get streak:', error);
    res.status(500).json({ error: 'Failed to get streak data' });
  }
});

// Get leaderboard with user's rank
router.get('/api/leaderboard', async (_req, res) => {
  try {
    const username = context.username || '';
    
    const entries = await DungeonStorage.getLeaderboard(10);
    const userRank = username ? await DungeonStorage.getUserRank(username) : null;
    const totalPlayers = await DungeonStorage.getTotalPlayers();
    
    const response: LeaderboardResponse = {
      entries,
      totalPlayers
    };
    
    if (userRank !== null) {
      response.userRank = userRank;
    }
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Share score to Reddit as a comment on the post
router.post('/api/share-score', async (req, res) => {
  try {
    const { text } = req.body;
    const username = context.username || 'Anonymous';
    
    // Get the current post ID from context
    const postId = context.postId;
    
    if (postId && text) {
      // Post a comment to the dungeon post
      await reddit.submitComment({
        id: postId,
        text: `**${username}'s Score:**\n\n${text}`
      });
      
      res.json({ success: true, message: 'Score shared!' });
    } else {
      // Fallback: just acknowledge without posting
      res.json({ success: true, message: 'Share acknowledged' });
    }
  } catch (error) {
    console.error('Failed to share score:', error);
    res.status(500).json({ success: false, error: 'Failed to share score' });
  }
});

// Get ghost death positions for today's dungeon
router.get('/api/ghosts', async (_req, res) => {
  try {
    const ghosts = await DungeonStorage.getGhosts();
    
    const response: GhostsResponse = {
      ghosts
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch ghosts:', error);
    res.status(500).json({ error: 'Failed to fetch ghosts' });
  }
});

// Scheduler endpoint: Generate tomorrow's dungeon (Hybrid Voting System)
// 1. Check for top-voted community submission (≥5 upvotes, passes validation)
// 2. If none qualifies → fall back to curated map queue
router.post('/internal/scheduler/generate-daily', async (_req, res) => {
  try {
    const submissionPostId = await redis.get('config:submission_post_id');

    // ── Step 1: Try community submission ──
    if (submissionPostId) {
      try {
        const submissions = await CommentParser.getSubmissionsFromPost(submissionPostId);
        // Find highest-voted submission with ≥5 upvotes that passes validation
        const UPVOTE_THRESHOLD = 5;
        const qualified = submissions.filter(s => s.upvotes >= UPVOTE_THRESHOLD);

        if (qualified.length > 0) {
          const winner = qualified[0]!; // Already sorted by upvotes desc
          const validation = validateLayout(winner.layout);
          if (validation.valid) {
            await DungeonStorage.saveDailyDungeon({
              layout: winner.layout,
              monster: winner.monster,
              modifier: winner.modifier,
              createdAt: Date.now(),
              submittedBy: winner.author,
            });
            // Save today's winning submission info
            await redis.set('dungeon:today_source', JSON.stringify({
              source: 'community',
              author: winner.author,
              upvotes: winner.upvotes,
              commentId: winner.commentId,
            }));
            console.log(`✅ Community dungeon by u/${winner.author} (${winner.upvotes} upvotes)`);
            res.json({
              success: true,
              source: 'community',
              dungeon: { monster: winner.monster, modifier: winner.modifier, author: winner.author, upvotes: winner.upvotes },
            });
            return;
          } else {
            console.warn(`Top submission by u/${winner.author} failed validation: ${validation.reason}`);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch community submissions, falling back to curated:', err);
      }
    }

    // ── Step 2: Fall back to curated map queue ──
    const curatedMap = getCuratedMapForDate();
    await DungeonStorage.saveDailyDungeon({
      layout: curatedMap.layout,
      monster: curatedMap.monster,
      modifier: curatedMap.modifier,
      createdAt: Date.now(),
      submittedBy: `system:${curatedMap.name}`,
    });
    await redis.set('dungeon:today_source', JSON.stringify({
      source: 'curated',
      mapId: curatedMap.id,
      mapName: curatedMap.name,
    }));
    console.log(`📦 Curated dungeon: ${curatedMap.name} (#${curatedMap.id})`);
    res.json({
      success: true,
      source: 'curated',
      dungeon: { name: curatedMap.name, monster: curatedMap.monster, modifier: curatedMap.modifier },
    });
  } catch (error) {
    console.error('Failed to generate daily dungeon:', error);
    res.status(500).json({ success: false, error: 'Failed to generate dungeon' });
  }
});

// Admin endpoints (moderator only)

// Set submission post ID for daily dungeon generation
router.post('/admin/set-submission-post', async (req, res) => {
  try {
    // Check if user is moderator (basic security)
    // TODO: Fix moderator check - context.userType doesn't exist
    // const isModerator = context.userType === 'moderator';
    
    // if (!isModerator) {
    //   res.status(403).json({ error: 'Moderator access required' });
    //   return;
    // }
    
    const { postId } = req.body;
    
    if (!postId || typeof postId !== 'string') {
      res.status(400).json({ error: 'Invalid postId' });
      return;
    }
    
    const admin = new AdminHelper(redis);
    await admin.setSubmissionPostId(postId);
    
    res.json({ 
      success: true, 
      message: `Submission post set to: ${postId}` 
    });
  } catch (error) {
    console.error('Failed to set submission post:', error);
    res.status(500).json({ error: 'Failed to set submission post' });
  }
});

// Get current submission post ID
router.get('/admin/submission-post', async (_req, res) => {
  try {
    const admin = new AdminHelper(redis);
    const postId = await admin.getSubmissionPostId();
    
    res.json({ 
      postId,
      configured: !!postId
    });
  } catch (error) {
    console.error('Failed to get submission post:', error);
    res.status(500).json({ error: 'Failed to get submission post' });
  }
});

// Manually trigger dungeon generation (for testing)
router.post('/admin/trigger-generation', async (_req, res) => {
  try {
    const admin = new AdminHelper(redis);
    
    const postId = await admin.getSubmissionPostId();
    
    if (!postId) {
      // No submission post — use curated map directly
      const curated = getCuratedMapForDate();
      await DungeonStorage.saveDailyDungeon({
        layout: curated.layout,
        monster: curated.monster,
        modifier: curated.modifier,
        createdAt: Date.now(),
        submittedBy: `system:${curated.name}`,
      });
      res.json({
        success: true,
        source: 'curated',
        message: `Generated curated dungeon: ${curated.name}`,
      });
      return;
    }
    
    const topSubmission = await CommentParser.getTopSubmission(postId);
    
    if (topSubmission) {
      const validation = validateLayout(topSubmission.layout);
      if (validation.valid) {
        await DungeonStorage.saveDailyDungeon({
          ...topSubmission,
          createdAt: Date.now(),
          submittedBy: topSubmission.author,
        });
        res.json({ 
          success: true,
          source: 'community',
          message: 'Dungeon generated from community submission',
          dungeon: { monster: topSubmission.monster, modifier: topSubmission.modifier, author: topSubmission.author },
        });
      } else {
        // Community submission failed validation → use curated
        const curated = getCuratedMapForDate();
        await DungeonStorage.saveDailyDungeon({
          layout: curated.layout, monster: curated.monster, modifier: curated.modifier,
          createdAt: Date.now(), submittedBy: `system:${curated.name}`,
        });
        res.json({
          success: true,
          source: 'curated',
          message: `Top submission rejected (${validation.reason}). Used curated map: ${curated.name}`,
        });
      }
    } else {
      const curated = getCuratedMapForDate();
      await DungeonStorage.saveDailyDungeon({
        layout: curated.layout, monster: curated.monster, modifier: curated.modifier,
        createdAt: Date.now(), submittedBy: `system:${curated.name}`,
      });
      res.json({ 
        success: true,
        source: 'curated',
        message: `No valid submissions found. Used curated map: ${curated.name}`,
      });
    }
  } catch (error) {
    console.error('Failed to trigger generation:', error);
    res.status(500).json({ error: 'Failed to trigger generation' });
  }
});

// Get today's dungeon source info (community or curated)
router.get('/admin/dungeon-source', async (_req, res) => {
  try {
    const sourceData = await redis.get('dungeon:today_source');
    if (sourceData) {
      res.json(JSON.parse(sourceData));
    } else {
      res.json({ source: 'unknown', message: 'No source data recorded for today' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to get dungeon source' });
  }
});

// Validate a layout without submitting (for testing / preview)
router.post('/admin/validate-layout', async (req, res) => {
  try {
    const { layout } = req.body;
    if (!layout || typeof layout !== 'string') {
      res.status(400).json({ valid: false, reason: 'Layout string required' });
      return;
    }
    const result = validateLayout(layout);
    res.json({
      valid: result.valid,
      reason: result.reason,
      bossArena: result.bossArena,
      reachableTileCount: result.reachableTiles?.size,
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation error' });
  }
});

// Existing counter endpoints

router.get<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    if (!postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId,
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.get('/api/daily-content', async (_req, res): Promise<void> => {
  try {
    // Use the same endpoint as /api/daily-dungeon for consistency
    const dungeon = await DungeonStorage.getDailyDungeon();
    
    if (!dungeon) {
      res.status(404).json({ error: 'No dungeon available' });
      return;
    }
    
    res.json({
      layout: dungeon.layout,
      monster: dungeon.monster,
      modifier: dungeon.modifier,
      createdAt: dungeon.createdAt,
      submittedBy: dungeon.submittedBy
    });
  } catch (error) {
    console.error('Error fetching daily content:', error);
    res.status(500).json({ error: 'Failed to fetch daily content' });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
