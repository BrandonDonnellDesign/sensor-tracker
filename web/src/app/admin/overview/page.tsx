'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { StatsCard } from '@/components/dashboard/stats-card';
import { fetchOverviewMetrics, type OverviewMetrics } from '@/lib/admin/metrics';

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      try {
        setError(null);
        const data = await fetchOverviewMetrics();
        setMetrics(data);
      } catch (err) {
        console.error('Error loading admin metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    loadMetrics();
  }, []);

  return (
    <AdminGuard>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Admin Overview</h1>
          <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
            System health and aggregated metrics (privacy-safe)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading metrics</h3>
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
        ) : metrics ? (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <StatsCard
                title="Total Users"
                value={metrics.totalUsers}
                icon="sensors"
                color="blue"
              />
              <StatsCard
                title="Active Users"
                value={metrics.activeUsers}
                icon="check"
                color="green"
              />
              <StatsCard
                title="Total Sensors"
                value={metrics.totalSensors}
                icon="sensors"
                color="purple"
              />
              <StatsCard
                title="Total Photos"
                value={metrics.totalPhotos}
                icon="photo"
                color="purple"
              />
              <StatsCard
                title="Recent Activity"
                value={metrics.recentActivity}
                icon="calendar"
                color="red"
              />
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-center">
                  <div className={`text-2xl font-bold capitalize ${
                    metrics.systemHealth === 'healthy' ? 'text-green-600 dark:text-green-400' :
                    metrics.systemHealth === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {metrics.systemHealth}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">System Health</div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {metrics.uptime}h
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Uptime</div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {metrics.responseTime}ms
                  </div>
                  <div className="text-sm text-gray-600 dark:text-slate-400">Response Time</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/admin/logs"
                  className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">System Logs</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">View recent system activity</p>
                </a>
                <a
                  href="/admin/feature-flags"
                  className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Feature Flags</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage feature rollouts</p>
                </a>
                <a
                  href="/admin/sensor-models"
                  className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Sensor Models</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Manage sensor specifications</p>
                </a>
                <a
                  href="/admin/maintenance"
                  className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">Maintenance</h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">System maintenance tools</p>
                </a>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-slate-400">No metrics available</p>
          </div>
        )}
      </div>
    </AdminGuard>
  );
}