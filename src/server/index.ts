import express from 'express';
import { InitResponse, IncrementResponse, DecrementResponse, DailyDungeonResponse, SubmitScoreRequest, SubmitScoreResponse, LeaderboardResponse, GhostsResponse } from '../shared/types/api';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post';
import { DungeonStorage } from './core/storage';
import { CommentParser } from './core/parser';
import { AdminHelper } from './core/admin';

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
    const storage = new DungeonStorage(redis);
    const dungeon = await storage.getDailyDungeon();
    
    const response: DailyDungeonResponse = {
      layout: dungeon.layout,
      monster: dungeon.monster,
      modifier: dungeon.modifier,
      date: storage.getTodayKey()
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch daily dungeon:', error);
    res.status(500).json({ error: 'Failed to fetch dungeon data' });
  }
});

// Submit player score and optional ghost position
router.post('/api/submit-score', async (req, res) => {
  try {
    const { score, deathPosition } = req.body as SubmitScoreRequest;
    const username = context.username || 'Anonymous';
    
    const storage = new DungeonStorage(redis);
    
    // Submit score to leaderboard
    await storage.submitScore(username, score);
    
    // Add ghost if player died
    if (deathPosition) {
      await storage.addGhost({
        x: deathPosition.x,
        y: deathPosition.y,
        username
      });
    }
    
    // Get player's rank
    const rank = await storage.getUserRank(username);
    
    const response: SubmitScoreResponse = {
      success: true,
      rank,
      score
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to submit score:', error);
    res.status(500).json({ success: false, error: 'Failed to submit score' });
  }
});

// Get leaderboard with user's rank
router.get('/api/leaderboard', async (_req, res) => {
  try {
    const username = context.username || '';
    const storage = new DungeonStorage(redis);
    
    const topPlayers = await storage.getLeaderboard(10);
    const userRank = username ? await storage.getUserRank(username) : null;
    const totalPlayers = await storage.getTotalPlayers();
    
    const response: LeaderboardResponse = {
      topPlayers,
      userRank,
      totalPlayers
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Get ghost death positions for today's dungeon
router.get('/api/ghosts', async (_req, res) => {
  try {
    const storage = new DungeonStorage(redis);
    const ghosts = await storage.getGhosts();
    
    const response: GhostsResponse = {
      ghosts
    };
    
    res.json(response);
  } catch (error) {
    console.error('Failed to fetch ghosts:', error);
    res.status(500).json({ error: 'Failed to fetch ghosts' });
  }
});

// Scheduler endpoint: Generate tomorrow's dungeon from top-voted comment
router.post('/internal/scheduler/generate-daily', async (_req, res) => {
  try {
    const parser = new CommentParser(reddit);
    const storage = new DungeonStorage(redis);
    
    // Configuration: Replace with actual submission post ID
    // This should be set via environment variable or Redis config
    const submissionPostId = await redis.get('config:submission_post_id');
    
    if (!submissionPostId) {
      console.warn('No submission post configured, using default dungeon');
      res.json({ success: true, message: 'No submission post configured' });
      return;
    }
    
    // Get top-voted dungeon submission
    const topSubmission = await parser.getTopSubmission(submissionPostId);
    
    if (topSubmission) {
      await storage.saveDailyDungeon(topSubmission);
      console.log(`Generated new daily dungeon: ${topSubmission.monster} with ${topSubmission.modifier}`);
      res.json({ 
        success: true, 
        dungeon: {
          monster: topSubmission.monster,
          modifier: topSubmission.modifier,
          author: topSubmission.author
        }
      });
    } else {
      console.warn('No valid submissions found, keeping current dungeon');
      res.json({ success: true, message: 'No valid submissions found' });
    }
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
    const isModerator = context.userType === 'moderator';
    
    if (!isModerator) {
      res.status(403).json({ error: 'Moderator access required' });
      return;
    }
    
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
    const isModerator = context.userType === 'moderator';
    
    if (!isModerator) {
      res.status(403).json({ error: 'Moderator access required' });
      return;
    }
    
    const parser = new CommentParser(reddit);
    const storage = new DungeonStorage(redis);
    const admin = new AdminHelper(redis);
    
    const postId = await admin.getSubmissionPostId();
    
    if (!postId) {
      res.status(400).json({ 
        error: 'No submission post configured. Use /admin/set-submission-post first.' 
      });
      return;
    }
    
    const topSubmission = await parser.getTopSubmission(postId);
    
    if (topSubmission) {
      await storage.saveDailyDungeon(topSubmission);
      res.json({ 
        success: true, 
        message: 'Dungeon generated successfully',
        dungeon: {
          monster: topSubmission.monster,
          modifier: topSubmission.modifier,
          author: topSubmission.author
        }
      });
    } else {
      res.json({ 
        success: false, 
        message: 'No valid submissions found' 
      });
    }
  } catch (error) {
    console.error('Failed to trigger generation:', error);
    res.status(500).json({ error: 'Failed to trigger generation' });
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
    const storage = new DungeonStorage(redis);
    const dungeon = await storage.getDailyDungeon();
    
    res.json({
      layout: dungeon.layout,
      monster: dungeon.monster,
      modifier: dungeon.modifier,
      date: storage.getTodayKey()
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
