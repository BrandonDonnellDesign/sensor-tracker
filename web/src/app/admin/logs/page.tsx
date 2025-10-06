'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/providers/auth-provider';

interface SystemLogEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
  user_hash?: string;
}

interface LogSummary {
  errors_24h: number;
  warnings_24h: number;
  info_24h: number;
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<SystemLogEvent[]>([]);
  const [logSummary, setLogSummary] = useState<LogSummary>({
    errors_24h: 0,
    warnings_24h: 0,
    info_24h: 0
  });

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await fetch('/api/admin/logs');
      const result = await response.json();
      
      if (result.success) {
        setLogs(result.data.logs);
        setLogSummary(result.data.summary);
      } else {
        console.error('Failed to fetch logs:', result.error);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.id) {
        router.push('/auth/login');
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error || !profile || (profile as any).role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        setIsAdmin(true);
        // Fetch logs after confirming admin access
        fetchLogs();
      } catch (error) {
        console.error('Admin access check failed:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAccess();
  }, [user, router]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
      case 'warn': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
      case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sensors': return 'text-green-700 bg-green-100 dark:bg-green-900/30';
      case 'photos': return 'text-purple-700 bg-purple-100 dark:bg-purple-900/30';
      case 'users': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30';
      case 'storage': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30';
      case 'quality': return 'text-red-700 bg-red-100 dark:bg-red-900/30';
      case 'system': return 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30';
      case 'ocr': return 'text-purple-700 bg-purple-100 dark:bg-purple-900/30';
      case 'dexcom': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30';
      case 'notifications': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30';
      default: return 'text-gray-700 bg-gray-100 dark:bg-gray-900/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">System Logs</h1>
            <p className="text-lg text-gray-600 dark:text-slate-400 mt-2">
              Monitor system events and activity from real database data
            </p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={logsLoading}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
          >
            <svg className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {logsLoading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {/* Log Level Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Errors (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {logsLoading ? '—' : logSummary.errors_24h}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Warnings (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {logsLoading ? '—' : logSummary.warnings_24h}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-slate-400">Info (24h)</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {logsLoading ? '—' : logSummary.info_24h}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logs Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Recent Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  User
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
              {logs.length === 0 && !logsLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-slate-400">
                    No recent activity found. Logs are generated from real database events.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-slate-100">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLevelColor(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-slate-100">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                      {log.user_hash || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Implementation Details */}
      <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-3">✅ Real Implementation Active</h3>
        <ul className="list-disc list-inside space-y-2 text-green-800 dark:text-green-200">
          <li>✅ Logs generated from real database activity (sensors, photos, users)</li>
          <li>✅ User IDs hashed with SHA-256 for privacy protection</li>
          <li>✅ Real-time metrics from last 24 hours of activity</li>
          <li>✅ Smart categorization of events (sensors, photos, users, storage, quality)</li>
          <li>✅ Automatic quality control alerts for problematic sensors</li>
          <li>✅ Storage monitoring for large file uploads</li>
        </ul>
      </div>
    </div>
  );
}