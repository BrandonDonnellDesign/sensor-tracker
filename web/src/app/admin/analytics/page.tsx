'use client';

import { useEffect, useState, useRef } from 'react';
import { AdminGuard } from '@/components/providers/admin-guard';
import { MetricCard } from '@/components/admin/metric-card';
import { MiniChart } from '@/components/admin/mini-chart';
import { LineChart } from '@/components/admin/charts/line-chart';
import { BarChart } from '@/components/admin/charts/bar-chart';
import { DoughnutChart } from '@/components/admin/charts/doughnut-chart';
import { fetchAnalyticsData, type AnalyticsData } from '@/lib/admin/metrics';
import { TrendingUp, Users, Zap, Bell, ArrowLeft, Calendar, Download } from 'lucide-react';
import { exportAnalyticsToCSV } from '@/utils/csv-export';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleExportDetailed = () => {
    if (!analytics) return;
    
    exportAnalyticsToCSV(
      analytics.historicalData.labels,
      analytics.historicalData.userGrowth,
      analytics.historicalData.sensorUsage,
      analytics.historicalData.notifications,
      analytics.historicalData.syncRates,
      `analytics-${timeRange}`
    );
    setShowExportMenu(false);
  };

  const handleExportSummary = () => {
    if (!analytics) return;
    
    const totalUsers = analytics.historicalData.userGrowth.reduce((sum, val) => sum + val, 0);
    const totalSensors = analytics.historicalData.sensorUsage.reduce((sum, val) => sum + val, 0);
    const totalNotifications = analytics.historicalData.notifications.reduce((sum, notif) => sum + notif.sent, 0);
    
    const totalSuccess = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success, 0);
    const totalAttempts = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success + sync.failed, 0);
    const avgSuccessRate = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;
    
    exportSummaryToCSV(
      totalUsers,
      totalSensors,
      totalNotifications,
      avgSuccessRate,
      timeRange,
      `summary-${timeRange}`
    );
    setShowExportMenu(false);
  };

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setError(null);
        setLoading(true);
        const response = await fetch(`/api/admin/analytics?range=${timeRange}&t=${Date.now()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [timeRange]);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <a
              href="/admin/overview"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
            </a>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
                Detailed metrics and historical trends
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={!analytics}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {showExportMenu && analytics && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border border-gray-200 dark:border-slate-600 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleExportSummary}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <span>Summary CSV</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        Key metrics and totals
                      </div>
                    </button>
                    <button
                      onClick={handleExportDetailed}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <div className="flex items-center space-x-2">
                        <Download className="h-4 w-4" />
                        <span>Detailed CSV</span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                        Daily breakdown data
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {analytics && (
          <>
            {/* User Growth Metrics */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>User Growth</span>
                </h2>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  {timeRange === '7d' ? 'Daily' : timeRange === '30d' ? 'Weekly' : 'Monthly'} breakdown
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <LineChart
                    data={{
                      labels: analytics.userGrowth.labels,
                      datasets: [
                        {
                          label: 'New Users',
                          data: analytics.userGrowth.data,
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          fill: true,
                          tension: 0.3,
                        },
                      ],
                    }}
                    height={280}
                  />
                </div>
                
                <div className="space-y-4">
                  <MetricCard
                    title="Total Growth"
                    value={`+${analytics.userGrowth.data.reduce((a, b) => a + b, 0)}`}
                    color="green"
                    size="sm"
                  />
                  <MetricCard
                    title="Avg. Daily"
                    value={Math.round(analytics.userGrowth.data.reduce((a, b) => a + b, 0) / analytics.userGrowth.data.length)}
                    color="blue"
                    size="sm"
                  />
                  <MetricCard
                    title="Peak Day"
                    value={Math.max(...analytics.userGrowth.data)}
                    color="purple"
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Sensor Usage & Integration Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>Sensor Usage Trends</span>
                </h3>
                
                <div className="mb-6">
                  <BarChart
                    data={{
                      labels: analytics.sensorUsage.labels,
                      datasets: [
                        {
                          label: 'Sensors Added',
                          data: analytics.sensorUsage.data,
                          backgroundColor: 'rgba(34, 197, 94, 0.8)',
                          borderColor: 'rgb(34, 197, 94)',
                          borderWidth: 1,
                        },
                      ],
                    }}
                    height={200}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">Integration Performance</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {analytics.integrationMetrics.dexcomSync.success}
                      </div>
                      <div className="text-xs text-green-700 dark:text-green-300">Dexcom Success</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {analytics.integrationMetrics.dexcomSync.failed}
                      </div>
                      <div className="text-xs text-red-700 dark:text-red-300">Dexcom Failed</div>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {analytics.integrationMetrics.ocrProcessing.success}
                      </div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">OCR Success</div>
                    </div>
                    <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                        {analytics.integrationMetrics.ocrProcessing.failed}
                      </div>
                      <div className="text-xs text-orange-700 dark:text-orange-300">OCR Failed</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-4 flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Analytics</span>
                </h3>
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analytics.notificationStats.sent}
                    </div>
                    <div className="text-xs text-blue-700 dark:text-blue-300">Sent</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {analytics.notificationStats.delivered}
                    </div>
                    <div className="text-xs text-green-700 dark:text-green-300">Read</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {analytics.notificationStats.failed}
                    </div>
                    <div className="text-xs text-red-700 dark:text-red-300">Unread</div>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3">Notification Types</h4>
                  <DoughnutChart
                    data={{
                      labels: Object.keys(analytics.notificationStats.byType).map(type => 
                        type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ),
                      datasets: [
                        {
                          data: Object.values(analytics.notificationStats.byType),
                          backgroundColor: [
                            'rgba(239, 68, 68, 0.8)',   // red for sensor_expired
                            'rgba(59, 130, 246, 0.8)',  // blue for reminder
                            'rgba(245, 158, 11, 0.8)',  // amber for alert
                            'rgba(107, 114, 128, 0.8)', // gray for system
                            'rgba(34, 197, 94, 0.8)',   // green for others
                            'rgba(168, 85, 247, 0.8)',  // purple for others
                          ],
                          borderColor: [
                            'rgb(239, 68, 68)',
                            'rgb(59, 130, 246)',
                            'rgb(245, 158, 11)',
                            'rgb(107, 114, 128)',
                            'rgb(34, 197, 94)',
                            'rgb(168, 85, 247)',
                          ],
                          borderWidth: 2,
                        },
                      ],
                    }}
                    height={200}
                    showLegend={false}
                  />
                </div>
                
                <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Read Rate</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {analytics.notificationStats.sent > 0 
                        ? ((analytics.notificationStats.delivered / analytics.notificationStats.sent) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Data Table */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 flex items-center space-x-2">
                  <Calendar className="h-5 w-5" />
                  <span>Historical Data</span>
                </h3>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500 dark:text-slate-500">
                    {analytics.historicalData.labels.length} days • 
                    Users: {analytics.historicalData.userGrowth.reduce((sum, val) => sum + val, 0)} • 
                    Sensors: {analytics.historicalData.sensorUsage.reduce((sum, val) => sum + val, 0)} • 
                    Notifications: {analytics.historicalData.notifications.reduce((sum, notif) => sum + notif.sent, 0)}
                    {(analytics as any)._debug && (
                      <span className="ml-2 text-red-500">
                        | Latest: {(analytics as any)._debug.generatedLabels?.join(', ')}
                      </span>
                    )}
                  </span>
                  <a
                    href="/admin/analytics/historical"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    View All ({analytics.historicalData.labels.length})
                  </a>
                </div>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-slate-400">Loading historical data...</p>
                </div>
              ) : analytics.historicalData.labels.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-slate-400">No historical data available</p>
                  <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">
                    Data will appear as your system collects more information
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
                  <thead className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        New Users
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Sensors Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Notifications
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Sync Success Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                    {analytics.historicalData.labels.slice(-7).map((date, displayIndex) => {
                      // Get the actual index from the end of the array (most recent 7 days)
                      const actualIndex = analytics.historicalData.labels.length - 7 + displayIndex;
                      const notificationData = analytics.historicalData.notifications[actualIndex];
                      const syncData = analytics.historicalData.syncRates[actualIndex];
                      const overallSuccessRate = syncData ? syncData.successRate : 0;
                      
                      return (
                        <tr key={`${date}-${actualIndex}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {date}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <span className="font-medium">
                              {analytics.historicalData.userGrowth[actualIndex] || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <span className="font-medium">
                              {analytics.historicalData.sensorUsage[actualIndex] || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {notificationData ? notificationData.sent : 0}
                              </span>
                              {notificationData && notificationData.sent > 0 && (
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  {notificationData.read} read ({notificationData.successRate.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            {syncData && (syncData.success > 0 || syncData.failed > 0) ? (
                              <div className="flex items-center space-x-2">
                                <span className={`font-medium ${
                                  overallSuccessRate >= 95 ? 'text-green-600 dark:text-green-400' :
                                  overallSuccessRate >= 85 ? 'text-yellow-600 dark:text-yellow-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {overallSuccessRate.toFixed(1)}%
                                </span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                  ({syncData.success}/{syncData.success + syncData.failed})
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-500 dark:text-slate-500">No sync activity</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                            <div className="flex items-center space-x-2">
                              {syncData && (syncData.success > 0 || syncData.failed > 0) ? (
                                <>
                                  <div className={`w-2 h-2 rounded-full ${
                                    overallSuccessRate >= 95 ? 'bg-green-500' :
                                    overallSuccessRate >= 85 ? 'bg-yellow-500' :
                                    overallSuccessRate >= 70 ? 'bg-orange-500' :
                                    'bg-red-500'
                                  }`} />
                                  <span className="text-xs font-medium">
                                    {overallSuccessRate >= 95 ? 'Excellent' :
                                     overallSuccessRate >= 85 ? 'Good' :
                                     overallSuccessRate >= 70 ? 'Fair' :
                                     'Poor'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div className="w-2 h-2 rounded-full bg-gray-400" />
                                  <span className="text-xs font-medium text-gray-500 dark:text-slate-500">
                                    No Data
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-slate-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                        Total ({timeRange})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400">
                        {analytics.historicalData.userGrowth.reduce((sum, val) => sum + val, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600 dark:text-green-400">
                        {analytics.historicalData.sensorUsage.reduce((sum, val) => sum + val, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-purple-600 dark:text-purple-400">
                        {analytics.historicalData.notifications.reduce((sum, notif) => sum + notif.sent, 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-slate-100">
                        {(() => {
                          const totalSuccess = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success, 0);
                          const totalAttempts = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success + sync.failed, 0);
                          if (totalAttempts === 0) {
                            return <span className="text-gray-500 dark:text-slate-500 text-xs">No sync activity</span>;
                          }
                          return ((totalSuccess / totalAttempts) * 100).toFixed(1) + '%';
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                        Summary
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}