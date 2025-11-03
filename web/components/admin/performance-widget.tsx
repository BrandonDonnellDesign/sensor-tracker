'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

interface PerformanceStats {
  overallScore: number;
  grade: string;
  metrics: {
    lcp: { value: number; rating: string };
    inp: { value: number; rating: string };
    cls: { value: number; rating: string };
    fcp: { value: number; rating: string };
  };
  trend: 'up' | 'down' | 'stable';
  totalMeasurements: number;
}

export function PerformanceWidget() {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/performance-stats');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch performance stats`);
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching performance stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Memoized utility functions - MUST be called before any early returns
  const getTrendIcon = useMemo(() => {
    if (!stats) return <Minus className="w-4 h-4 text-gray-500" />;
    
    switch (stats.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  }, [stats?.trend]);

  const getGradeColor = useCallback((grade: string) => {
    const gradeColors = {
      A: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30',
      B: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30',
      C: 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30',
      D: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30',
      F: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30',
    } as const;
    
    return gradeColors[grade as keyof typeof gradeColors] || 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  }, []);

  const getRatingColor = useCallback((rating: string) => {
    const ratingColors = {
      good: 'bg-green-500',
      'needs-improvement': 'bg-yellow-500',
      poor: 'bg-red-500',
    } as const;
    
    return ratingColors[rating as keyof typeof ratingColors] || 'bg-gray-500';
  }, []);

  useEffect(() => {
    fetchPerformanceStats();
  }, [fetchPerformanceStats]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Performance</h3>
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || !stats || !stats.metrics) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Performance</h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>
        <div className="text-center py-4">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {error || 'No performance data available'}
          </p>
          <a
            href="/admin/performance"
            className="inline-flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-2"
          >
            <span>Set up monitoring</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }



  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">Performance</h3>
        <div className="flex items-center space-x-2">
          {getTrendIcon}
          <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats.overallScore}
          </div>
          <div className="text-sm text-gray-600 dark:text-slate-400">
            Overall Score
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getGradeColor(stats.grade)}`}>
          Grade {stats.grade}
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">LCP</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {stats.metrics?.lcp?.value || 0}ms
            </span>
            <div className={`w-2 h-2 rounded-full ${getRatingColor(stats.metrics?.lcp?.rating || 'poor')}`}></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">INP</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {stats.metrics?.inp?.value || 0}ms
            </span>
            <div className={`w-2 h-2 rounded-full ${getRatingColor(stats.metrics?.inp?.rating || 'poor')}`}></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">CLS</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {(stats.metrics?.cls?.value || 0).toFixed(3)}
            </span>
            <div className={`w-2 h-2 rounded-full ${getRatingColor(stats.metrics?.cls?.rating || 'poor')}`}></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-slate-400">FCP</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {stats.metrics?.fcp?.value || 0}ms
            </span>
            <div className={`w-2 h-2 rounded-full ${getRatingColor(stats.metrics?.fcp?.rating || 'poor')}`}></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-slate-500">
            {stats.totalMeasurements.toLocaleString()} measurements
          </span>
          <a
            href="/admin/performance"
            className="inline-flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            <span>View Details</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}