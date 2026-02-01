import { useEffect, useState } from 'react';
import type { GhostsResponse, GhostPosition } from '../../shared/types/api';

// Floating ghost animation component
const FloatingGhost = ({ delay }: { delay: number }) => (
  <span 
    className="inline-block opacity-50"
    style={{ 
      animation: `float 2s ease-in-out ${delay}ms infinite`,
    }}
  >
    👻
  </span>
);

// Recent death component
const RecentDeath = ({ ghost, index }: { ghost: GhostPosition; index: number }) => (
  <div 
    className="flex items-center gap-3 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20 transition-all hover:bg-purple-500/20"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <span className="text-lg">💀</span>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-purple-200 truncate">{ghost.username}</p>
      <p className="text-xs text-gray-500">Position: ({ghost.x}, {ghost.y})</p>
    </div>
    <span className="text-xs text-purple-400">RIP</span>
  </div>
);

export function GhostViewer() {
  const [data, setData] = useState<GhostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeaths, setShowDeaths] = useState(false);

  useEffect(() => {
    const fetchGhosts = async () => {
      try {
        const res = await fetch('/api/ghosts');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ghosts: GhostsResponse = await res.json();
        setData(ghosts);
      } catch (err) {
        console.error('Failed to fetch ghosts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGhosts();
    // Refresh every minute
    const interval = setInterval(fetchGhosts, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 rounded-xl p-4 border border-purple-500/20 animate-pulse">
        <div className="h-16 bg-purple-800/30 rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  const ghostCount = data.ghosts.length;
  const recentDeaths = data.ghosts.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-purple-900/30 to-gray-900 rounded-xl overflow-hidden border border-purple-500/20 relative">
      {/* Background ghosts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-2 right-4 text-2xl opacity-10">
          <FloatingGhost delay={0} />
        </div>
        <div className="absolute bottom-4 left-8 text-xl opacity-10">
          <FloatingGhost delay={500} />
        </div>
        <div className="absolute top-1/2 right-1/4 text-lg opacity-10">
          <FloatingGhost delay={1000} />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👻</span>
            <div>
              <h3 className="font-bold text-purple-200">Death Markers</h3>
              <p className="text-xs text-gray-500">Fallen adventurers</p>
            </div>
          </div>
          
          {/* Ghost count badge */}
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-purple-500/20 rounded-full border border-purple-500/30">
              <span className="text-lg font-bold text-purple-300">{ghostCount}</span>
              <span className="text-xs text-purple-400 ml-1">ghosts</span>
            </div>
          </div>
        </div>

        {/* Status message */}
        <div className="mb-3">
          {ghostCount === 0 ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <span className="text-xl">✨</span>
              <div>
                <p className="text-sm font-medium text-green-300">No deaths yet!</p>
                <p className="text-xs text-gray-500">The dungeon awaits its first victim...</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="text-xl">☠️</span>
              <div>
                <p className="text-sm font-medium text-red-300">
                  {ghostCount} player{ghostCount === 1 ? ' has' : 's have'} fallen
                </p>
                <p className="text-xs text-gray-500">Their spirits haunt the dungeon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent deaths expandable */}
        {ghostCount > 0 && (
          <>
            <button
              onClick={() => setShowDeaths(!showDeaths)}
              className="w-full flex items-center justify-between p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors text-sm"
            >
              <span className="text-gray-400">Recent Deaths</span>
              <span className="text-gray-500">{showDeaths ? '▲' : '▼'}</span>
            </button>
            
            {showDeaths && (
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                {recentDeaths.map((ghost, i) => (
                  <RecentDeath key={`${ghost.username}-${ghost.x}-${ghost.y}`} ghost={ghost} index={i} />
                ))}
                {ghostCount > 5 && (
                  <p className="text-xs text-center text-gray-500 pt-2">
                    +{ghostCount - 5} more ghosts in the dungeon
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Info */}
        <p className="text-xs text-gray-600 mt-3 text-center">
          💡 Ghost positions are visible in-game where players died
        </p>
      </div>

      {/* Floating animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
