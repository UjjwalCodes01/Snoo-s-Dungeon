/**
 * Admin helper functions for configuring the dungeon system
 */

import { RedisClient } from '@devvit/web/server';

export class AdminHelper {
  constructor(private redis: RedisClient) {}

  /**
   * Set the submission post ID where users submit dungeon designs
   * @param postId - The Reddit post ID (e.g., 't3_abc123')
   */
  async setSubmissionPostId(postId: string): Promise<void> {
    await this.redis.set('config:submission_post_id', postId);
  }

  /**
   * Get the current submission post ID
   */
  async getSubmissionPostId(): Promise<string | null> {
    const result = await this.redis.get('config:submission_post_id');
    return result ?? null;
  }

  /**
   * Manually trigger dungeon generation (for testing)
   */
  async triggerDungeonGeneration(): Promise<{ success: boolean; message: string }> {
    const postId = await this.getSubmissionPostId();
    
    if (!postId) {
      return {
        success: false,
        message: 'No submission post ID configured. Use setSubmissionPostId first.'
      };
    }

    return {
      success: true,
      message: `Configured to generate from post: ${postId}`
    };
  }

  /**
   * Clear all dungeon data (for testing/reset)
   */
  async clearAllData(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    await Promise.all([
      this.redis.del(`dungeon:${today}`),
      this.redis.del(`leaderboard:${today}`),
      this.redis.del(`ghosts:${today}`)
    ]);
  }
}
