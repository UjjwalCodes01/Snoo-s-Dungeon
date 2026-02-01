import { redis } from '@devvit/web/server';
import { DungeonLayout, PlayerScore, GhostPosition, LeaderboardEntry } from '../../shared/types/dungeon';

/**
 * Redis key utilities for dungeon data
 */
export class DungeonStorage {
  /**
   * Get today's date string in YYYY-MM-DD format
   */
  private static getTodayKey(): string {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    return dateString || ''; // YYYY-MM-DD
  }

  /**
   * Store today's dungeon layout
   */
  static async saveDailyDungeon(dungeon: DungeonLayout): Promise<void> {
    const key = `dungeon:${this.getTodayKey()}`;
    await redis.set(key, JSON.stringify(dungeon));
    // Set expiration to 7 days (keep for a week)
    await redis.expire(key, 7 * 24 * 60 * 60);
  }

  /**
   * Get today's dungeon layout
   */
  static async getDailyDungeon(): Promise<DungeonLayout | null> {
    const key = `dungeon:${this.getTodayKey()}`;
    const data = await redis.get(key);
    
    if (!data) {
      // Return default dungeon if none exists
      return this.getDefaultDungeon();
    }

    return JSON.parse(data);
  }

  /**
   * Default dungeon for testing/fallback
   */
  private static getDefaultDungeon(): DungeonLayout {
    // Simple cross pattern
    const layout = 
      '1111111111' +
      '1000000001' +
      '1000000001' +
      '1000000001' +
      '0000000000' +
      '0000000000' +
      '1000000001' +
      '1000000001' +
      '1000000001' +
      '1111111111';

    return {
      layout,
      monster: 'Goblin',
      modifier: 'Normal',
      createdAt: Date.now(),
      submittedBy: 'system',
    };
  }

  /**
   * Submit a player's score
   */
  static async submitScore(username: string, score: PlayerScore): Promise<number> {
    const leaderboardKey = `leaderboard:${this.getTodayKey()}`;
    
    // Add to sorted set (higher scores = better)
    await redis.zAdd(leaderboardKey, {
      member: JSON.stringify({
        username,
        score: score.score,
        timestamp: score.timestamp,
        survived: score.survived,
      }),
      score: score.score,
    });

    // Set expiration
    await redis.expire(leaderboardKey, 7 * 24 * 60 * 60);

    // Get rank (0-indexed, so add 1)
    const rank = await redis.zRank(leaderboardKey, JSON.stringify({
      username,
      score: score.score,
      timestamp: score.timestamp,
      survived: score.survived,
    }));

    return (rank ?? 0) + 1;
  }

  /**
   * Get top N players from today's leaderboard
   */
  static async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
    const leaderboardKey = `leaderboard:${this.getTodayKey()}`;
    
    // Get top scores (descending order)
    const entries = await redis.zRange(leaderboardKey, 0, limit - 1, { by: 'rank', reverse: true });

    return entries.map((entry, index) => {
      const data = JSON.parse(entry.member);
      return {
        rank: index + 1,
        username: data.username,
        score: entry.score,
        timestamp: data.timestamp,
      };
    });
  }

  /**
   * Get user's rank on today's leaderboard
   */
  static async getUserRank(username: string): Promise<number | null> {
    const leaderboardKey = `leaderboard:${this.getTodayKey()}`;
    
    // Get all user entries
    const allEntries = await redis.zRange(leaderboardKey, 0, -1, { by: 'rank', reverse: true });
    
    // Find user's best score
    let bestRank: number | null = null;
    allEntries.forEach((entry, index) => {
      const data = JSON.parse(entry.member);
      if (data.username === username) {
        if (bestRank === null || index < bestRank) {
          bestRank = index + 1;
        }
      }
    });

    return bestRank;
  }

  /**
   * Save a ghost position (where a player died)
   */
  static async addGhost(ghost: GhostPosition): Promise<void> {
    const ghostKey = `ghosts:${this.getTodayKey()}`;
    const ghostId = `${ghost.x},${ghost.y},${ghost.username}`;
    
    await redis.hSet(ghostKey, { [ghostId]: JSON.stringify(ghost) });
    await redis.expire(ghostKey, 7 * 24 * 60 * 60);
  }

  /**
   * Get all ghost positions for today
   */
  static async getGhosts(): Promise<GhostPosition[]> {
    const ghostKey = `ghosts:${this.getTodayKey()}`;
    
    const ghostHash = await redis.hGetAll(ghostKey);
    return Object.values(ghostHash).map((g: string) => JSON.parse(g));
  }

  /**
   * Get total number of players today
   */
  static async getTotalPlayers(): Promise<number> {
    const leaderboardKey = `leaderboard:${this.getTodayKey()}`;
    return await redis.zCard(leaderboardKey);
  }
}
