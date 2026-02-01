import { useState, useEffect } from 'react';
import { useDailyContent } from '../hooks/useDailyContent';
import { TileEditor } from './TileEditor';
import { GameEmbed } from './GameEmbed';
import { Leaderboard } from './Leaderboard';
import { GhostViewer } from './GhostViewer';
import { SubmissionGuide } from './SubmissionGuide';
import { AdminPanel } from './AdminPanel';

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

// Time unit display component
const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-gray-800/80 backdrop-blur rounded-lg px-3 py-2 min-w-[3rem] border border-gray-700/50">
      <span className="text-2xl font-mono font-bold text-white">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{label}</span>
  </div>
);

// Challenge card component
const ChallengeCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <div className={`relative bg-gradient-to-br ${color} rounded-xl p-4 border border-white/10 overflow-hidden group hover:scale-105 transition-transform cursor-default`}>
    <div className="absolute top-0 right-0 text-6xl opacity-10 -mr-2 -mt-2 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <div className="relative z-10">
      <span className="text-3xl mb-2 block">{icon}</span>
      <p className="text-white/60 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-lg">{value}</p>
    </div>
  </div>
);

// Tab button component  
const TabButton = ({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-4 px-6 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
      active
        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25 scale-[1.02]'
        : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-gray-300 border border-gray-700/50'
    }`}
  >
    <span className={`text-xl ${active ? 'animate-bounce' : ''}`}>{icon}</span>
    <span>{label}</span>
  </button>
);

export const App = () => {
  const { layout, monster, modifier, date, loading, error } = useDailyContent();
  const [activeTab, setActiveTab] = useState<'play' | 'create'>('play');
  const countdown = useCountdown();
  const [mounted, setMounted] = useState(false);
  
  // TODO: This should come from Devvit context in production
  const isModerator = false;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-[#0a0a1a]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin"></div>
          <span className="absolute inset-0 flex items-center justify-center text-2xl">🏰</span>
        </div>
        <p className="text-gray-400 mt-4 animate-pulse">Loading today's dungeon...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[#0a0a1a] text-white transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
      {/* Animated background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-[100px]" />
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
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-yellow-200 text-sm">{error}</p>
            </div>
          )}

          {/* Challenge + Countdown Row */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            {/* Challenge Cards */}
            <ChallengeCard 
              icon={monster === 'Dragon' ? '🐉' : monster === 'Skeleton' ? '💀' : monster === 'Slime' ? '🟢' : '👹'}
              label="Monster"
              value={monster || 'Goblin'}
              color="from-red-500/20 to-red-900/20"
            />
            <ChallengeCard 
              icon="✨"
              label="Modifier"
              value={modifier || 'Normal'}
              color="from-purple-500/20 to-purple-900/20"
            />
            <ChallengeCard 
              icon="🗺️"
              label="Layout"
              value="Community Design"
              color="from-blue-500/20 to-blue-900/20"
            />
            
            {/* Countdown */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 text-center">Next Dungeon In</p>
              <div className="flex items-center justify-center gap-2">
                <TimeUnit value={countdown.hours} label="hrs" />
                <span className="text-gray-600 text-xl font-bold mb-4">:</span>
                <TimeUnit value={countdown.minutes} label="min" />
                <span className="text-gray-600 text-xl font-bold mb-4">:</span>
                <TimeUnit value={countdown.seconds} label="sec" />
              </div>
            </div>
          </div>

          {/* Tab Buttons */}
          <div className="flex gap-3 mb-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Area (2/3) */}
            <div className="lg:col-span-2 space-y-6">
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
            <div className="lg:col-span-1 space-y-6">
              <Leaderboard />
              <AdminPanel isModerator={isModerator} />
            </div>
          </div>

          {/* How It Works Section */}
          <div className="mt-8 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-gray-700/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <span>🔄</span> How It Works
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { icon: '🎮', title: 'Play', desc: 'Try today\'s dungeon' },
                { icon: '🎨', title: 'Create', desc: 'Design your room' },
                { icon: '📝', title: 'Submit', desc: 'Post as comment' },
                { icon: '⬆️', title: 'Vote', desc: 'Upvote favorites' },
                { icon: '🌟', title: 'Featured', desc: 'Top = tomorrow\'s!' },
              ].map((step, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 mx-auto bg-gray-800/50 rounded-full flex items-center justify-center text-2xl mb-2 border border-gray-700/50">
                    {step.icon}
                  </div>
                  <p className="font-medium text-sm text-white">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.desc}</p>
                  {i < 4 && (
                    <span className="hidden md:inline text-gray-700 text-xl absolute right-0 top-1/2">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-8 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
              <span>Built for Reddit's Daily Games Hackathon 2026</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                Made with <span className="text-red-500">❤️</span> using GameMaker
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};
