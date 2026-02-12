import '../index.css';

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

// Stats display - Gaming style
const StatBox = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <div className="flex flex-col items-center bg-slate-800/70 backdrop-blur-sm rounded-xl px-3 md:px-4 py-2 border-2 border-amber-500/30 shadow-lg">
    <span className="text-lg md:text-xl">{icon}</span>
    <span className="text-[10px] md:text-xs text-amber-400/80 uppercase tracking-wide font-semibold">{label}</span>
    <span className="text-xs md:text-sm font-bold text-amber-300">{value}</span>
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
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {/* Epic dungeon atmosphere */}
      <div 
        className="absolute inset-0 mt-3 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 20%, rgba(255, 165, 0, 0.3) 0%, rgba(139, 69, 19, 0.1) 40%, transparent 70%)',
          animation: 'pulse-bg 6s ease-in-out infinite',
        }}
      />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,165,0,0.3) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,165,0,0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <Particle key={i} {...p} />
        ))}
      </div>
      
      {/* Epic glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/15 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/15 rounded-full blur-[100px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-red-500/10 rounded-full blur-[80px] animate-pulse" />

      {/* Main content */}
      <div 
        className={`relative z-10 flex flex-col items-center transition-all duration-1000 ${
          isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        {/* Game Logo */}
        <div className="relative mb-6">
          <div 
            className="relative"
            style={{
              filter: 'drop-shadow(0 0 25px rgba(255, 100, 50, 0.6)) drop-shadow(0 0 50px rgba(139, 69, 19, 0.4))',
              animation: 'float 3s ease-in-out infinite',
            }}
          >
            <img 
              src="logo.jpeg" 
              alt="Snoo's Dungeon" 
              className="w-24 h-24 md:w-32 md:h-32 rounded-2xl border-4 border-amber-400 shadow-2xl"
              style={{ 
                boxShadow: '0 0 30px rgba(255, 165, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.2)' 
              }}
            />
            {/* Glowing ring effect */}
            <div 
              className="absolute inset-0 rounded-2xl" 
              style={{ 
                boxShadow: '0 0 0 4px rgba(255, 200, 100, 0.3), 0 0 20px rgba(255, 165, 0, 0.4)',
                animation: 'pulse-glow 2s ease-in-out infinite'
              }} 
            />
          </div>
        </div>
        
        {/* Title with epic glow */}
        <h1 
          className="text-2xl md:text-3xl font-bold text-center text-amber-200 mb-1 px-4"
          style={{ 
            textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,165,0,0.3)',
            letterSpacing: '0.05em'
          }}
        >
          Snoo's Ever-Shifting
        </h1>
        <h2 
          className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-2 px-4"
          style={{
            background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 50%, #F97316 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 0 30px rgba(255, 165, 0, 0.5)',
            animation: 'gradient-shift 3s ease-in-out infinite',
            backgroundSize: '200% 200%',
            letterSpacing: '0.05em'
          }}
        >
          DUNGEON
        </h2>

        {/* Subtitle */}
        <p className="text-base md:text-lg text-center text-gray-300 mb-1 px-4">
          Welcome, <span className="font-bold text-transparent bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text">{context?.username ?? 'adventurer'}</span>!
        </p>
        
        {/* Tagline */}
        <p className="text-xs md:text-sm text-center text-gray-400 max-w-md mb-6 px-6">
          A daily dungeon crawler designed by the Reddit community. 
          <span className="text-amber-400 font-semibold"> Play, create, vote</span> — top designs become tomorrow's challenge!
        </p>

        {/* Live Stats Row */}
        <div className="flex gap-3 mb-6">
          <StatBox icon="⏰" label="Next Dungeon" value={countdown} />
          <StatBox icon="🎮" label="Today's Players" value="--" />
          <StatBox icon="🗺️" label="Designs" value="--" />
        </div>

        {/* Epic CTA Button */}
        <button
          className="relative group flex items-center justify-center gap-2 md:gap-3 text-white text-lg md:text-xl font-bold py-4 md:py-5 px-8 md:px-12 rounded-2xl cursor-pointer transition-all duration-300 mb-6 border-2"
          style={{
            background: buttonHover 
              ? 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)'
              : 'linear-gradient(135deg, #D97706 0%, #DC2626 100%)',
            borderColor: buttonHover ? '#FCD34D' : '#F59E0B',
            boxShadow: buttonHover
              ? '0 0 40px rgba(245, 158, 11, 0.6), 0 10px 30px rgba(0,0,0,0.5), inset 0 -2px 15px rgba(0,0,0,0.3)'
              : '0 0 20px rgba(245, 158, 11, 0.4), 0 5px 20px rgba(0,0,0,0.3), inset 0 -2px 10px rgba(0,0,0,0.2)',
            transform: buttonHover ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
            textShadow: '0 2px 4px rgba(0,0,0,0.6)'
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
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-400 to-red-500 opacity-0 group-hover:opacity-25 blur-xl transition-opacity" />
          
          <span 
            className="text-2xl"
            style={{ animation: buttonHover ? 'sword-swing 0.5s ease-in-out' : 'none' }}
          >
            ⚔️
          </span>
          <span>Enter the Dungeon</span>
          <span className="text-2xl">🛡️</span>
        </button>
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
        
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 4px rgba(255, 200, 100, 0.3), 0 0 20px rgba(255, 165, 0, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(255, 200, 100, 0.5), 0 0 40px rgba(255, 165, 0, 0.6); }
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
