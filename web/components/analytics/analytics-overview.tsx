'use client';

import { useState, useEffect } from 'react';
import { Activity, Target, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface OverviewData {
  tir: {
    value: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    trend: number;
  } | null;
  a1c: {
    value: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    trend: number;
  } | null;
  avgGlucose: number | null;
  cv: number | null;
  dawnPhenomenon: boolean | null;
}

export function AnalyticsOverview() {
  const [data, setData] = useState<OverviewData>({
    tir: null,
    a1c: null,
    avgGlucose: null,
    cv: null,
    dawnPhenomenon: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      // Load TIR data
      const tirResponse = await fetch('/api/analytics/time-in-range?days=14');
      const tirResult = await tirResponse.json();
      
      // Load A1C data
      const a1cResponse = await fetch('/api/analytics/a1c-estimation?days=90');
      const a1cResult = await a1cResponse.json();

      setData({
        tir: tirResult.success ? {
          value: tirResult.data.result.ranges.inRange.percentage,
          status: tirResult.data.result.assessment.tirRating,
          trend: 0, // Could calculate from trends
        } : null,
        a1c: a1cResult.success ? {
          value: a1cResult.data.current.estimatedA1C,
          status: a1cResult.data.current.category,
          trend: a1cResult.data.trends?.[a1cResult.data.trends.length - 1]?.change || 0,
        } : null,
        avgGlucose: a1cResult.success ? a1cResult.data.current.averageGlucose : null,
        cv: a1cResult.success ? a1cResult.data.statistics.coefficientOfVariation : null,
        dawnPhenomenon: null, // Could add dawn phenomenon check
      });
    } catch (error) {
      console.error('Error loading overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'poor': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-slate-600 rounded w-1/2"></div>
              <div className="h-8 bg-gray-200 dark:bg-slate-600 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Time-in-Range */}
        {data.tir ? (
          <div className={`rounded-xl border p-6 ${getStatusColor(data.tir.status)}`}>
            <div className="flex items-center justify-between mb-3">
              <Target className="h-5 w-5" />
              <span className="text-xs font-medium uppercase">{data.tir.status}</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.tir.value}%
            </div>
            <div className="text-sm opacity-90">
              Time-in-Range
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">TIR unavailable</span>
            </div>
          </div>
        )}

        {/* A1C */}
        {data.a1c ? (
          <div className={`rounded-xl border p-6 ${getStatusColor(data.a1c.status)}`}>
            <div className="flex items-center justify-between mb-3">
              <Activity className="h-5 w-5" />
              <span className="text-xs font-medium uppercase">{data.a1c.status}</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {data.a1c.value}%
            </div>
            <div className="text-sm opacity-90 flex items-center gap-1">
              Estimated A1C
              {data.a1c.trend !== 0 && (
                <span className="flex items-center text-xs">
                  {data.a1c.trend > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(data.a1c.trend)}%
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">A1C unavailable</span>
            </div>
          </div>
        )}

        {/* Average Glucose */}
        {data.avgGlucose ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-slate-400">90 DAYS</span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {data.avgGlucose}
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Avg Glucose (mg/dL)
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">Glucose unavailable</span>
            </div>
          </div>
        )}

        {/* Glucose Variability */}
        {data.cv !== null ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center justify-between mb-3">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className={`text-xs font-medium ${data.cv < 36 ? 'text-green-600' : 'text-yellow-600'}`}>
                {data.cv < 36 ? 'GOOD' : 'HIGH'}
              </span>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-1">
              {data.cv}%
            </div>
            <div className="text-sm text-gray-600 dark:text-slate-400">
              Variability (CV)
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
            <div className="flex items-center space-x-2 text-gray-500">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">CV unavailable</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Insights */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Quick Insights
        </h3>
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          {data.tir && data.tir.value >= 70 && (
            <p>✓ Excellent time-in-range! You're meeting the ADA target of &gt;70%.</p>
          )}
          {data.tir && data.tir.value < 70 && (
            <p>• Work on increasing time-in-range to reach the 70% target.</p>
          )}
          {data.cv !== null && data.cv < 36 && (
            <p>✓ Good glucose stability with CV &lt; 36%.</p>
          )}
          {data.cv !== null && data.cv >= 36 && (
            <p>• High glucose variability detected. Focus on consistent meal timing and insulin dosing.</p>
          )}
          {data.a1c && data.a1c.value < 7 && (
            <p>✓ A1C is at or below the ADA target of 7%.</p>
          )}
          {!data.tir && !data.a1c && (
            <p>Connect your CGM and log more data to see personalized insights.</p>
          )}
        </div>
      </div>
    </div>
  );
}
