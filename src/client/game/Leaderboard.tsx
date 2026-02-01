import { useEffect, useState, useCallback } from 'react';
import type { LeaderboardResponse, LeaderboardEntry } from '../../shared/types/api';

// Animated number component
const AnimatedNumber = ({ value, duration = 500 }: { value: number; duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      setDisplayValue(Math.floor(startValue + diff * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);
  
  return <span>{displayValue.toLocaleString()}</span>;
};

// Rank badge component with special effects
const RankBadge = ({ rank }: { rank: number }) => {
  if (rank === 1) {
    return (
      <div className="relative">
        <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))' }}>🥇</span>
        <div className="absolute inset-0 animate-ping text-3xl opacity-30">🥇</div>
      </div>
    );
  }
  if (rank === 2) {
    return <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 6px rgba(192, 192, 192, 0.6))' }}>🥈</span>;
  }
  if (rank === 3) {
    return <span className="text-3xl" style={{ filter: 'drop-shadow(0 0 6px rgba(205, 127, 50, 0.6))' }}>🥉</span>;
  }
  return (
    <span className="w-8 h-8 flex items-center justify-center bg-gray-600/50 rounded-full text-sm font-bold text-gray-300">
      {rank}
    </span>
  );
};

// Player row component with hover effects
const PlayerRow = ({ player, index, isCurrentUser }: { player: LeaderboardEntry; index: number; isCurrentUser: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div
      className={`relative flex items-center justify-between p-3 rounded-xl transition-all duration-300 cursor-pointer overflow-hidden ${
        player.rank === 1
          ? 'bg-gradient-to-r from-yellow-500/20 via-amber-500/15 to-yellow-500/20 border border-yellow-500/30'
          : player.rank === 2
          ? 'bg-gradient-to-r from-gray-400/20 via-gray-300/15 to-gray-400/20 border border-gray-400/30'
          : player.rank === 3
          ? 'bg-gradient-to-r from-orange-600/20 via-amber-600/15 to-orange-600/20 border border-orange-500/30'
          : 'bg-gray-800/50 border border-gray-700/50 hover:border-gray-600'
      } ${isCurrentUser ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-gray-900' : ''}`}
      style={{
        animationDelay: `${index * 50}ms`,
        transform: isHovered ? 'scale(1.02) translateX(4px)' : 'scale(1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Shine effect for top 3 */}
      {player.rank <= 3 && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000"
        />
      )}
      
      <div className="flex items-center gap-3 relative z-10">
        <RankBadge rank={player.rank} />
        <div className="flex flex-col">
          <span className={`font-semibold ${
            player.rank === 1 ? 'text-yellow-300' :
            player.rank === 2 ? 'text-gray-300' :
            player.rank === 3 ? 'text-orange-300' :
            'text-white'
          }`}>
            {player.username}
            {isCurrentUser && <span className="ml-2 text-xs text-orange-400">(You)</span>}
          </span>
          {player.rank <= 3 && (
            <span className="text-xs text-gray-500">
              {player.rank === 1 ? '👑 Champion' : player.rank === 2 ? '⚔️ Runner-up' : '🛡️ Third Place'}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 relative z-10">
        <span className={`text-xl font-black ${
          player.rank === 1 ? 'text-yellow-400' :
          player.rank === 2 ? 'text-gray-300' :
          player.rank === 3 ? 'text-orange-400' :
          'text-orange-500'
        }`}>
          <AnimatedNumber value={player.score} />
        </span>
        <span className="text-xs text-gray-500">pts</span>
      </div>
    </div>
  );
};

export function Leaderboard() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLeaderboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const leaderboard: LeaderboardResponse = await res.json();
      setData(leaderboard);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Failed to load leaderboard');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(() => fetchLeaderboard(true), 30000);
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 shadow-2xl border border-gray-700/50">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded-lg w-2/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1 h-6 bg-gray-700 rounded"></div>
              <div className="w-16 h-6 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-900/50 to-gray-900 rounded-2xl p-6 border border-red-500/30">
        <p className="text-red-300 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </p>
        <button 
          onClick={() => fetchLeaderboard(true)}
          className="mt-3 text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          Try again →
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 via-gray-850 to-gray-900 rounded-2xl p-5 shadow-2xl border border-gray-700/50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/5 rounded-full blur-3xl" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏆</span>
          <div>
            <h2 className="text-xl font-bold text-white">Leaderboard</h2>
            <p className="text-xs text-gray-500">Today's top dungeon delvers</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>{data?.totalPlayers || 0} playing</span>
            </div>
          </div>
          <button
            onClick={() => fetchLeaderboard(true)}
            className={`p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
            disabled={isRefreshing}
          >
            <span className="text-lg">🔄</span>
          </button>
        </div>
      </div>

      {/* Leaderboard list */}
      {data && data.entries.length > 0 ? (
        <div className="space-y-2 relative z-10">
          {data.entries.map((player, index) => (
            <PlayerRow 
              key={player.username} 
              player={player} 
              index={index}
              isCurrentUser={false}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 relative z-10">
          <div className="text-5xl mb-4 opacity-50">🎮</div>
          <p className="text-gray-400 font-medium">No scores yet today!</p>
          <p className="text-gray-600 text-sm mt-1">Be the first to conquer the dungeon</p>
        </div>
      )}

      {/* User's rank if not in top 10 */}
      {data?.userRank && data.userRank > 10 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 relative z-10">
          <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-xl border border-orange-500/30">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 flex items-center justify-center bg-orange-600/50 rounded-full text-sm font-bold text-orange-200">
                {data.userRank}
              </span>
              <span className="text-orange-200 font-medium">Your Rank</span>
            </div>
            <span className="text-orange-400 text-sm">Keep playing to climb! 💪</span>
          </div>
        </div>
      )}

      {/* Motivational footer */}
      <div className="mt-4 text-center text-xs text-gray-600 relative z-10">
        <span>🔥 </span>
        <span className="text-gray-500">Leaderboard resets daily at midnight UTC</span>
      </div>
    </div>
  );
}
