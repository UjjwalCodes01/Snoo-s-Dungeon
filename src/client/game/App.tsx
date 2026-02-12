import { useState, useEffect } from 'react';
import { useDailyContent } from '../hooks/useDailyContent';
import { TileEditor } from './TileEditor';
import { GameEmbed } from './GameEmbed';
import { Leaderboard } from './Leaderboard';
import { GhostViewer } from './GhostViewer';
import { SubmissionGuide } from './SubmissionGuide';
import { AdminPanel } from './AdminPanel';

// Streak hook
const useStreak = () => {
  const [streak, setStreak] = useState({ current: 0, best: 0, lastPlayed: '' });
  
  useEffect(() => {
    const fetchStreak = async () => {
      try {
        const res = await fetch('/api/streak');
        if (res.ok) {
          const data = await res.json();
          setStreak({ current: data.current, best: data.best, lastPlayed: data.lastPlayed });
        }
      } catch (_err) {
        // Streak is optional; works without backend
      }
    };
    fetchStreak();
  }, []);
  
  return streak;
};

// Countdown timer hook
const useCountdown = () => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      
      setTimeLeft({
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return timeLeft;
};

// Time unit display component - Gaming style
const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-slate-800/80 backdrop-blur rounded-lg px-2 md:px-3 py-2 min-w-[2.5rem] md:min-w-[3rem] border-2 border-amber-500/40">
      <span className="text-xl md:text-2xl font-mono font-bold text-amber-400">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-[9px] md:text-[10px] text-amber-500/80 mt-1 uppercase tracking-wider">{label}</span>
  </div>
);

// Challenge card component - Gaming style
const ChallengeCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <div className={`relative bg-gradient-to-br ${color} rounded-xl p-3 md:p-4 border-2 border-amber-500/30 overflow-hidden group hover:scale-105 transition-transform cursor-default shadow-lg`}>
    <div className="absolute top-0 right-0 text-4xl md:text-6xl opacity-10 -mr-2 -mt-2 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <div className="relative z-10">
      <span className="text-2xl md:text-3xl mb-1 md:mb-2 block">{icon}</span>
      <p className="text-gray-300 text-[10px] md:text-xs uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-white font-bold text-sm md:text-lg">{value}</p>
    </div>
  </div>
);

// Tab button component - Gaming style
const TabButton = ({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base ${
      active
        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 scale-[1.02] border-2 border-amber-400'
        : 'bg-slate-800/60 text-gray-300 hover:bg-slate-700/60 hover:text-white border-2 border-slate-600/50'
    }`}
  >
    <span className={`text-lg md:text-xl ${active ? 'animate-bounce' : ''}`}>{icon}</span>
    <span className="hidden sm:inline">{label}</span>
  </button>
);

export const App = () => {
  const { layout, monster, modifier, date, loading, error } = useDailyContent();
  const [activeTab, setActiveTab] = useState<'play' | 'create'>('play');
  const countdown = useCountdown();
  const streak = useStreak();
  const [mounted, setMounted] = useState(false);
  
  // TODO: This should come from Devvit context in production
  const isModerator = false;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900">
        {/* Epic loading background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-500/20 rounded-full blur-[100px] animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo with spinning ring */}
          <div className="relative">
            <div className="w-24 h-24 md:w-28 md:h-28 border-4 border-amber-400/30 border-t-amber-500 rounded-full animate-spin absolute inset-0" style={{ animationDuration: '2s' }}></div>
            <img 
              src="logo.jpeg" 
              alt="Loading" 
              className="w-20 h-20 md:w-24 md:h-24 rounded-full m-2 border-2 border-amber-400"
              style={{ 
                boxShadow: '0 0 30px rgba(255, 165, 0, 0.5)',
                animation: 'pulse 2s ease-in-out infinite'
              }}
            />
          </div>
          
          {/* Loading text */}
          <p className="text-amber-400 mt-6 font-bold text-lg tracking-wider" style={{ textShadow: '0 0 10px rgba(255, 165, 0, 0.5)' }}>
            Loading Dungeon...
          </p>
          <p className="text-amber-500/60 text-sm mt-1 animate-pulse">Preparing your adventure</p>
          
          {/* Loading dots */}
          <div className="flex gap-2 mt-4">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated epic background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-red-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Header */}
          <header className="text-center mb-8">
            {/* Game Logo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <img 
                  src="logo.jpeg" 
                  alt="Snoo's Dungeon" 
                  className="w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 border-amber-400"
                  style={{ boxShadow: '0 0 20px rgba(255, 165, 0, 0.4)' }}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
              </div>
            </div>
            
            <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-full px-4 py-1 mb-4">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm text-green-400 font-semibold">⚔️ Live Now</span>
            </div>
            
            <h1 className="text-3xl md:text-5xl font-black mb-2">
              <span className="text-white">Snoo's </span>
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                Ever-Shifting Dungeon
              </span>
            </h1>
            
            <p className="text-gray-400 max-w-xl mx-auto">
              A daily dungeon crawler designed by the Reddit community
            </p>
            
            {date && (
              <p className="text-sm text-gray-600 mt-2">
                📅 {new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
          </header>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-900/40 border-2 border-red-500/60 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-center gap-3">
              <span className="text-xl md:text-2xl">⚠️</span>
              <p className="text-red-300 text-xs md:text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Streak Banner (if user has a streak) */}
          {streak.current > 0 && (
            <div className="bg-gradient-to-r from-orange-900/50 via-amber-900/50 to-orange-900/50 border-2 border-orange-500/60 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🔥</span>
                <div>
                  <p className="text-orange-300 font-bold text-base md:text-lg">{streak.current} Day Streak!</p>
                  <p className="text-orange-400/80 text-xs md:text-sm">Best: {streak.best} days • Keep playing!</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(Math.min(streak.current, 7))].map((_, i) => (
                  <span key={i} className="text-lg md:text-xl">🔥</span>
                ))}
                {streak.current > 7 && <span className="text-orange-400 text-xs md:text-sm ml-1">+{streak.current - 7}</span>}
              </div>
            </div>
          )}

          {/* Challenge + Countdown Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-6">
            {/* Challenge Cards */}
            <ChallengeCard 
              icon={monster === 'Dragon' ? '🐉' : monster === 'Skeleton' ? '💀' : monster === 'Slime' ? '🟢' : '👹'}
              label="Monster"
              value={monster || 'Goblin'}
              color="from-red-900/60 to-red-800/40"
            />
            <ChallengeCard 
              icon="✨"
              label="Modifier"
              value={modifier || 'Normal'}
              color="from-purple-900/60 to-purple-800/40"
            />
            
            {/* Countdown */}
            <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 md:p-4 border-2 border-blue-500/40 col-span-2 lg:col-span-1">
              <p className="text-[10px] md:text-xs text-blue-400 uppercase tracking-wider mb-2 text-center font-semibold">⏰ Next Dungeon</p>
              <div className="flex items-center justify-center gap-1 md:gap-2">
                <TimeUnit value={countdown.hours} label="hrs" />
                <span className="text-amber-500 text-lg md:text-xl font-bold mb-4">:</span>
                <TimeUnit value={countdown.minutes} label="min" />
                <span className="text-amber-500 text-lg md:text-xl font-bold mb-4">:</span>
                <TimeUnit value={countdown.seconds} label="sec" />
              </div>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
            <TabButton 
              active={activeTab === 'play'} 
              icon="🎮" 
              label="Play Today's Dungeon" 
              onClick={() => setActiveTab('play')} 
            />
            <TabButton 
              active={activeTab === 'create'} 
              icon="🎨" 
              label="Create Tomorrow's Room" 
              onClick={() => setActiveTab('create')} 
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Main Area (2/3) */}
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
              {activeTab === 'play' ? (
                <>
                  <GameEmbed layout={layout} monster={monster} modifier={modifier} />
                  <GhostViewer />
                </>
              ) : (
                <>
                  <TileEditor />
                  <SubmissionGuide />
                </>
              )}
            </div>
            
            {/* Sidebar (1/3) */}
            <div className="lg:col-span-1 space-y-4 md:space-y-6">
              <Leaderboard />
              <AdminPanel isModerator={isModerator} />
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-6 md:mt-8 bg-slate-800/60 backdrop-blur rounded-xl p-4 md:p-6 border-2 border-amber-500/40 shadow-lg">
            <h3 className="font-bold text-lg md:text-xl mb-4 md:mb-6 flex items-center gap-2 text-amber-400">
              <span className="text-2xl">⚡</span> How It Works
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {[
                { icon: '🎨', title: 'Create', desc: 'Design your room', color: 'from-purple-600 to-purple-700' },
                { icon: '📝', title: 'Submit', desc: 'Post as comment', color: 'from-green-600 to-green-700' },
                { icon: '⬆️', title: 'Vote', desc: 'Upvote favorites', color: 'from-orange-600 to-orange-700' },
                { icon: '🌟', title: 'Featured', desc: 'Top = tomorrow\'s!', color: 'from-amber-500 to-amber-600' },
              ].map((step, i) => (
                <div key={i} className="text-center relative">
                  <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center text-2xl md:text-3xl mb-2 shadow-lg border-2 border-slate-600 transform hover:scale-110 transition-transform`}>
                    {step.icon}
                  </div>
                  <p className="font-bold text-xs md:text-sm text-white">{step.title}</p>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">{step.desc}</p>
                  {i < 4 && (
                    <span className="hidden md:inline text-amber-500 text-2xl absolute -right-3 top-6">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
