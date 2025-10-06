'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { listFeatureFlags, updateFeatureFlag, type FeatureFlag } from '@/lib/admin/feature-flags';

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadFeatureFlags();
  }, []);

  const loadFeatureFlags = async () => {
    try {
      setError(null);
      const data = await listFeatureFlags();
      setFlags(data);
    } catch (err) {
      console.error('Error loading feature flags:', err);
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async (key: string, enabled: boolean) => {
    setUpdating(key);
    try {
      await updateFeatureFlag(key, { enabled });
      await loadFeatureFlags(); // Reload to get updated data
    } catch (err) {
      console.error('Error updating feature flag:', err);
      setError(err instanceof Error ? err.message : 'Failed to update feature flag');
    } finally {
      setUpdating(null);
    }
  };

  const handleRolloutChange = async (key: string, rollout_percentage: number) => {
    setUpdating(key);
    try {
      await updateFeatureFlag(key, { rollout_percentage });
      await loadFeatureFlags(); // Reload to get updated data
    } catch (err) {
      console.error('Error updating rollout percentage:', err);
      setError(err instanceof Error ? err.message : 'Failed to update rollout percentage');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Feature Flags</h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
            Manage feature rollouts and A/B testing
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading feature flags</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Feature Flags List */}
            <div className="space-y-4">
              {flags.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-slate-400">No feature flags configured</p>
                </div>
              ) : (
                flags.map((flag) => (
                  <div
                    key={flag.key}
                    className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                              {flag.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                              {flag.description}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                              Key: <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">{flag.key}</code>
                            </p>
                          </div>
                        </div>

                        {/* Rollout Percentage */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                            Rollout Percentage: {flag.rollout_percentage}%
                          </label>
                          <div className="flex items-center gap-4">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="5"
                              value={flag.rollout_percentage}
                              onChange={(e) => handleRolloutChange(flag.key, parseInt(e.target.value))}
                              disabled={updating === flag.key}
                              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-slate-400 w-12 text-right">
                              {flag.rollout_percentage}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <div className="ml-6">
                        <button
                          onClick={() => handleToggleFlag(flag.key, !flag.enabled)}
                          disabled={updating === flag.key}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
                            flag.enabled ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              flag.enabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        {updating === flag.key && (
                          <div className="mt-2 text-xs text-blue-600">Updating...</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Summary Stats */}
            {flags.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {flags.filter(f => f.enabled).length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Active Flags</div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {flags.length > 0 ? Math.round(flags.reduce((acc, f) => acc + (f.enabled ? f.rollout_percentage : 0), 0) / flags.length) : 0}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Avg Rollout</div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {flags.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">Total Flags</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminGuard>
  );
}