'use client';

import { useEffect, useState } from 'react';
import { Database, RefreshCw, CheckCircle, GitBranch } from 'lucide-react';

interface MaintenanceStatus {
  allApplied: boolean;
  pendingCount: number;
  recommendations: string[];
}

export function DatabaseMaintenance() {
  const [migrationStatus, setMigrationStatus] = useState<MaintenanceStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTask, setRunningTask] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/admin/migration-status');
      if (response.ok) {
        const data = await response.json();
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error('Error fetching migration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQuickFix = async () => {
    setRunningTask('quick-fix');
    try {
      const response = await fetch('/api/admin/quick-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        await fetchStatus(); // Refresh status
      }
    } catch (error) {
      console.error('Error running quick fix:', error);
    } finally {
      setRunningTask(null);
    }
  };

  const runMaintenance = async () => {
    setRunningTask('maintenance');
    try {
      const response = await fetch('/api/admin/database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-maintenance' })
      });

      if (response.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error running maintenance:', error);
    } finally {
      setRunningTask(null);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-48 mb-4"></div>
          <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
            Database Maintenance
          </h3>
        </div>
        
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="p-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Migration Status */}
      {migrationStatus && !migrationStatus.allApplied ? (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <GitBranch className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                  Database Setup Needed ({migrationStatus.pendingCount} items)
                </h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Run migrations to unlock performance optimizations
                </p>
              </div>
            </div>
            
            <button
              onClick={runQuickFix}
              disabled={runningTask !== null}
              className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${runningTask === 'quick-fix' ? 'animate-spin' : ''}`} />
              <span>Quick Fix</span>
            </button>
          </div>
        </div>
      ) : migrationStatus?.allApplied ? (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <h4 className="font-medium text-green-800 dark:text-green-200">
                Database Optimized
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                All performance features are active
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Maintenance Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-slate-100">
            Maintenance Tasks
          </h4>
          <p className="text-sm text-gray-600 dark:text-slate-400">
            Keep your database running smoothly
          </p>
        </div>
        
        <button
          onClick={runMaintenance}
          disabled={runningTask !== null}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${runningTask === 'maintenance' ? 'animate-spin' : ''}`} />
          <span>Run Maintenance</span>
        </button>
      </div>
    </div>
  );
}