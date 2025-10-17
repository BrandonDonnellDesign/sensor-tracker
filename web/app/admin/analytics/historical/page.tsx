'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { fetchAnalyticsData, type AnalyticsData } from '@/lib/admin/metrics';
import { ArrowLeft, Calendar, Download, Filter } from 'lucide-react';
import { exportAnalyticsToCSV, exportSummaryToCSV } from '@/utils/csv-export';

export default function HistoricalDataPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [sortBy, setSortBy] = useState<'date' | 'users' | 'sensors' | 'notifications' | 'success'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleExportDetailed = () => {
    if (!analytics) return;
    
    exportAnalyticsToCSV(
      analytics.historicalData.labels,
      analytics.historicalData.userGrowth,
      analytics.historicalData.sensorUsage,
      analytics.historicalData.notifications,
      analytics.historicalData.syncRates,
      `historical-data-${timeRange}`
    );
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

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortedData = () => {
    if (!analytics) return [];
    
    const data = analytics.historicalData.labels.map((date, index) => ({
      date,
      users: analytics.historicalData.userGrowth[index] || 0,
      sensors: analytics.historicalData.sensorUsage[index] || 0,
      notifications: analytics.historicalData.notifications[index] || { sent: 0, read: 0, successRate: 0 },
      syncData: analytics.historicalData.syncRates[index] || { success: 0, failed: 0, successRate: 0 }
    }));

    return data.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'users':
          aVal = a.users;
          bVal = b.users;
          break;
        case 'sensors':
          aVal = a.sensors;
          bVal = b.sensors;
          break;
        case 'notifications':
          aVal = a.notifications.sent;
          bVal = b.notifications.sent;
          break;
        case 'success':
          aVal = a.syncData.successRate;
          bVal = b.syncData.successRate;
          break;
        default:
          // Sort by date
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
      }
      
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

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
              <h3 className="text-sm font-medium text-red-800">Error loading historical data</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      </AdminGuard>
    );
  }

  const sortedData = getSortedData();

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-4">
            <a
              href="/admin/analytics"
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-slate-400" />
            </a>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Historical Data</h1>
              <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
                Complete daily breakdown of system activity
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
            <div className="flex items-center space-x-2">
              <button 
                onClick={handleExportSummary}
                disabled={!analytics}
                className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>Summary</span>
              </button>
              <button 
                onClick={handleExportDetailed}
                disabled={!analytics}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.historicalData.userGrowth.reduce((sum, val) => sum + val, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Total New Users</div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {analytics.historicalData.sensorUsage.reduce((sum, val) => sum + val, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Sensors Added</div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {analytics.historicalData.notifications.reduce((sum, notif) => sum + notif.sent, 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Notifications Sent</div>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                  {(() => {
                    const totalSuccess = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success, 0);
                    const totalAttempts = analytics.historicalData.syncRates.reduce((sum, sync) => sum + sync.success + sync.failed, 0);
                    return totalAttempts > 0 ? ((totalSuccess / totalAttempts) * 100).toFixed(1) + '%' : 'N/A';
                  })()}
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">Avg Success Rate</div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-slate-100 flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Daily Breakdown</span>
              </h2>
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {sortedData.length} days
                </span>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => handleSort('users')}
                  >
                    New Users {sortBy === 'users' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => handleSort('sensors')}
                  >
                    Sensors Added {sortBy === 'sensors' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => handleSort('notifications')}
                  >
                    Notifications {sortBy === 'notifications' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600"
                    onClick={() => handleSort('success')}
                  >
                    Success Rate {sortBy === 'success' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                {sortedData.map((row, index) => {
                  const overallSuccessRate = row.syncData.successRate;
                  
                  return (
                    <tr key={`${row.date}-${index}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {row.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <span className="font-medium">{row.users}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <span className="font-medium">{row.sensors}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <div className="flex flex-col">
                          <span className="font-medium">{row.notifications.sent}</span>
                          {row.notifications.sent > 0 && (
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              {row.notifications.read} read ({row.notifications.successRate.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        {row.syncData && (row.syncData.success > 0 || row.syncData.failed > 0) ? (
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              overallSuccessRate >= 95 ? 'text-green-600 dark:text-green-400' :
                              overallSuccessRate >= 85 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {overallSuccessRate.toFixed(1)}%
                            </span>
                            <span className="text-xs text-gray-500 dark:text-slate-400">
                              ({row.syncData.success}/{row.syncData.success + row.syncData.failed})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-slate-500">No sync activity</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                        <div className="flex items-center space-x-2">
                          {row.syncData && (row.syncData.success > 0 || row.syncData.failed > 0) ? (
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
            </table>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}