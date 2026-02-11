import { useState } from 'react';

export function SubmissionGuide() {
  const [copied, setCopied] = useState(false);
  const exampleLayout = '0000110000000011000000001100001111111111111111111100001100000000110000000011000000001100000000110000';

  const copyTemplate = () => {
    const template = `**My Dungeon Design**

Layout:
\`\`\`
${exampleLayout}
\`\`\`

Monster: Goblin

Modifier: Speed Boost

---
*Created with the Tile Editor in Snoo's Ever-Shifting Dungeon!*`;

    navigator.clipboard.writeText(template);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border-2 border-green-600 rounded-xl p-4 md:p-6 shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl md:text-3xl">📝</span>
        <h2 className="text-lg md:text-xl font-bold text-green-800">
          How to Submit Your Dungeon
        </h2>
      </div>

      <div className="space-y-3 md:space-y-4">
        {/* Step 1 */}
        <div className="flex gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            1
          </div>
          <div>
            <h3 className="font-bold text-green-900 text-sm md:text-base">Create Your Layout</h3>
            <p className="text-xs md:text-sm text-green-800 mt-1">
              Use the <span className="font-bold bg-green-200 px-1 rounded">Create Tomorrow's Room</span> tab above. Click tiles to toggle walls (dark) and floors (orange).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3 bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            2
          </div>
          <div>
            <h3 className="font-bold text-blue-900 text-sm md:text-base">Copy Your Layout Code</h3>
            <p className="text-xs md:text-sm text-blue-800 mt-1">
              Click the <span className="font-bold bg-blue-200 px-1 rounded">📋 Copy Layout</span> button to copy your 100-character layout string.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3 bg-purple-50 p-3 rounded-lg border border-purple-200">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            3
          </div>
          <div>
            <h3 className="font-bold text-purple-900 text-sm md:text-base">Post Your Submission</h3>
            <p className="text-xs md:text-sm text-purple-800 mt-1">
              Comment on the daily submission post with your layout, monster choice, and modifier.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3 bg-amber-50 p-3 rounded-lg border border-amber-200">
          <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
            4
          </div>
          <div>
            <h3 className="font-bold text-amber-900 text-sm md:text-base">Get Upvotes!</h3>
            <p className="text-xs md:text-sm text-amber-800 mt-1">
              The most upvoted design becomes <span className="font-bold bg-amber-200 px-1 rounded">tomorrow's dungeon</span>!
            </p>
          </div>
        </div>
      </div>

      {/* Comment Template */}
      <div className="mt-4 md:mt-6 p-3 md:p-4 bg-slate-800 rounded-lg border-2 border-slate-600 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-white text-xs md:text-sm">Comment Template</h3>
          <button
            onClick={copyTemplate}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              copied
                ? 'bg-green-500 text-white shadow-lg'
                : 'bg-green-600 text-white hover:bg-green-700 shadow-md'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy Template'}
          </button>
        </div>
        <pre className="text-xs text-green-300 bg-slate-900 p-3 rounded overflow-x-auto whitespace-pre-wrap border border-slate-700">
{`**My Dungeon Design**

Layout:
\`\`\`
${exampleLayout.slice(0, 50)}...
\`\`\`

Monster: Goblin

Modifier: Speed Boost`}
        </pre>
      </div>

      {/* Monster Options */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
          <span className="text-2xl">👹</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Goblin</p>
          <p className="text-xs text-gray-500">Fast & Weak</p>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
          <span className="text-2xl">💀</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Skeleton</p>
          <p className="text-xs text-gray-500">Balanced</p>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
          <span className="text-2xl">🟢</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Slime</p>
          <p className="text-xs text-gray-500">Slow & Tanky</p>
        </div>
        <div className="text-center p-2 bg-white dark:bg-gray-800 rounded border border-green-200 dark:border-green-700">
          <span className="text-2xl">🐉</span>
          <p className="text-xs font-semibold text-gray-900 dark:text-white">Dragon</p>
          <p className="text-xs text-gray-500">Boss Mode!</p>
        </div>
      </div>

      {/* Modifier Options */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-green-900 dark:text-green-300 mb-2">Popular Modifiers:</p>
        <div className="flex flex-wrap gap-2">
          {['Speed Boost', 'Double Damage', 'Tank Mode', 'Fog of War', 'Time Attack', 'One Hit KO', 'Regeneration', 'Normal'].map(mod => (
            <span 
              key={mod}
              className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-red-800 dark:text-red-300 rounded"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
