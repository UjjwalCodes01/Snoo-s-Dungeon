import { useState } from 'react';

interface AdminPanelProps {
  isModerator?: boolean;
}

export function AdminPanel({ isModerator = false }: AdminPanelProps) {
  const [submissionPostId, setSubmissionPostId] = useState('');
  const [currentPostId, setCurrentPostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch current config on mount
  useState(() => {
    fetch('/admin/submission-post')
      .then(res => res.json())
      .then(data => {
        if (data.postId) {
          setCurrentPostId(data.postId);
          setSubmissionPostId(data.postId);
        }
      })
      .catch(console.error);
  });

  const handleSetSubmissionPost = async () => {
    if (!submissionPostId.trim()) {
      setMessage({ type: 'error', text: 'Please enter a post ID' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/admin/set-submission-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: submissionPostId.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message || 'Submission post updated!' });
        setCurrentPostId(submissionPostId.trim());
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerGeneration = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/admin/trigger-generation', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const dungeonInfo = data.dungeon 
          ? `Monster: ${data.dungeon.monster}, Modifier: ${data.dungeon.modifier}` 
          : data.message;
        setMessage({ type: 'success', text: `Generation triggered! ${dungeonInfo}` });
      } else {
        setMessage({ type: 'error', text: data.error || data.message || 'Generation failed' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (!isModerator) {
    return null;
  }

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">🔧</span>
        <h2 className="text-xl font-bold text-red-900 dark:text-red-300">
          Admin Panel
        </h2>
        <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-0.5 rounded">
          Moderators Only
        </span>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}

      {/* Submission Post Configuration */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
          Submission Post ID
        </label>
        <p className="text-xs text-red-700 dark:text-red-400 mb-2">
          Enter the Reddit post ID where users submit dungeon designs (e.g., t3_abc123)
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={submissionPostId}
            onChange={(e) => setSubmissionPostId(e.target.value)}
            placeholder="t3_abc123"
            className="flex-1 px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSetSubmissionPost}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold rounded-lg transition-colors text-sm"
          >
            {loading ? '...' : 'Set'}
          </button>
        </div>
        {currentPostId && (
          <p className="text-xs text-green-700 dark:text-green-400 mt-2">
            ✓ Current: {currentPostId}
          </p>
        )}
      </div>

      {/* Manual Generation Trigger */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-red-900 dark:text-red-300 mb-2">
          Manual Dungeon Generation
        </label>
        <p className="text-xs text-red-700 dark:text-red-400 mb-2">
          Manually trigger dungeon generation from the top-voted submission (for testing)
        </p>
        <button
          onClick={handleTriggerGeneration}
          disabled={loading || !currentPostId}
          className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
        >
          {loading ? 'Generating...' : '🎲 Generate Today\'s Dungeon Now'}
        </button>
        {!currentPostId && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-2">
            ⚠️ Set a submission post ID first
          </p>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30 p-3 rounded">
        <p className="font-semibold mb-1">ℹ️ How it works:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Create a submission post asking users for dungeon designs</li>
          <li>Paste the post ID above and click "Set"</li>
          <li>Every day at midnight UTC, the top-voted design becomes the dungeon</li>
          <li>Use "Generate Now" to test without waiting for midnight</li>
        </ol>
      </div>
    </div>
  );
}
