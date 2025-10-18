'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminGuard } from '@/components/admin/admin-guard';
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

  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logs, setLogs] = useState<SystemLogEvent[]>([]);
  const [logSummary, setLogSummary] = useState<LogSummary>({
    errors_24h: 0,
    warnings_24h: 0,
    info_24h: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false
  });

  const [levelFilter, setLevelFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const fetchLogs = useCallback(async (page: number = currentPage) => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', logsPerPage.toString());
      params.append('offset', ((page - 1) * logsPerPage).toString());
      if (levelFilter) params.append('level', levelFilter);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setLogs(result.data.logs);
        setLogSummary(result.data.summary);
        setPagination(result.data.pagination);
        setCurrentPage(page);
      } else {
        setLogs([]);
        setLogSummary({ errors_24h: 0, warnings_24h: 0, info_24h: 0 });
        setPagination({
          currentPage: 1,
          totalPages: 1,
          totalCount: 0,
          hasNextPage: false,
          hasPrevPage: false
        });
        // Show error to user
        alert('Failed to fetch logs: ' + (result.error || 'Unknown error'));
        console.error('Failed to fetch logs:', result.error);
      }
    } catch (error) {
      setLogs([]);
      setLogSummary({ errors_24h: 0, warnings_24h: 0, info_24h: 0 });
      alert('Error fetching logs: ' + error);
      console.error('Error fetching logs:', error);
    } finally {
      setLogsLoading(false);
    }
  }, [currentPage, levelFilter, categoryFilter, logsPerPage]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setCurrentPage(1);
    fetchLogs(1);
    setLoading(false);
  }, [levelFilter, categoryFilter, fetchLogs]);

  useEffect(() => {
    // Fetch logs when page changes
    fetchLogs(currentPage);
  }, [currentPage, fetchLogs]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'warn': return 'text-yellow-700 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'info': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      default: return 'text-gray-700 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'sensors': return 'text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300';
      case 'photos': return 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300';
      case 'users': return 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300';
      case 'storage': return 'text-orange-700 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300';
      case 'quality': return 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300';
      case 'system': return 'text-indigo-700 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300';
      case 'monitoring': return 'text-teal-700 bg-teal-100 dark:bg-teal-900/30 dark:text-teal-300';
      case 'database': return 'text-slate-700 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-300';
      case 'ocr': return 'text-violet-700 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-300';
      case 'dexcom': return 'text-sky-700 bg-sky-100 dark:bg-sky-900/30 dark:text-sky-300';
      case 'notifications': return 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300';
      default: return 'text-gray-700 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <button
            onClick={() => router.push('/admin/overview')}
            className="flex items-center gap-0.5 px-1.5 py-0.5 mb-2 bg-white/60 dark:bg-slate-800/60 hover:bg-white dark:hover:bg-slate-700 text-xs text-gray-700 dark:text-slate-200 rounded border border-gray-200 dark:border-slate-700 shadow-sm transition-all duration-150"
          >
            <svg className="w-2.5 h-2.5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 mb-2">
            System Logs
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 mb-1">
            Monitor system events and activity from real database data
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
          >
            <option value="">All Levels</option>
            <option value="error">Errors</option>
            <option value="warn">Warnings</option>
            <option value="info">Info</option>
          </select>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm"
          >
            <option value="">All Categories</option>
            <option value="users">Users</option>
            <option value="sensors">Sensors</option>
            <option value="photos">Photos</option>
            <option value="ocr">OCR</option>
            <option value="dexcom">Dexcom</option>
            <option value="notifications">Notifications</option>
            <option value="system">System</option>
            <option value="database">Database</option>
            <option value="storage">Storage</option>
            <option value="quality">Quality</option>
            <option value="monitoring">Monitoring</option>
          </select>

          <button
            onClick={() => fetchLogs()}
            disabled={logsLoading}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 hover:from-blue-600 hover:via-indigo-600 hover:to-purple-600 disabled:from-gray-400 disabled:via-gray-400 disabled:to-gray-400 text-white rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105"
          >
            <svg className={`w-4 h-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {logsLoading ? 'Refreshing...' : 'Refresh Logs'}
          </button>
        </div>
      </div>

      {/* Log Level Summary */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-md shadow-red-500/25 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Errors (24h)</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                {logsLoading ? '—' : logSummary.errors_24h}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-md shadow-yellow-500/25 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Warnings (24h)</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                {logsLoading ? '—' : logSummary.warnings_24h}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl p-6 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 group">
          <div className="flex items-center">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wider">Info (24h)</p>
              <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100 mt-0.5">
                {logsLoading ? '—' : logSummary.info_24h}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200/50 dark:border-slate-700/50 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-700/50">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100">Recent Events</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mt-0.5">Real-time system activity and monitoring</p>
        </div>
        
        {logs.length === 0 && !logsLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 mb-1">No Recent Activity</h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-400 mb-2">
              {logSummary.errors_24h === 0 && logSummary.warnings_24h === 0 && logSummary.info_24h === 0 
                ? 'System logs could not be loaded. Please check database connectivity or try again later.'
                : 'Logs are generated from real database events.'
              }
            </p>
            <button
              onClick={() => fetchLogs()}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
            >
              Retry Loading
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200/50 dark:divide-slate-700/50">
            {logs.map((log, index) => (
              <div key={log.id} className={`px-6 py-4 hover:bg-gray-50/50 dark:hover:bg-slate-700/30 transition-all duration-200 ${index === 0 ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                <div className="flex items-start space-x-4">
                  {/* Level Badge */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center px-1 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold shadow-sm ${getLevelColor(log.level)}`}>
                      {log.level === 'error' && (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      )}
                      {log.level === 'warn' && (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {log.level === 'info' && (
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {log.level.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {/* Category Badge */}
                        <span className={`inline-flex items-center px-1 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium ${getCategoryColor(log.category)}`}>
                          {log.category.toUpperCase()}
                        </span>
                        {/* Timestamp */}
                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {/* User Hash */}
                      {log.user_hash && (
                        <span className="text-[9px] sm:text-[10px] text-gray-400 dark:text-slate-500 font-mono bg-gray-100 dark:bg-slate-700 px-1 py-0.5 rounded">
                          {log.user_hash}
                        </span>
                      )}
                    </div>
                    {/* Message */}
                    <p className="text-xs sm:text-sm text-gray-900 dark:text-slate-100 leading-relaxed">
                      {log.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {logs.length > 0 && (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-xl shadow-lg border border-white/20 dark:border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, pagination.totalCount)} of {pagination.totalCount} entries
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage || logsLoading}
                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage || logsLoading}
                className="px-3 py-1 text-sm bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Implementation Details */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 md:p-5 border border-green-200/50 dark:border-green-700/50 shadow-lg">
        <div className="flex items-center mb-2 md:mb-3">
          <div className="w-6 h-6 md:w-7 md:h-7 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md shadow-green-500/25 mr-1.5 md:mr-2">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xs md:text-sm font-semibold text-green-900 dark:text-green-100">Real Implementation Active</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">Logs from real database activity</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">SHA-256 hashed user IDs for privacy</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">Real-time 24-hour metrics</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">Smart event categorization</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">Automatic quality control alerts</span>
          </div>
          <div className="flex items-center space-x-1 md:space-x-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-[10px] md:text-xs text-green-800 dark:text-green-200">Storage monitoring & optimization</span>
          </div>
        </div>
      </div>
      </div>
    </AdminGuard>
  );
}