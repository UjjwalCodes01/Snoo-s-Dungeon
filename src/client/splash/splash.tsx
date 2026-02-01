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

// Stats display
const StatBox = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex flex-col items-center bg-white/5 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/10">
    <span className="text-xl">{icon}</span>
    <span className="text-xs text-gray-400">{label}</span>
    <span className="text-sm font-bold text-white">{value}</span>
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
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-[#0a0a1a] overflow-hidden">
      {/* Animated gradient background */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(139, 69, 255, 0.3) 0%, rgba(255, 85, 0, 0.1) 40%, transparent 70%)',
          animation: 'pulse-bg 4s ease-in-out infinite',
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>
      
      {/* Glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />

      {/* Main content */}
      <div 
        className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Animated Castle Icon */}
        <div className="relative mb-6">
          <div 
            className="text-8xl"
            style={{
              filter: 'drop-shadow(0 0 30px rgba(255, 140, 0, 0.5))',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            🏰
          </div>
          {/* Sparkles around castle */}
          <div className="absolute -top-2 -right-2 text-xl animate-ping">✨</div>
          <div className="absolute -bottom-1 -left-2 text-lg animate-ping delay-500">✨</div>
        </div>
        
        {/* Title with glow */}
        <h1 
          className="text-2xl md:text-3xl font-bold text-center text-white mb-1"
          style={{ textShadow: '0 0 30px rgba(255,255,255,0.3)' }}
        >
          Snoo's Ever-Shifting
        </h1>
        <h2 
          className="text-5xl md:text-6xl font-black text-center mb-2"
          style={{
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF0080 50%, #7928CA 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 60px rgba(255, 107, 0, 0.5)',
            animation: 'gradient-shift 3s ease-in-out infinite',
            backgroundSize: '200% 200%',
          }}
        >
          DUNGEON
        </h2>

        {/* Subtitle with typing effect feel */}
        <p className="text-lg text-center text-gray-300 mb-1">
          Welcome, <span className="font-bold text-transparent bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text">{context.username ?? 'adventurer'}</span>!
        </p>
        
        {/* Tagline */}
        <p className="text-sm text-center text-gray-500 max-w-md mb-6 px-4">
          A daily dungeon crawler designed by the Reddit community. 
          <span className="text-gray-400"> Play, create, vote</span> — top designs become tomorrow's challenge!
        </p>

        {/* Live Stats Row */}
        <div className="flex gap-3 mb-6">
          <StatBox icon="⏰" label="Next Dungeon" value={countdown} />
          <StatBox icon="🎮" label="Today's Players" value="--" />
          <StatBox icon="🗺️" label="Designs" value="--" />
        </div>

        {/* Epic CTA Button */}
        <button
          className="relative group flex items-center justify-center gap-3 text-white text-xl font-bold py-5 px-12 rounded-2xl cursor-pointer transition-all duration-300 mb-6"
          style={{
            background: buttonHover 
              ? 'linear-gradient(135deg, #FF8C00 0%, #FF0080 100%)'
              : 'linear-gradient(135deg, #FF6B00 0%, #FF0050 100%)',
            boxShadow: buttonHover
              ? '0 0 60px rgba(255, 107, 0, 0.6), 0 20px 40px rgba(0,0,0,0.4)'
              : '0 0 30px rgba(255, 107, 0, 0.4), 0 10px 30px rgba(0,0,0,0.3)',
            transform: buttonHover ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
          }}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
        >
          {/* Button glow effect */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400 to-pink-500 opacity-0 group-hover:opacity-20 blur-xl transition-opacity" />
          
          <span 
            className="text-2xl"
            style={{ animation: buttonHover ? 'sword-swing 0.5s ease-in-out' : 'none' }}
          >
            ⚔️
          </span>
          <span>Enter the Dungeon</span>
          <span className="text-2xl">🛡️</span>
        </button>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-4">
          <span className="flex items-center gap-1 bg-gradient-to-r from-orange-500/20 to-orange-500/10 text-orange-300 px-4 py-2 rounded-full text-sm border border-orange-500/20 backdrop-blur-sm">
            <span>🎮</span> Play Daily
          </span>
          <span className="flex items-center gap-1 bg-gradient-to-r from-purple-500/20 to-purple-500/10 text-purple-300 px-4 py-2 rounded-full text-sm border border-purple-500/20 backdrop-blur-sm">
            <span>🎨</span> Create Rooms
          </span>
          <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-500/20 to-yellow-500/10 text-yellow-300 px-4 py-2 rounded-full text-sm border border-yellow-500/20 backdrop-blur-sm">
            <span>🏆</span> Compete
          </span>
          <span className="flex items-center gap-1 bg-gradient-to-r from-green-500/20 to-green-500/10 text-green-300 px-4 py-2 rounded-full text-sm border border-green-500/20 backdrop-blur-sm">
            <span>👻</span> See Deaths
          </span>
        </div>

        {/* Reddit branding */}
        <div className="flex items-center gap-2 text-gray-600 text-xs">
          <span>Built with</span>
          <span className="text-orange-500">❤️</span>
          <span>for Reddit</span>
        </div>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 text-xs text-gray-600">
        <span className="px-2 py-1 bg-white/5 rounded-full">🏆 Hackathon 2026</span>
        <span>•</span>
        <button
          className="cursor-pointer hover:text-orange-400 transition-colors flex items-center gap-1"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          <span>🤖</span> r/Devvit
        </button>
      </footer>

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
