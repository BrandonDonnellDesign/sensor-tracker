'use client';

import { useEffect, useState } from 'react';
import { AdminGuard } from '@/components/admin/admin-guard';
import Link from 'next/link';

interface SystemHealth {
  database_status: 'healthy' | 'warning' | 'error';
  database_connections: number;
  storage_usage_mb: number;
  recent_errors: number;
  uptime_hours: number;
}

interface MaintenanceAction {
  id: string;
  name: string;
  description: string;
  category: 'cleanup' | 'optimization' | 'backup' | 'monitoring';
  dangerous: boolean;
}

const MAINTENANCE_ACTIONS: MaintenanceAction[] = [
  {
    id: 'cleanup_old_logs',
    name: 'Clean Old Logs',
    description: 'Remove system logs older than 30 days',
    category: 'cleanup',
    dangerous: false
  },
  {
    id: 'cleanup_expired_sessions',
    name: 'Clean Expired Sessions',
    description: 'Remove expired user sessions and tokens',
    category: 'cleanup',
    dangerous: false
  },
  {
    id: 'optimize_database',
    name: 'Optimize Database',
    description: 'Run VACUUM and ANALYZE on database tables',
    category: 'optimization',
    dangerous: false
  },
  {
    id: 'backup_database',
    name: 'Create Database Backup',
    description: 'Create a full database backup',
    category: 'backup',
    dangerous: false
  },
  {
    id: 'reset_analytics',
    name: 'Reset Analytics',
    description: 'Clear all analytics data (DANGEROUS)',
    category: 'cleanup',
    dangerous: true
  }
];

export default function AdminMaintenancePage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    loadSystemHealth();
  }, []);

  const loadSystemHealth = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch('/api/admin/system-health');
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load system health');
      }
      
      setHealth(data.health);
    } catch (err) {
      console.error('Error loading system health:', err);
      setError(err instanceof Error ? err.message : 'Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  const runMaintenanceAction = async (actionId: string) => {
    const action = MAINTENANCE_ACTIONS.find(a => a.id === actionId);
    if (!action) return;

    if (action.dangerous) {
      const confirmed = window.confirm(
        `This action is DANGEROUS and cannot be undone: ${action.name}\n\nAre you sure you want to continue?`
      );
      if (!confirmed) return;
    }

    setRunningAction(actionId);
    try {
      const response = await fetch('/api/admin/system-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actionId }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to run maintenance action');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Action failed');
      }
      
      setActionResults(prev => ({
        ...prev,
        [actionId]: {
          success: true,
          message: data.message || `${action.name} completed successfully`
        }
      }));
      
      // Refresh health after maintenance
      await loadSystemHealth();
    } catch (err) {
      console.error('Error running maintenance action:', err);
      setActionResults(prev => ({
        ...prev,
        [actionId]: {
          success: false,
          message: err instanceof Error ? err.message : 'Action failed'
        }
      }));
    } finally {
      setRunningAction(null);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cleanup': return 'bg-blue-900/30 text-blue-400 border border-blue-700';
      case 'optimization': return 'bg-green-900/30 text-green-400 border border-green-700';
      case 'backup': return 'bg-purple-900/30 text-purple-400 border border-purple-700';
      case 'monitoring': return 'bg-orange-900/30 text-orange-400 border border-orange-700';
      default: return 'bg-slate-700 text-slate-400 border border-slate-600';
    }
  };

  return (
    <AdminGuard>
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-slate-400 mb-2">
              <Link href="/admin" className="hover:text-white transition-colors">
                ← Back to Admin Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white">System Maintenance</h1>
            <p className="text-slate-400 mt-1">
              Monitor system health and perform maintenance operations
            </p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">Error loading system health</h3>
                  <div className="mt-2 text-sm text-red-300">
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
          ) : health ? (
            <div className="space-y-6">
              {/* System Health Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-center">
                    <div className={`text-2xl font-bold capitalize ${getHealthColor(health.database_status)}`}>
                      {health.database_status}
                    </div>
                    <div className="text-sm text-slate-400">Database Status</div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {health.database_connections}
                    </div>
                    <div className="text-sm text-slate-400">DB Connections</div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {health.storage_usage_mb} MB
                    </div>
                    <div className="text-sm text-slate-400">Storage Used</div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {health.uptime_hours}h
                    </div>
                    <div className="text-sm text-slate-400">Uptime</div>
                  </div>
                </div>
              </div>

              {/* Recent Errors Alert */}
              {health.recent_errors > 0 && (
                <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-200">
                          {health.recent_errors} recent error{health.recent_errors !== 1 ? 's' : ''} detected
                        </h3>
                        <div className="mt-2 text-sm text-yellow-300">
                          <p>Issues detected in the system that may require attention.</p>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Link
                        href="/admin/logs"
                        className="bg-yellow-800 hover:bg-yellow-700 text-yellow-100 px-3 py-1 rounded-md text-sm font-medium transition-colors inline-flex items-center"
                      >
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        View Logs
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Maintenance Actions */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  Maintenance Actions
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {MAINTENANCE_ACTIONS.map((action) => (
                    <div
                      key={action.id}
                      className="bg-slate-800 rounded-lg p-6 border border-slate-700"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-medium text-white">
                              {action.name}
                            </h3>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(action.category)}`}>
                              {action.category}
                            </span>
                            {action.dangerous && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-700">
                                DANGEROUS
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mb-4">
                            {action.description}
                          </p>
                          
                          {/* Action Result */}
                          {actionResults[action.id] && (
                            <div className={`text-xs p-2 rounded ${(
                              actionResults[action.id].success 
                                ? 'bg-green-900/30 text-green-400 border border-green-700' 
                                : 'bg-red-900/30 text-red-400 border border-red-700'
                            )}`}>
                              {actionResults[action.id].message}
                            </div>
                          )}
                        </div>
                        
                        <button
                          onClick={() => runMaintenanceAction(action.id)}
                          disabled={runningAction !== null}
                          className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                            action.dangerous
                              ? 'bg-red-600 text-white hover:bg-red-700'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {runningAction === action.id ? 'Running...' : 'Run'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2">
                <button
                  onClick={loadSystemHealth}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  Refresh Health Check
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AdminGuard>
  );
}