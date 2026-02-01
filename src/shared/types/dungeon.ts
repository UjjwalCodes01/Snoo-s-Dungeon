// Dungeon types for the game
export interface DungeonLayout {
  layout: string; // 100-character string of 0s and 1s
  monster: string;
  modifier: string;
  createdAt: number;
  submittedBy?: string;
}

export interface PlayerScore {
  username: string;
  score: number;
  timestamp: number;
  survived: boolean;
}

export interface GhostPosition {
  x: number;
  y: number;
  username: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  timestamp: number;
}

export interface CommentSubmission {
  layout: string;
  monster: string;
  modifier: string;
  upvotes: number;
  commentId: string;
  author: string;
}
