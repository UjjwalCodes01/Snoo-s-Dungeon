import { reddit } from '@devvit/web/server';
import { CommentSubmission } from '../../shared/types/dungeon';

/**
 * Parse comment text to extract dungeon layout, monster, and modifier
 */
export class CommentParser {
  /**
   * Extract layout string from comment text
   * Looks for patterns like "Layout: 110011..." or "layout=110011..."
   */
  private static extractLayout(text: string): string | null {
    const patterns = [
      /Layout:\s*([01]{100})/i,
      /layout\s*=\s*([01]{100})/i,
      /([01]{100})/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Extract monster name from comment text
   */
  private static extractMonster(text: string): string {
    const patterns = [
      /Monster:\s*(\w+)/i,
      /monster\s*=\s*(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return 'Goblin'; // Default
  }

  /**
   * Extract modifier from comment text
   */
  private static extractModifier(text: string): string {
    const patterns = [
      /Modifier:\s*([\w\s]+?)(?:\n|$)/i,
      /modifier\s*=\s*([\w\s]+?)(?:\n|$)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return 'Normal'; // Default
  }

  /**
   * Parse a single comment
   */
  static parseComment(commentText: string, commentId: string, author: string, upvotes: number): CommentSubmission | null {
    const layout = this.extractLayout(commentText);
    
    if (!layout) {
      return null; // Not a valid dungeon submission
    }

    return {
      layout,
      monster: this.extractMonster(commentText),
      modifier: this.extractModifier(commentText),
      upvotes,
      commentId,
      author,
    };
  }

  /**
   * Get all valid dungeon submissions from a post's comments
   */
  static async getSubmissionsFromPost(postId: string): Promise<CommentSubmission[]> {
    try {
      const comments = await reddit.getComments({
        postId: postId as `t3_${string}`,
        pageSize: 100,
        limit: 100,
      }).all();

      const submissions: CommentSubmission[] = [];

      for (const comment of comments) {
        const submission = this.parseComment(
          comment.body,
          comment.id,
          comment.authorName,
          comment.score
        );

        if (submission) {
          submissions.push(submission);
        }
      }

      // Sort by upvotes (descending)
      submissions.sort((a, b) => b.upvotes - a.upvotes);

      return submissions;
    } catch (error) {
      console.error('Error fetching comments:', error);
      return [];
    }
  }

  /**
   * Get the top-voted submission from a post
   */
  static async getTopSubmission(postId: string): Promise<CommentSubmission | null> {
    const submissions = await this.getSubmissionsFromPost(postId);
    return submissions.length > 0 ? submissions[0]! : null;
  }
}
