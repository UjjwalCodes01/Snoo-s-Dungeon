import { DungeonLayout, PlayerScore, LeaderboardEntry, GhostPosition } from './dungeon';

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type DailyContentResponse = {
  layout: string;
  monster: string;
  modifier: string;
};

// New API response types for dungeon game
export type DailyDungeonResponse = DungeonLayout;

export type SubmitScoreRequest = {
  score: number;
  survived: boolean;
  deathPosition?: { x: number; y: number };
};

export type SubmitScoreResponse = {
  success: boolean;
  rank?: number;
  message: string;
};

export type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  userRank?: number;
  totalPlayers: number;
};

export type GhostsResponse = {
  ghosts: GhostPosition[];
};

