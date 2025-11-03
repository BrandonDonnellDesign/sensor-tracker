'use client';

import { useEffect, useState } from 'react';
import { Database, RefreshCw, Trash2, TrendingUp, AlertCircle, CheckCircle, Clock, HardDrive, GitBranch } from 'lucide-react';

interface DatabaseStats {
  tableStats: {
    name: string;
    rowCount: number;
    size: string;
    indexSize: string;
  }[];
  performanceInsights: {
    metric_name: string;
    avg_response_time: number;
    p95_response_time: number;
    error_rate: number;
    recommendation: string;
  }[];
  maintenanceTasks: {
    id: string;
    name: string;
    description: string;
    frequency: string;
    lastRun?: string;
    nextRun?: string;
    status: string;
    duration?: number;
    error?: string;
  }[];
}

export function DatabaseManager() {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTask, setRunningTask] = useState<string | null>(null);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);

  const fetchStats = async () => {
    try {
      const [statsResponse, migrationResponse] = await Promise.all([
        fetch('/api/admin/database?action=stats'),
        fetch('/api/admin/migration-status')
      ]);
      
      if (statsResponse.ok) {
        const data = await statsResponse.json();
        setStats(data);
      }
      
      if (migrationResponse.ok) {
        const migrationData = await migrationResponse.json();
        setMigrationStatus(migrationData);
      }
    } catch (error) {
      console.error('Error fetching database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const runMaintenanceTask = async (action: string) => {
    setRunningTask(action);
    try {
      let response;
      
      if (action === 'quick-fix') {
        response = await fetch('/api/admin/quick-fix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        response = await fetch('/api/admin/database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action })
        });
      }

      if (response.ok) {
        // Refresh stats after task completion
        await fetchStats();
        
        if (action === 'quick-fix') {
          const result = await response.json();
          console.log('Quick fix result:', result);
        }
      }
    } catch (error) {
      console.error(`Error running ${action}:`, error);
    } finally {
      setRunningTask(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getInsightSeverity = (errorRate: number, avgTime: number) => {
    if (errorRate > 10 || avgTime > 3000) return 'high';
    if (errorRate > 5 || avgTime > 2000) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'low': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">
            Database Management
          </h2>
        </div>
        
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Migration Status */}
      {migrationStatus && !migrationStatus.allApplied && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <GitBranch className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Pending Migrations ({migrationStatus.pendingCount})
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300 mb-3">
                  Some database optimizations are not yet applied. Run migrations to unlock full functionality.
                </p>
                <div className="space-y-2">
                  {migrationStatus.recommendations.slice(0, 3).map((rec: string, index: number) => (
                    <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                      {rec}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => runMaintenanceTask('quick-fix')}
              disabled={runningTask !== null}
              className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${runningTask === 'quick-fix' ? 'animate-spin' : ''}`} />
              <span>Quick Fix</span>
            </button>
          </div>
        </div>
      )}

      {migrationStatus && migrationStatus.allApplied && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <p className="text-green-800 dark:text-green-200 font-medium">
              All migrations applied! Database is fully optimized.
            </p>
          </div>
        </div>
      )}

      {/* Table Statistics */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Table Statistics
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-2 text-gray-600 dark:text-slate-400">Table</th>
                <th className="text-right py-2 text-gray-600 dark:text-slate-400">Rows</th>
                <th className="text-right py-2 text-gray-600 dark:text-slate-400">Size</th>
                <th className="text-right py-2 text-gray-600 dark:text-slate-400">Index Size</th>
              </tr>
            </thead>
            <tbody>
              {stats?.tableStats.map((table) => (
                <tr key={table.name} className="border-b border-gray-100 dark:border-slate-700">
                  <td className="py-3 font-medium text-gray-900 dark:text-slate-100">
                    {table.name}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-slate-400">
                    {table.rowCount.toLocaleString()}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-slate-400">
                    {table.size}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-slate-400">
                    {table.indexSize}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Performance Insights
        </h3>
        
        {stats?.performanceInsights.length === 0 ? (
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-slate-400">
              No performance issues detected. System is running optimally.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats?.performanceInsights.map((insight, index) => {
              const severity = getInsightSeverity(insight.error_rate, insight.avg_response_time);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(severity)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-slate-100">
                        {insight.metric_name} Performance
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                        {insight.recommendation}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-slate-500">
                        <span>Avg: {insight.avg_response_time.toFixed(0)}ms</span>
                        <span>P95: {insight.p95_response_time.toFixed(0)}ms</span>
                        <span>Error Rate: {insight.error_rate.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Maintenance Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Maintenance Tasks
          </h3>
          
          <button
            onClick={() => runMaintenanceTask('run-maintenance')}
            disabled={runningTask !== null}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${runningTask === 'run-maintenance' ? 'animate-spin' : ''}`} />
            <span>Run All Tasks</span>
          </button>
        </div>
        
        <div className="space-y-4">
          {stats?.maintenanceTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getStatusIcon(task.status)}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-slate-100">
                    {task.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400">
                    {task.description}
                  </p>
                  {task.lastRun && (
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      Last run: {new Date(task.lastRun).toLocaleString()}
                      {task.duration && ` (${task.duration}ms)`}
                    </p>
                  )}
                  {task.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      Error: {task.error}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-slate-500 capitalize">
                  {task.frequency}
                </span>
                
                {task.id === 'refresh_views' && (
                  <button
                    onClick={() => runMaintenanceTask('refresh-views')}
                    disabled={runningTask !== null}
                    className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    title="Refresh Views"
                  >
                    <RefreshCw className={`w-4 h-4 ${runningTask === 'refresh-views' ? 'animate-spin' : ''}`} />
                  </button>
                )}
                
                {task.id === 'cleanup_data' && (
                  <button
                    onClick={() => runMaintenanceTask('cleanup')}
                    disabled={runningTask !== null}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    title="Clean Old Data"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
          Database Optimization
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg">
            <HardDrive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-100">Materialized Views</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Pre-computed analytics for faster queries</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-4 bg-white dark:bg-slate-800 rounded-lg">
            <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-gray-900 dark:text-slate-100">Performance Indexes</p>
              <p className="text-sm text-gray-600 dark:text-slate-400">Optimized indexes for common queries</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}