'use client';

import { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface A1CData {
  current: {
    estimatedA1C: number;
    averageGlucose: number;
    readingCount: number;
    dateRange: { start: string; end: string };
    category: string;
    recommendation: string;
  };
  trends: Array<{
    period: string;
    estimatedA1C: number;
    averageGlucose: number;
    readingCount: number;
    change: number | null;
    changePercentage: number | null;
  }> | null;
  targets: any;
  statistics: {
    minGlucose: number;
    maxGlucose: number;
    standardDeviation: number;
    coefficientOfVariation: number;
  };
  daysAnalyzed: number;
}

export function A1CEstimation() {
  const [data, setData] = useState<A1CData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(90);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/a1c-estimation?days=${days}&trends=true`);
      const result = await response.json();
      
      if (!result.success) {
        // Handle insufficient data gracefully
        if (result.error === 'Insufficient data') {
          const count = result.readingCount || 0;
          const needed = 50 - count;
          setError(`Need ${needed} more glucose readings for A1C estimation (${count}/50 readings available)`);
        } else {
          setError(result.message || result.error || 'Failed to load A1C estimation');
        }
        return;
      }
      
      setData(result.data);
    } catch (err) {
      console.error('A1C estimation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load A1C estimation');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'poor': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'very-poor': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    if (category === 'excellent' || category === 'good') {
      return <CheckCircle className="h-6 w-6" />;
    }
    return <AlertCircle className="h-6 w-6" />;
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">
              A1C Estimation Not Available
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const latestTrend = data.trends && data.trends.length > 0 ? data.trends[data.trends.length - 1] : null;
  const trendChange = latestTrend?.change || 0;

  return (
    <div className="space-y-6">
      {/* Header with Main Display */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Estimated A1C
            </h3>
          </div>

          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>6 months</option>
          </select>
        </div>

        {/* Current A1C Display */}
        <div className={`border rounded-lg p-6 ${getCategoryColor(data.current.category)}`}>
          <div className="text-center">
            <div className="text-5xl md:text-6xl font-bold mb-2">
              {data.current.estimatedA1C}%
            </div>
            
            <div className="text-base mb-3">
              Avg Glucose: {data.current.averageGlucose} mg/dL
            </div>

            <div className="flex items-center justify-center flex-wrap gap-2 text-sm">
              {getCategoryIcon(data.current.category)}
              <span className="font-medium uppercase">
                {data.current.category.replace('-', ' ')}
              </span>
              {trendChange !== 0 && (
                <>
                  <span>•</span>
                  {trendChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>
                    {trendChange > 0 ? '+' : ''}{trendChange}%
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {data.current.recommendation && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 break-words">
              {data.current.recommendation}
            </p>
          </div>
        )}
      </div>

      {/* Trend Chart */}
      {data.trends && data.trends.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
            A1C Trend Over Time
          </h4>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trends} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="period" 
                tick={{ fontSize: 12 }}
                stroke="#64748b"
              />
              <YAxis 
                domain={[4, 10]}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                label={{ value: 'A1C (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-gray-900 dark:text-slate-100 mb-2">
                          {data.period}
                        </p>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">A1C:</span>
                            <span className="font-medium">{data.estimatedA1C}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Avg Glucose:</span>
                            <span className="font-medium">{data.averageGlucose} mg/dL</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600 dark:text-slate-400">Readings:</span>
                            <span className="font-medium">{data.readingCount}</span>
                          </div>
                          {data.change !== null && (
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-slate-400">Change:</span>
                              <span className={`font-medium ${data.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {data.change > 0 ? '+' : ''}{data.change}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={7.0} stroke="#f59e0b" strokeDasharray="3 3" label="ADA Target" />
              <ReferenceLine y={5.7} stroke="#10b981" strokeDasharray="3 3" label="Non-diabetic" />
              <Line 
                type="monotone" 
                dataKey="estimatedA1C" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistics Grid - Simplified */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">Min</div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {data.statistics.minGlucose}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">Max</div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {data.statistics.maxGlucose}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">Std Dev</div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {data.statistics.standardDeviation}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-3">
          <div className="text-xs text-gray-600 dark:text-slate-400 mb-1">CV</div>
          <div className="text-xl font-bold text-gray-900 dark:text-slate-100">
            {data.statistics.coefficientOfVariation}%
          </div>
        </div>
      </div>

    </div>
  );
}
