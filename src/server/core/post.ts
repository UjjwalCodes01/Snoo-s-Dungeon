import { reddit } from '@devvit/web/server';

export const createPost = async () => {
  return await reddit.submitCustomPost({
    title: '🗡️ Snoo\'s Dungeon: Survive the Waves! ⚔️',
  });
};
