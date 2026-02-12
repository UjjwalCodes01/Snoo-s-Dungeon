import { useState, useEffect, useRef } from 'react';
import { createGame } from '../phaser';
import type Phaser from 'phaser';

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
          ? 'bg-slate-700 shadow-inner'
          : 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-md'
      }`}
      style={{
        boxShadow: !isWall ? 'inset 0 1px 2px rgba(255,255,255,0.3), 0 2px 4px rgba(0,0,0,0.2)' : undefined,
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

export function GameEmbed({ layout, monster, modifier }: GameEmbedProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameInstanceRef = useRef<Phaser.Game | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [showClassSelect, setShowClassSelect] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('warrior');
  const [pulseMonster, setPulseMonster] = useState(false);

  // Pulse monster periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseMonster(true);
      setTimeout(() => setPulseMonster(false), 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Start the Phaser game when user clicks Play
  const startGame = (chosenClass: string = selectedClass) => {
    console.log('Starting game with:', { layout, monster, modifier, playerClass: chosenClass });
    setShowClassSelect(false);
    setShowPreview(false);
    
    // Use setTimeout to ensure the container div is visible and in the DOM
    setTimeout(() => {
      if (gameInstanceRef.current) {
        console.log('Game already exists, restarting scene');
        // Game already exists, restart it with new data
        gameInstanceRef.current.scene.start('GameScene', {
          layout,
          monster,
          modifier,
          playerClass: chosenClass,
          onGameOver: handleGameOver,
          onVictory: handleVictory,
        });
        return;
      }
      
      const container = document.getElementById('phaser-game-container');
      if (!container) {
        console.error('Game container not found!');
        return;
      }

      console.log('Creating new Phaser game instance');

      const game = createGame('phaser-game-container', {
        layout,
        monster,
        modifier,
        playerClass: chosenClass,
        onGameOver: handleGameOver,
        onVictory: handleVictory,
      });

      gameInstanceRef.current = game;
      console.log('Phaser game created successfully');
    }, 100);
  };

  // Show class selection screen
  const handlePlayClick = () => {
    setShowPreview(false);
    setShowClassSelect(true);
  };

  const handleGameOver = async (score: number, deathX: number, deathY: number) => {
    console.log('Game Over! Score:', score, 'Death position:', { x: deathX, y: deathY });
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          deathPosition: { x: deathX, y: deathY },
          survived: false,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Score submitted! Rank:', data.rank, 'Streak:', data.streak);
      }
    } catch (_err) {
      // Score submission is best-effort; game works offline too
    }
  };

  const handleVictory = async (score: number) => {
    console.log('Victory! Score:', score);
    try {
      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          score,
          survived: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Score submitted! Rank:', data.rank, 'Streak:', data.streak);
      }
    } catch (_err) {
      // Score submission is best-effort; game works offline too
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
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
  const stats = monsterStats[monster] || monsterStats['Goblin']!;

  // Modifier descriptions
  const modifierDesc: Record<string, string> = {
    'Normal': 'Standard difficulty',
    'Speed Boost': '+50% movement speed',
    'Double Damage': '2x attack power',
    'Tank Mode': '2x HP, slower speed',
    'Glass Cannon': 'Half HP, 3x damage',
    'Regeneration': 'Slow HP recovery',
  };

  // ─── Class Selection Screen ─────────────────────────────────────────────
  if (showClassSelect) {
    const classInfo = [
      {
        id: 'warrior',
        name: 'Warrior',
        icon: '⚔️',
        hp: 220, damage: 22, speed: 175,
        ability: 'Shield Slam + Battle Heal',
        abilityDesc: 'Area knockback + heals 3% HP per attack + 8% on kill',
        element: 'None',
        gradient: 'from-amber-900/60 to-gray-900',
        border: 'border-amber-500/40',
        highlight: 'text-amber-400',
        glow: 'rgba(245,158,11,0.4)',
      },
      {
        id: 'rogue',
        name: 'Rogue',
        icon: '🗡️',
        hp: 110, damage: 16, speed: 290,
        ability: 'Shadow Step + Evasion',
        abilityDesc: 'Teleport behind enemies + 25% dodge + 6% heal on kill',
        element: 'None',
        gradient: 'from-purple-900/60 to-gray-900',
        border: 'border-purple-500/40',
        highlight: 'text-purple-400',
        glow: 'rgba(168,85,247,0.4)',
      },
      {
        id: 'dark-knight',
        name: 'Dark Knight',
        icon: '🔥',
        hp: 150, damage: 22, speed: 210,
        ability: 'Dark Flame + Burn',
        abilityDesc: 'Fire trail + 8 dmg/tick burn DoT + 8% lifesteal on kill',
        element: 'Fire',
        gradient: 'from-red-900/60 to-gray-900',
        border: 'border-red-500/40',
        highlight: 'text-red-400',
        glow: 'rgba(239,68,68,0.4)',
      },
    ];

    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5">
          <h2 className="text-2xl font-black text-white text-center flex items-center justify-center gap-2">
            <span className="text-3xl">⚔️</span> Choose Your Class
          </h2>
          <p className="text-indigo-100 text-sm text-center mt-1">Select a hero to enter the dungeon</p>
        </div>

        {/* Class Cards */}
        <div className="p-5 space-y-3">
          {classInfo.map((cls) => (
            <button
              key={cls.id}
              onClick={() => setSelectedClass(cls.id)}
              className={`w-full bg-gradient-to-br ${cls.gradient} rounded-xl p-4 border-2 transition-all duration-200 text-left ${
                selectedClass === cls.id
                  ? `${cls.border} scale-[1.02] shadow-lg`
                  : 'border-gray-700/30 hover:border-gray-600/50 opacity-75 hover:opacity-100'
              }`}
              style={{
                boxShadow: selectedClass === cls.id ? `0 0 20px ${cls.glow}` : undefined,
              }}
            >
              <div className="flex items-start gap-4">
                <span className="text-4xl mt-1" style={{ filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))' }}>
                  {cls.icon}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-bold ${cls.highlight}`}>{cls.name}</h3>
                    {selectedClass === cls.id && (
                      <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs text-white">✓ Selected</span>
                    )}
                  </div>
                  {/* Stats Row */}
                  <div className="flex gap-4 mt-2 text-sm">
                    <span className="text-gray-400">❤️ <span className="text-white font-semibold">{cls.hp}</span></span>
                    <span className="text-gray-400">⚔️ <span className="text-white font-semibold">{cls.damage}</span></span>
                    <span className="text-gray-400">💨 <span className="text-white font-semibold">{cls.speed}</span></span>
                    {cls.element !== 'None' && (
                      <span className="text-gray-400">🔥 <span className="text-orange-400 font-semibold">{cls.element}</span></span>
                    )}
                  </div>
                  {/* Ability */}
                  <div className="mt-2">
                    <span className={`text-xs font-bold ${cls.highlight}`}>{cls.ability}</span>
                    <span className="text-xs text-gray-500 ml-1">– {cls.abilityDesc}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Start Button */}
        <div className="p-5 pt-0">
          <button
            onClick={() => startGame(selectedClass)}
            className="w-full py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 hover:from-green-400 hover:via-emerald-400 hover:to-teal-400 text-white rounded-xl font-black text-xl transition-all transform hover:scale-[1.02] shadow-lg"
          >
            ⚔️ Enter the Dungeon
          </button>
          <button
            onClick={() => { setShowClassSelect(false); setShowPreview(true); }}
            className="w-full mt-2 py-2 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            ← Back to Preview
          </button>
        </div>

        {/* Controls Hint */}
        <div className="p-3 bg-gray-900 border-t border-gray-700/50">
          <div className="flex justify-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">WASD</kbd> Move</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Space</kbd> Attack</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Shift</kbd> Dash</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">E</kbd> Area</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Q</kbd> Arrow</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Game Playing Screen ───────────────────────────────────────────────
  if (!showPreview) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
        <div className="bg-gradient-to-r from-orange-600 via-red-600 to-purple-600 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🎮</span> Conquer the Dungeon
            </h2>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-sm flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Playing
              </span>
            </div>
          </div>
        </div>
        <div className="bg-gray-900 flex items-center justify-center">
          <div id="phaser-game-container" ref={gameContainerRef} className="w-full aspect-square max-w-[640px] mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show preview by default or when button clicked
  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-green-500 relative"
    >
      {/* Glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-emerald-300/10 to-blue-400/10 opacity-50" />
      
      {/* Header */}
      <div className="relative bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-4 sm:p-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-10" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                <span className="text-2xl sm:text-3xl">🌿</span> Today's Dungeon
              </h2>
              <p className="text-green-50 text-xs sm:text-sm mt-1">
                Can you survive?
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="hidden sm:inline px-3 py-1 bg-white/20 rounded-full text-sm text-white backdrop-blur-sm">
                10×10 Grid
              </span>
              <button
                onClick={handlePlayClick}
                className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-green-50 text-green-600 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                ▶ Play Now
              </button>
            </div>
          </div>
        </div>
      </div>
        
        {/* Dungeon Grid Preview */}
        <div className="p-6 bg-gradient-to-b from-sky-100 to-green-50 relative">
          <div className="flex justify-center">
            <div 
              className="grid gap-1 bg-green-200/50 p-2 rounded-xl border-2 border-green-400 shadow-inner"
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
          <div className="flex justify-center gap-6 mt-4 text-xs text-gray-700">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded"></span> Floor</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-slate-700 rounded"></span> Wall</span>
            <span className="flex items-center gap-1">🧙 Start</span>
            <span className="flex items-center gap-1">🚪 Exit</span>
          </div>
        </div>

        {/* Monster & Modifier Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 bg-green-50">
          {/* Monster Card */}
          <div className={`bg-gradient-to-br from-red-100 to-red-50 rounded-xl p-3 sm:p-4 border-2 border-red-400 shadow-lg transition-transform ${pulseMonster ? 'scale-105' : ''}`}>
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-3xl sm:text-4xl" style={{ filter: 'drop-shadow(0 2px 4px rgba(220,38,38,0.3))' }}>
                {monster === 'Dragon' ? '🐉' : monster === 'Skeleton' ? '💀' : monster === 'Slime' ? '🟢' : '👹'}
              </span>
              <div>
                <p className="font-bold text-red-900 text-base sm:text-lg">{monster}</p>
                <p className="text-xs text-red-600">Today's Enemy</p>
              </div>
            </div>
            <div className="space-y-1.5 sm:space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">❤️ Health</span>
                <span className="text-red-600 font-bold">{stats.hp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">⚔️ Damage</span>
                <span className="text-orange-600 font-bold">{stats.dmg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">💨 Speed</span>
                <span className="text-amber-600 font-bold">{stats.speed}</span>
              </div>
            </div>
          </div>

          {/* Modifier Card */}
          <div className="bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl p-3 sm:p-4 border-2 border-purple-400 shadow-lg">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-3xl sm:text-4xl">✨</span>
              <div>
                <p className="font-bold text-purple-900 text-base sm:text-lg">{modifier}</p>
                <p className="text-xs text-purple-600">Active Modifier</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">{modifierDesc[modifier] || modifierDesc['Normal']}</p>
            <div className="mt-2 sm:mt-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></span>
              <span className="text-xs text-purple-700">Effect Active</span>
            </div>
          </div>
        </div>

        {/* Play Button */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-[shimmer_3s_infinite]" />
          <button
            onClick={handlePlayClick}
            className="relative z-10 w-full text-center py-2 hover:scale-105 transition-transform"
          >
            <p className="font-black text-white text-xl sm:text-2xl mb-1">▶ PLAY NOW!</p>
            <p className="text-green-50 text-xs sm:text-sm">
              Powered by Phaser 3
            </p>
          </button>
        </div>

        {/* Controls Hint */}
        <div className="p-2 sm:p-3 bg-green-50 border-t-2 border-green-200">
          <div className="flex justify-center gap-1.5 sm:gap-3 text-[10px] sm:text-xs text-gray-600 flex-wrap">
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">WASD</kbd> <span className="hidden sm:inline">Move</span></span>
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">Space</kbd> <span className="hidden sm:inline">Attack</span></span>
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">Shift</kbd> <span className="hidden sm:inline">Dash</span></span>
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">E</kbd> <span className="hidden sm:inline">Area</span></span>
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">Q</kbd> <span className="hidden sm:inline">Arrow</span></span>
            <span className="flex items-center gap-0.5 sm:gap-1"><kbd className="px-1 sm:px-1.5 py-0.5 bg-white border border-green-300 rounded text-gray-700 font-medium">R</kbd> <span className="hidden sm:inline">Restart</span></span>
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
