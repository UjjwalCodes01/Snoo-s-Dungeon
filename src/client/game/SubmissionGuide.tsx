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
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📝</span>
        <h2 className="text-xl font-bold text-green-900 dark:text-green-300">
          How to Submit Your Dungeon
        </h2>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            1
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300">Create Your Layout</h3>
            <p className="text-sm text-green-800 dark:text-green-400">
              Use the <span className="font-semibold">Create Tomorrow's Room</span> tab above. Click tiles to toggle walls (dark) and floors (orange).
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            2
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300">Copy Your Layout Code</h3>
            <p className="text-sm text-green-800 dark:text-green-400">
              Click the <span className="font-semibold">📋 Copy Layout</span> button to copy your 100-character layout string.
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            3
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300">Post Your Submission</h3>
            <p className="text-sm text-green-800 dark:text-green-400">
              Comment on the daily submission post with your layout, monster choice, and modifier.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold">
            4
          </div>
          <div>
            <h3 className="font-semibold text-green-900 dark:text-green-300">Get Upvotes!</h3>
            <p className="text-sm text-green-800 dark:text-green-400">
              The most upvoted design becomes <span className="font-semibold">tomorrow's dungeon</span>!
            </p>
          </div>
        </div>
      </div>

      {/* Comment Template */}
      <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Comment Template</h3>
          <button
            onClick={copyTemplate}
            className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
              copied
                ? 'bg-green-500 text-white'
                : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800'
            }`}
          >
            {copied ? '✓ Copied!' : '📋 Copy Template'}
          </button>
        </div>
        <pre className="text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
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
              className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded"
            >
              {mod}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
