import { useState, useEffect } from 'react';

interface GameEmbedProps {
  layout: string;
  monster: string;
  modifier: string;
}

// Animated tile component
const Tile = ({ isWall, isStart, isEnd, hasMonster, delay }: { 
  isWall: boolean; 
  isStart: boolean; 
  isEnd: boolean;
  hasMonster: boolean;
  delay: number;
}) => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`aspect-square rounded-sm flex items-center justify-center transition-all duration-300 ${
        !animated ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
      } ${
        isWall
          ? 'bg-gray-800 shadow-inner'
          : 'bg-gradient-to-br from-orange-500 to-amber-600 shadow-md'
      }`}
      style={{
        boxShadow: !isWall ? 'inset 0 1px 2px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)' : undefined,
      }}
    >
      {isStart && !isWall && (
        <span className="text-xs animate-bounce" style={{ animationDelay: `${delay + 500}ms` }}>🧙</span>
      )}
      {isEnd && !isWall && !isStart && (
        <span className="text-xs animate-pulse">🚪</span>
      )}
      {hasMonster && !isWall && !isStart && !isEnd && (
        <span className="text-xs">👹</span>
      )}
    </div>
  );
};

// Stats bar component
const StatBar = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <div className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
    <span className="text-2xl">{icon}</span>
    <div className="flex-1">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`font-bold ${color}`}>{value}</p>
    </div>
  </div>
);

export function GameEmbed({ layout, monster, modifier }: GameEmbedProps) {
  const gameUrl = ''; // Set this after GameMaker export
  const [isHovering, setIsHovering] = useState(false);
  const [pulseMonster, setPulseMonster] = useState(false);

  // Pulse monster periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseMonster(true);
      setTimeout(() => setPulseMonster(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Parse layout string to 10x10 grid
  const gridSize = 10;
  const tiles = layout.padEnd(100, '0').split('').slice(0, 100);
  
  // Find floor tiles for monster placement simulation
  const floorIndices = tiles.map((t, i) => t === '1' ? i : -1).filter(i => i !== -1);
  const monsterIndex = floorIndices.length > 5 ? floorIndices[Math.floor(floorIndices.length * 0.7)] : -1;

  // Monster stats based on type
  const monsterStats: Record<string, { hp: number; dmg: number; speed: string }> = {
    'Goblin': { hp: 25, dmg: 8, speed: 'Fast' },
    'Skeleton': { hp: 40, dmg: 12, speed: 'Medium' },
    'Slime': { hp: 60, dmg: 5, speed: 'Slow' },
    'Dragon': { hp: 150, dmg: 20, speed: 'Medium' },
  };
  const stats = monsterStats[monster] || monsterStats['Goblin'];

  // Modifier descriptions
  const modifierDesc: Record<string, string> = {
    'Normal': 'Standard difficulty',
    'Speed Boost': '+50% movement speed',
    'Double Damage': '2x attack power',
    'Tank Mode': '2x HP, slower speed',
    'Glass Cannon': 'Half HP, 3x damage',
    'Regeneration': 'Slow HP recovery',
  };

  if (!gameUrl) {
    return (
      <div 
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50 relative"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-purple-500/10 opacity-50" />
        
        {/* Header */}
        <div className="relative bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 p-5">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                  <span className="text-3xl">🎮</span> Today's Dungeon
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                  Can you survive?
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white backdrop-blur-sm">
                  10×10 Grid
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Dungeon Grid Preview */}
        <div className="p-6 bg-gray-900 relative">
          <div className="flex justify-center">
            <div 
              className="grid gap-1 bg-gray-950 p-2 rounded-xl border border-gray-700/50 shadow-inner"
              style={{ 
                gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                width: 'min(100%, 360px)',
                aspectRatio: '1/1'
              }}
            >
              {tiles.map((tile, index) => {
                const isWall = tile === '0';
                const isStart = index === tiles.findIndex(t => t === '1');
                const isEnd = index === tiles.length - 1 - [...tiles].reverse().findIndex(t => t === '1');
                const hasMonster = index === monsterIndex;
                
                return (
                  <Tile
                    key={index}
                    isWall={isWall}
                    isStart={isStart}
                    isEnd={isEnd}
                    hasMonster={hasMonster}
                    delay={index * 10}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded"></span> Floor</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gray-800 rounded"></span> Wall</span>
            <span className="flex items-center gap-1">🧙 Start</span>
            <span className="flex items-center gap-1">🚪 Exit</span>
          </div>
        </div>

        {/* Monster & Modifier Info */}
        <div className="grid grid-cols-2 gap-4 p-5 bg-gray-800/50">
          {/* Monster Card */}
          <div className={`bg-gradient-to-br from-red-900/50 to-gray-900 rounded-xl p-4 border border-red-500/30 transition-transform ${pulseMonster ? 'scale-105' : ''}`}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl" style={{ filter: 'drop-shadow(0 0 10px rgba(255,0,0,0.5))' }}>
                {monster === 'Dragon' ? '🐉' : monster === 'Skeleton' ? '💀' : monster === 'Slime' ? '🟢' : '👹'}
              </span>
              <div>
                <p className="font-bold text-white text-lg">{monster}</p>
                <p className="text-xs text-red-400">Today's Enemy</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">❤️ Health</span>
                <span className="text-red-400 font-bold">{stats.hp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">⚔️ Damage</span>
                <span className="text-orange-400 font-bold">{stats.dmg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">💨 Speed</span>
                <span className="text-yellow-400 font-bold">{stats.speed}</span>
              </div>
            </div>
          </div>

          {/* Modifier Card */}
          <div className="bg-gradient-to-br from-purple-900/50 to-gray-900 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-4xl">✨</span>
              <div>
                <p className="font-bold text-white text-lg">{modifier}</p>
                <p className="text-xs text-purple-400">Active Modifier</p>
              </div>
            </div>
            <p className="text-sm text-gray-400">{modifierDesc[modifier] || modifierDesc['Normal']}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-purple-300">Effect Active</span>
            </div>
          </div>
        </div>

        {/* Play Button / Coming Soon */}
        <div className="p-5 bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
          <div className="relative z-10 text-center">
            <p className="font-black text-white text-xl mb-1">🎮 Game Coming Soon!</p>
            <p className="text-orange-100 text-sm">
              The dungeon crawler is being forged in GameMaker...
            </p>
          </div>
        </div>

        {/* Controls Hint */}
        <div className="p-3 bg-gray-900 border-t border-gray-700/50">
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">WASD</kbd>
              <span>Move</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">Space</kbd>
              <span>Attack</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">R</kbd>
              <span>Restart</span>
            </span>
          </div>
        </div>

        {/* Shimmer animation styles */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  // Real game iframe (once GameMaker is hosted)
  const fullUrl = `${gameUrl}?layout=${encodeURIComponent(layout)}&monster=${encodeURIComponent(monster)}&modifier=${encodeURIComponent(modifier)}`;

  return (
    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
      <div className="bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>🎮</span> Conquer the Dungeon
          </h2>
          <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live
          </span>
        </div>
      </div>
      <div className="relative bg-gray-900" style={{ paddingBottom: '75%' }}>
        <iframe 
          src={fullUrl} 
          title="Snoo's Dungeon Game"
          className="absolute inset-0 w-full h-full"
          style={{ border: 'none' }}
          allow="fullscreen"
        />
      </div>
      <div className="p-3 bg-gray-900 border-t border-gray-700/50">
        <div className="flex justify-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">WASD</kbd>
            <span>Move</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">Space</kbd>
            <span>Attack</span>
          </span>
        </div>
      </div>
    </div>
  );
}
