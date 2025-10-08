'use client';

import { useState } from 'react';
import { useRetroactiveAwards } from '@/hooks/use-retroactive-awards';
import { useAuth } from '@/components/providers/auth-provider';

export function RetroactiveAwardsButton() {
  const { user } = useAuth();
  const { loading, awardAllUsers, error } = useRetroactiveAwards();
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleAward = async () => {
    const result = await awardAllUsers();
    if (result) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
    setShowConfirm(false);
  };

  if (showConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100 mb-2">
            🏆 Award Retroactive Achievements?
          </h3>
          <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
            This will scan all existing users and award achievements based on their sensor history. 
            This is safe to run multiple times.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAward}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Award Achievements'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className={`inline-flex items-center justify-center w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
          loading
            ? 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white'
        }`}
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        {loading ? 'Processing...' : '🏆 Award Retroactive'}
      </button>

      {success && (
        <div className="text-xs text-green-600 dark:text-green-400 font-medium text-center">
          ✅ Achievements awarded successfully!
        </div>
      )}

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 text-center">
          ❌ {error}
        </div>
      )}
    </div>
  );
}