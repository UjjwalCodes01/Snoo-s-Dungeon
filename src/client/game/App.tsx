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

// Time unit display component - Nature style
const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-white/70 backdrop-blur rounded-lg px-2 md:px-3 py-2 min-w-[2.5rem] md:min-w-[3rem] border-2 border-green-500/40">
      <span className="text-xl md:text-2xl font-mono font-bold text-green-800">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-[9px] md:text-[10px] text-green-700 mt-1 uppercase tracking-wider">{label}</span>
  </div>
);

// Challenge card component - Nature style
const ChallengeCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <div className={`relative bg-gradient-to-br ${color} rounded-xl p-3 md:p-4 border-2 border-green-500/30 overflow-hidden group hover:scale-105 transition-transform cursor-default shadow-lg`}>
    <div className="absolute top-0 right-0 text-4xl md:text-6xl opacity-10 -mr-2 -mt-2 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <div className="relative z-10">
      <span className="text-2xl md:text-3xl mb-1 md:mb-2 block">{icon}</span>
      <p className="text-green-700 text-[10px] md:text-xs uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-green-900 font-bold text-sm md:text-lg">{value}</p>
    </div>
  </div>
);

// Tab button component - Nature style
const TabButton = ({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 md:py-4 px-4 md:px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 text-sm md:text-base ${
      active
        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25 scale-[1.02] border-2 border-green-400'
        : 'bg-white/40 text-green-800 hover:bg-white/60 hover:text-green-900 border-2 border-green-500/30'
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
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-b from-sky-200 to-green-100">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🌳</span>
        </div>
        <p className="text-green-700 mt-4 animate-pulse font-semibold">Loading today's dungeon...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b from-sky-200 via-green-50 to-green-100 text-gray-900 transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated nature background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-300/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-300/20 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          
          {/* Hero Header */}
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1 mb-4">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-orange-300">Live Now</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black mb-2">
              <span className="text-white">🏰 Snoo's </span>
              <span className="bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500 bg-clip-text text-transparent">
                Ever-Shifting Dungeon
              </span>
            </h1>
            
            <p className="text-gray-500 max-w-xl mx-auto">
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
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-center gap-3">
              <span className="text-xl md:text-2xl">⚠️</span>
              <p className="text-yellow-800 text-xs md:text-sm font-semibold">{error}</p>
            </div>
          )}

          {/* Streak Banner (if user has a streak) */}
          {streak.current > 0 && (
            <div className="bg-gradient-to-r from-orange-200 via-yellow-200 to-orange-200 border-2 border-orange-400 rounded-xl p-3 md:p-4 mb-4 md:mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 md:gap-3">
                <span className="text-2xl md:text-3xl">🔥</span>
                <div>
                  <p className="text-orange-700 font-bold text-base md:text-lg">{streak.current} Day Streak!</p>
                  <p className="text-orange-600 text-xs md:text-sm">Best: {streak.best} days • Keep playing!</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1">
                {[...Array(Math.min(streak.current, 7))].map((_, i) => (
                  <span key={i} className="text-lg md:text-xl">🔥</span>
                ))}
                {streak.current > 7 && <span className="text-orange-600 text-xs md:text-sm ml-1">+{streak.current - 7}</span>}
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
              color="from-red-200/60 to-red-300/40"
            />
            <ChallengeCard 
              icon="✨"
              label="Modifier"
              value={modifier || 'Normal'}
              color="from-purple-200/60 to-purple-300/40"
            />
            <ChallengeCard 
              icon="🔥"
              label="Streak"
              value={streak.current > 0 ? `${streak.current} days` : 'Start!'}
              color="from-orange-200/60 to-yellow-300/40"
            />
            
            {/* Countdown */}
            <div className="bg-white/60 backdrop-blur rounded-xl p-3 md:p-4 border-2 border-blue-400/40 col-span-2 lg:col-span-1">
              <p className="text-[10px] md:text-xs text-blue-700 uppercase tracking-wider mb-2 text-center font-semibold">Next Dungeon</p>
              <div className="flex items-center justify-center gap-1 md:gap-2">
                <TimeUnit value={countdown.hours} label="hrs" />
                <span className="text-green-600 text-lg md:text-xl font-bold mb-4">:</span>
                <TimeUnit value={countdown.minutes} label="min" />
                <span className="text-green-600 text-lg md:text-xl font-bold mb-4">:</span>
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
          <div className="mt-6 md:mt-8 bg-white rounded-xl p-4 md:p-6 border-2 border-green-600 shadow-lg">
            <h3 className="font-bold text-lg md:text-xl mb-4 md:mb-6 flex items-center gap-2 text-green-800">
              <span className="text-2xl">🔄</span> How It Works
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              {[
                { icon: '🎮', title: 'Play', desc: 'Try today\'s dungeon', color: 'from-blue-500 to-blue-600' },
                { icon: '🎨', title: 'Create', desc: 'Design your room', color: 'from-purple-500 to-purple-600' },
                { icon: '📝', title: 'Submit', desc: 'Post as comment', color: 'from-green-500 to-green-600' },
                { icon: '⬆️', title: 'Vote', desc: 'Upvote favorites', color: 'from-orange-500 to-orange-600' },
                { icon: '🌟', title: 'Featured', desc: 'Top = tomorrow\'s!', color: 'from-yellow-500 to-amber-600' },
              ].map((step, i) => (
                <div key={i} className="text-center relative">
                  <div className={`w-14 h-14 md:w-16 md:h-16 mx-auto bg-gradient-to-br ${step.color} rounded-xl flex items-center justify-center text-2xl md:text-3xl mb-2 shadow-lg border-2 border-white transform hover:scale-110 transition-transform`}>
                    {step.icon}
                  </div>
                  <p className="font-bold text-xs md:text-sm text-gray-900">{step.title}</p>
                  <p className="text-[10px] md:text-xs text-gray-600 mt-0.5">{step.desc}</p>
                  {i < 4 && (
                    <span className="hidden md:inline text-green-500 text-2xl absolute -right-3 top-6">→</span>
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
