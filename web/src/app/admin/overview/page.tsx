'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { MetricCard } from '@/components/admin/metric-card';
import { StatusIndicator } from '@/components/admin/status-indicator';
import { MiniChart } from '@/components/admin/mini-chart';
import { LineChart } from '@/components/admin/charts/line-chart';
import { fetchOverviewMetrics, fetchIntegrationHealth, type OverviewMetrics, type IntegrationHealth } from '@/lib/admin/metrics';
import { Users, Activity, Zap, Camera, Bell, TrendingUp, AlertTriangle, CheckCircle, Award } from 'lucide-react';


export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const [metricsData, integrationsData] = await Promise.all([
          fetchOverviewMetrics(),
          fetchIntegrationHealth()
        ]);
        setMetrics(metricsData);
        setIntegrations(integrationsData);
      } catch (err) {
        console.error('Error loading admin data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminGuard>
    );
  }

  if (error) {
    return (
      <AdminGuard>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    );
  }

  if (!metrics) {
    return (
      <AdminGuard>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-slate-400">No metrics available</p>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
              System health and key metrics at a glance
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <StatusIndicator status={metrics.systemHealth} label="System Status" />
            <a
              href="/admin/analytics"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              View Analytics
            </a>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Key Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Daily Active Users"
              value={metrics.userActivity.dailyActive}
              icon={<Users className="h-6 w-6" />}
              color="blue"
              change={metrics.userActivity.dailyActive > 0 && metrics.userActivity.weeklyActive > 0 ? {
                value: Math.round(((metrics.userActivity.dailyActive / metrics.userActivity.weeklyActive) * 100)),
                type: 'neutral',
                period: '% of weekly active'
              } : undefined}
            />
            <MetricCard
              title="Active Sensors"
              value={metrics.sensorStats.activeSensors}
              icon={<Zap className="h-6 w-6" />}
              color="green"
              change={metrics.sensorStats.activeSensors > 0 && metrics.totalSensors > 0 ? {
                value: Math.round((metrics.sensorStats.activeSensors / metrics.totalSensors) * 100),
                type: 'neutral',
                period: '% of total sensors'
              } : undefined}
            />
            <MetricCard
              title="New Signups"
              value={metrics.userActivity.newSignups}
              icon={<TrendingUp className="h-6 w-6" />}
              color="purple"
              change={metrics.userActivity.newSignups > 0 && metrics.totalUsers > 0 ? {
                value: Math.round((metrics.userActivity.newSignups / metrics.totalUsers) * 100),
                type: 'neutral',
                period: '% growth rate'
              } : undefined}
            />
            <MetricCard
              title="Weekly Retention"
              value={`${metrics.retention.weeklyRetention.toFixed(1)}%`}
              icon={<Activity className="h-6 w-6" />}
              color="yellow"
              change={metrics.retention.weeklyRetention > 0 ? {
                value: Math.round(metrics.retention.weeklyRetention),
                type: metrics.retention.weeklyRetention >= 70 ? 'increase' : metrics.retention.weeklyRetention >= 50 ? 'neutral' : 'decrease',
                period: '% user retention'
              } : undefined}
            />
          </div>
        </div>

        {/* User Activity & Sensor Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">User Activity</h3>
              <MiniChart data={metrics.userActivity.signupTrend} color="blue" />
            </div>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Weekly Active Users</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.userActivity.weeklyActive.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Total Users</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.totalUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Monthly Retention</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.retention.monthlyRetention.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">7-Day Signup Trend</h4>
              <LineChart
                data={{
                  labels: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [
                    {
                      label: 'New Signups',
                      data: metrics.userActivity.signupTrend,
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      fill: true,
                      tension: 0.3,
                    },
                  ],
                }}
                height={120}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Sensor Statistics</h3>
              <MiniChart data={metrics.sensorStats.sensorTrend} color="green" />
            </div>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Expired Sensors</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.sensorStats.expiredSensors.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Avg. Wear Duration</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.sensorStats.averageWearDuration} days
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Total Photos</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.totalPhotos.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">7-Day Sensor Trend</h4>
              <LineChart
                data={{
                  labels: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [
                    {
                      label: 'Sensors Added',
                      data: metrics.sensorStats.sensorTrend,
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      fill: true,
                      tension: 0.3,
                    },
                  ],
                }}
                height={120}
              />
            </div>
          </div>
        </div>

        {/* Integration Health & Notifications */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Integration Health</h3>
            <div className="space-y-4">
              {integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator status={integration.status} label={integration.name} size="sm" />
                  </div>
                  <div className="text-right">
                    {integration.successRate && (
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                        {integration.successRate.toFixed(1)}%
                      </div>
                    )}
                    {integration.responseTime && (
                      <div className="text-xs text-gray-500 dark:text-slate-500">
                        {integration.responseTime}ms
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200 dark:border-slate-600">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">OCR Success Rate</span>
                  <span className="font-semibold text-gray-900 dark:text-slate-100">
                    {metrics.integrationHealth.ocrSuccessRate.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Notifications</h3>
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <MiniChart data={metrics.notifications.deliveryTrend} color="purple" />
              </div>
            </div>
            <div className="space-y-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Sent Today</span>
                <span className="font-semibold text-gray-900 dark:text-slate-100">
                  {metrics.notifications.sent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Delivered</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {metrics.notifications.delivered.toLocaleString()}
                  </span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-slate-400">Failed</span>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {metrics.notifications.failed.toLocaleString()}
                  </span>
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-slate-400">Delivery Rate</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-gray-900 dark:text-slate-100">
                      {metrics.notifications.sent > 0 ? ((metrics.notifications.delivered / metrics.notifications.sent) * 100).toFixed(1) : '0.0'}%
                    </span>
                    <div className={`w-2 h-2 rounded-full ${
                      metrics.notifications.sent > 0 && (metrics.notifications.delivered / metrics.notifications.sent) >= 0.95 
                        ? 'bg-green-500' 
                        : metrics.notifications.sent > 0 && (metrics.notifications.delivered / metrics.notifications.sent) >= 0.85 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}></div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metrics.notifications.sent > 0 && (metrics.notifications.delivered / metrics.notifications.sent) >= 0.95 
                        ? 'bg-green-500' 
                        : metrics.notifications.sent > 0 && (metrics.notifications.delivered / metrics.notifications.sent) >= 0.85 
                        ? 'bg-yellow-500' 
                        : 'bg-red-500'
                    }`}
                    style={{ 
                      width: `${metrics.notifications.sent > 0 ? ((metrics.notifications.delivered / metrics.notifications.sent) * 100) : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
              <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-2">7-Day Delivery Trend</h4>
              <LineChart
                data={{
                  labels: Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }),
                  datasets: [
                    {
                      label: 'Delivered',
                      data: metrics.notifications.deliveryTrend,
                      borderColor: 'rgb(34, 197, 94)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      fill: true,
                      tension: 0.3,
                    },
                    {
                      label: 'Failed',
                      data: metrics.notifications.failureTrend || Array(7).fill(0),
                      borderColor: 'rgb(239, 68, 68)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      fill: true,
                      tension: 0.3,
                    },
                  ],
                }}
                height={120}
              />
            </div>
          </div>
        </div>



        {/* Quick Actions */}
        <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <a
              href="/admin/analytics"
              className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Analytics</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Detailed trends & insights</p>
            </a>
            <a
              href="/admin/gamification"
              className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Gamification</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Achievements & rewards</p>
            </a>
            <a
              href="/admin/integrations"
              className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Integrations</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">API health & sync logs</p>
            </a>
            <a
              href="/admin/notifications"
              className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-slate-100">Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Message queue & failures</p>
            </a>
            <a
              href="/admin/logs"
              className="p-4 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Activity className="h-5 w-5 text-red-600 dark:text-red-400 mb-2" />
              <h4 className="font-medium text-gray-900 dark:text-slate-100">System Logs</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">Recent system activity</p>
            </a>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}