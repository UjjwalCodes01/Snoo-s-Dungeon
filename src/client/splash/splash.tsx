import '../index.css';

import { navigateTo } from '@devvit/web/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

// Floating particle component
const Particle = ({ emoji, delay, duration, left, size }: { 
  emoji: string; 
  delay: number; 
  duration: number; 
  left: number;
  size: number;
}) => (
  <div
    className="absolute pointer-events-none"
    style={{
      left: `${left}%`,
      bottom: '-50px',
      fontSize: `${size}rem`,
      opacity: 0.15,
      animation: `float-up ${duration}s ease-in-out ${delay}s infinite`,
    }}
  >
    {emoji}
  </div>
);

// Countdown timer hook
const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return timeLeft;
};

// Stats display - Nature style
const StatBox = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex flex-col items-center bg-white/60 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 border-2 border-green-500/30 shadow-lg">
    <span className="text-lg md:text-xl">{icon}</span>
    <span className="text-[10px] md:text-xs text-green-700 uppercase tracking-wide font-semibold">{label}</span>
    <span className="text-xs md:text-sm font-bold text-green-900">{value}</span>
  </div>
);

export const Splash = () => {
  const countdown = useCountdown();
  const [isLoaded, setIsLoaded] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  
  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsLoaded(true), 100);
  }, []);

  const particles = [
    { emoji: '🏰', delay: 0, duration: 8, left: 10, size: 2.5 },
    { emoji: '⚔️', delay: 1, duration: 7, left: 25, size: 1.8 },
    { emoji: '👹', delay: 2, duration: 9, left: 40, size: 2 },
    { emoji: '💀', delay: 0.5, duration: 6, left: 55, size: 1.5 },
    { emoji: '🗝️', delay: 3, duration: 8, left: 70, size: 1.8 },
    { emoji: '🐉', delay: 1.5, duration: 7, left: 85, size: 2.2 },
    { emoji: '💎', delay: 2.5, duration: 9, left: 15, size: 1.5 },
    { emoji: '🔥', delay: 4, duration: 6, left: 90, size: 1.8 },
    { emoji: '⭐', delay: 3.5, duration: 8, left: 5, size: 1.5 },
    { emoji: '🛡️', delay: 0.8, duration: 7, left: 60, size: 1.8 },
  ];

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-gradient-to-b from-sky-300 via-green-100 to-green-200 overflow-hidden">
      {/* Animated nature clouds */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(255, 255, 255, 0.6) 0%, rgba(135, 206, 235, 0.2) 40%, transparent 70%)',
          animation: 'pulse-bg 6s ease-in-out infinite',
        }}
      />
      
      {/* Grass pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(34,197,94,0.2) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(34,197,94,0.2) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>
      
      {/* Sunlight glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-yellow-300/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-green-400/20 rounded-full blur-[100px] animate-pulse delay-1000" />

      {/* Main content */}
      <div 
        className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Animated Nature Icon */}
        <div className="relative mb-6">
          <div 
            className="text-6xl md:text-8xl"
            style={{
              filter: 'drop-shadow(0 0 20px rgba(34, 197, 94, 0.5)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.8))',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            🌳
          </div>
          {/* Nature sparkles */}
          <div className="absolute -top-2 -right-2 text-lg md:text-xl animate-ping">🌸</div>
          <div className="absolute -bottom-1 -left-2 text-base md:text-lg animate-ping delay-500">🍃</div>
        </div>
        
        {/* Title with nature glow */}
        <h1 
          className="text-2xl md:text-3xl font-bold text-center text-green-800 mb-1 px-4"
          style={{ 
            textShadow: '0 2px 4px rgba(255,255,255,0.8), 0 0 20px rgba(34,197,94,0.3)',
            letterSpacing: '0.05em'
          }}
        >
          Snoo's Ever-Shifting
        </h1>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-2 px-4"
          style={{
            background: 'linear-gradient(135deg, #22C55E 0%, #84CC16 50%, #10B981 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 30px rgba(34, 197, 94, 0.5)',
            animation: 'gradient-shift 3s ease-in-out infinite',
            backgroundSize: '200% 200%',
            letterSpacing: '0.05em'
          }}
        >
          DUNGEON
        </h2>

        {/* Subtitle with nature feel */}
        <p className="text-base md:text-lg text-center text-green-900 mb-1 px-4">
          Welcome, <span className="font-bold text-transparent bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text">{context?.username ?? 'adventurer'}</span>!
        </p>
        
        {/* Tagline */}
        <p className="text-xs md:text-sm text-center text-green-800/70 max-w-md mb-6 px-6">
          A daily dungeon crawler designed by the Reddit community. 
          <span className="text-green-700 font-semibold"> Play, create, vote</span> — top designs become tomorrow's challenge!
        </p>

        {/* Live Stats Row */}
        <div className="flex gap-3 mb-6">
          <StatBox icon="⏰" label="Next Dungeon" value={countdown} />
          <StatBox icon="🎮" label="Today's Players" value="--" />
          <StatBox icon="🗺️" label="Designs" value="--" />
        </div>

        {/* Nature CTA Button */}
        <button
          className="relative group flex items-center justify-center gap-2 md:gap-3 text-white text-lg md:text-xl font-bold py-4 md:py-5 px-8 md:px-12 rounded-2xl cursor-pointer transition-all duration-300 mb-6 border-2"
          style={{
            background: buttonHover 
              ? 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
              : 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
            borderColor: buttonHover ? '#86EFAC' : '#22C55E',
            boxShadow: buttonHover
              ? '0 0 30px rgba(34, 197, 94, 0.6), 0 10px 30px rgba(0,0,0,0.3), inset 0 -2px 15px rgba(0,0,0,0.2)'
              : '0 0 15px rgba(34, 197, 94, 0.4), 0 5px 20px rgba(0,0,0,0.2), inset 0 -2px 10px rgba(0,0,0,0.1)',
            transform: buttonHover ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)'
          }}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          onClick={(e) => {
            try {
              requestExpandedMode(e.nativeEvent, 'game');
            } catch (err) {
              // For local testing, navigate to game.html
              window.location.href = '/game.html';
            }
          }}
        >
          {/* Button glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-400 to-emerald-500 opacity-0 group-hover:opacity-25 blur-xl transition-opacity" />
          
          <span 
            className="text-2xl"
            style={{ animation: buttonHover ? 'sword-swing 0.5s ease-in-out' : 'none' }}
          >
            ⚔️
          </span>
          <span>Enter the Dungeon</span>
          <span className="text-2xl">🛡️</span>
        </button>

        {/* Feature Pills - Nature Style */}
        <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-4 px-4">
          <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm text-green-800 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm border-2 border-green-600/40 shadow-sm">
            <span>🎮</span> <span className="hidden sm:inline">Play Daily</span><span className="sm:hidden">Play</span>
          </span>
          <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm text-blue-800 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm border-2 border-blue-500/40 shadow-sm">
            <span>🎨</span> <span className="hidden sm:inline">Create Rooms</span><span className="sm:hidden">Create</span>
          </span>
          <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm text-yellow-800 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm border-2 border-yellow-600/40 shadow-sm">
            <span>🏆</span> <span className="hidden sm:inline">Compete</span><span className="sm:hidden">Compete</span>
          </span>
          <span className="flex items-center gap-1 bg-white/40 backdrop-blur-sm text-purple-800 px-3 md:px-4 py-2 rounded-full text-xs md:text-sm border-2 border-purple-500/40 shadow-sm">
            <span>👻</span> <span className="hidden sm:inline">See Deaths</span><span className="sm:hidden">Deaths</span>
          </span>
        </div>

        {/* Reddit branding */}
        <div className="flex items-center gap-2 text-green-800 text-xs">
          <span>Built with</span>
          <span className="text-red-500">❤️</span>
          <span>for Reddit</span>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.15; }
          90% { opacity: 0.15; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse-bg {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
        
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        @keyframes sword-swing {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-20deg); }
          75% { transform: rotate(20deg); }
        }
      `}</style>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
