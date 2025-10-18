'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import { StatusIndicator } from '@/components/admin/status-indicator';
import { MetricCard } from '@/components/admin/metric-card';
import { fetchIntegrationHealth, type IntegrationHealth } from '@/lib/admin/metrics';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';

interface UsageStats {
  dexcomApiCalls: number;
  ocrRequests: number;
  databaseQueries: number;
  failedRequests: number;
}

interface ActivityLog {
  service: string;
  operation: string;
  status: 'success' | 'failed';
  duration: string;
  time: string;
  details?: string;
}

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationHealth[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({
    dexcomApiCalls: 0,
    ocrRequests: 0,
    databaseQueries: 0,
    failedRequests: 0
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadIntegrations = async () => {
    try {
      setError(null);
      
      // Load integration health
      const healthData = await fetchIntegrationHealth();
      setIntegrations(healthData);
      
      // Load usage statistics
      const usageResponse = await fetch('/api/admin/integrations/usage');
      if (usageResponse.ok) {
        const usage = await usageResponse.json();
        setUsageStats(usage);
      }
      
      // Load activity logs
      const activityResponse = await fetch('/api/admin/integrations/activity?limit=10');
      if (activityResponse.ok) {
        const activity = await activityResponse.json();
        setActivityLogs(activity);
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    loadIntegrations();
  };

  const getOverallHealth = () => {
    if (integrations.length === 0) return 'unknown';
    const healthyCount = integrations.filter(i => i.status === 'healthy').length;
    const degradedCount = integrations.filter(i => i.status === 'degraded').length;
    const downCount = integrations.filter(i => i.status === 'down').length;
    
    if (downCount > 0) return 'down';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  };

  if (loading && integrations.length === 0) {
    return (
      <AdminGuard>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
              <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Integration Health</h1>
              <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
                Monitor external service status and performance
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading integrations</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Overall Status"
            value={getOverallHealth()}
            icon={getOverallHealth() === 'healthy' ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            color={getOverallHealth() === 'healthy' ? 'green' : getOverallHealth() === 'degraded' ? 'yellow' : 'red'}
            size="sm"
          />
          <MetricCard
            title="Services Online"
            value={`${integrations.filter(i => i.status !== 'down').length}/${integrations.length}`}
            icon={<Zap className="h-6 w-6" />}
            color="blue"
            size="sm"
          />
          <MetricCard
            title="Avg Response Time"
            value={`${Math.round(integrations.reduce((acc, i) => acc + (i.responseTime || 0), 0) / integrations.length)}ms`}
            icon={<Clock className="h-6 w-6" />}
            color="purple"
            size="sm"
          />
          <MetricCard
            title="Success Rate"
            value={`${(integrations.reduce((acc, i) => acc + (i.successRate || 0), 0) / integrations.length).toFixed(1)}%`}
            icon={<CheckCircle className="h-6 w-6" />}
            color="green"
            size="sm"
          />
        </div>

        {/* Integration Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
                  {integration.name}
                </h3>
                <StatusIndicator status={integration.status} label={integration.status} />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-slate-400">Last Check:</span>
                  <span className="text-gray-900 dark:text-slate-100">
                    {new Date(integration.lastCheck).toLocaleTimeString()}
                  </span>
                </div>
                
                {integration.responseTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Response Time:</span>
                    <span className={`font-medium ${
                      integration.responseTime < 500 ? 'text-green-600 dark:text-green-400' :
                      integration.responseTime < 1000 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {integration.responseTime}ms
                    </span>
                  </div>
                )}

                {integration.successRate && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Success Rate:</span>
                    <span className={`font-medium ${
                      integration.successRate >= 98 ? 'text-green-600 dark:text-green-400' :
                      integration.successRate >= 95 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {integration.successRate?.toFixed(1)}%
                    </span>
                  </div>
                )}

                {integration.errorCount !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-slate-400">Errors (24h):</span>
                    <span className={`font-medium ${
                      integration.errorCount === 0 ? 'text-green-600 dark:text-green-400' :
                      integration.errorCount < 10 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {integration.errorCount}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* API Usage Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">API Usage (24h)</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {usageStats.dexcomApiCalls.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Dexcom API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {usageStats.ocrRequests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">OCR Requests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {usageStats.databaseQueries.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Database Queries</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {usageStats.failedRequests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-slate-400">Failed Requests</div>
            </div>
          </div>
        </div>

        {/* Sync Logs */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-4">Recent Sync Activity</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-600">
              <thead className="bg-gray-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-600">
                {activityLogs.map((log, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {log.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      <div>{log.operation}</div>
                      {log.details && (
                        <div className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-xs">
                          {log.details}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {log.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-500">
                      {log.time}
                    </td>
                  </tr>
                ))}
                {activityLogs.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                      No recent activity found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}