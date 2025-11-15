'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';

interface TIRData {
  result: {
    totalReadings: number;
    ranges: {
      veryLow: { count: number; percentage: number; threshold: string };
      low: { count: number; percentage: number; threshold: string };
      inRange: { count: number; percentage: number; threshold: string };
      high: { count: number; percentage: number; threshold: string };
      veryHigh: { count: number; percentage: number; threshold: string };
    };
    averageGlucose: number;
    glucoseManagementIndicator: number;
    coefficientOfVariation: number;
    standardDeviation: number;
    assessment: {
      tirRating: string;
      belowRangeRating: string;
      aboveRangeRating: string;
      overallRating: string;
      recommendations: string[];
    };
  };
  trends: Array<{
    period: string;
    inRangePercentage: number;
    belowRangePercentage: number;
    aboveRangePercentage: number;
    averageGlucose: number;
    readingCount: number;
  }> | null;
  targets: any;
}

const COLORS = {
  veryLow: '#ef4444',
  low: '#f97316',
  inRange: '#22c55e',
  high: '#eab308',
  veryHigh: '#dc2626',
};

export function TimeInRangeAnalysis() {
  const [data, setData] = useState<TIRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(14);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/analytics/time-in-range?days=${days}&trends=true&trendPeriod=daily`);
      const result = await response.json();
      
      if (!result.success) {
        if (result.error === 'Insufficient data') {
          const count = result.readingCount || 0;
          const needed = 50 - count;
          setError(`Need ${needed} more glucose readings for Time-in-Range analysis (${count}/50 readings available)`);
        } else {
          setError(result.message || result.error || 'Failed to load Time-in-Range analysis');
        }
        return;
      }
      
      setData(result.data);
    } catch (err) {
      console.error('Time-in-Range error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load Time-in-Range analysis');
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'good': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      case 'fair': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'poor': return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
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
          <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-2">
              Time-in-Range Analysis Not Available Yet
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
              {error}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>How to enable Time-in-Range analysis:</strong>
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                <li>Ensure your Dexcom CGM is connected and syncing</li>
                <li>Wait for more glucose readings to accumulate</li>
                <li>Requires at least 50 readings for accuracy</li>
                <li>Check back in a few days as more data is collected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const pieData = [
    { name: 'Very Low', value: data.result.ranges.veryLow.percentage, count: data.result.ranges.veryLow.count },
    { name: 'Low', value: data.result.ranges.low.percentage, count: data.result.ranges.low.count },
    { name: 'In Range', value: data.result.ranges.inRange.percentage, count: data.result.ranges.inRange.count },
    { name: 'High', value: data.result.ranges.high.percentage, count: data.result.ranges.high.count },
    { name: 'Very High', value: data.result.ranges.veryHigh.percentage, count: data.result.ranges.veryHigh.count },
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-6">
      {/* Header with Main TIR Display */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Time-in-Range
            </h3>
          </div>

          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm"
          >
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        {/* Main TIR Display */}
        <div className={`border rounded-lg p-6 ${getRatingColor(data.result.assessment.tirRating)}`}>
          <div className="text-center">
            <div className="text-5xl md:text-6xl font-bold mb-2">
              {data.result.ranges.inRange.percentage}%
            </div>
            <div className="text-base md:text-lg font-medium mb-3">
              In Range (70-180 mg/dL)
            </div>
            <div className="flex items-center justify-center flex-wrap gap-2 text-sm">
              {data.result.assessment.tirRating === 'excellent' || data.result.assessment.tirRating === 'good' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="font-medium">
                {data.result.assessment.tirRating.toUpperCase()}
              </span>
              <span className="text-xs opacity-75">
                ({data.result.ranges.inRange.count}/{data.result.totalReadings} readings)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pie Chart and Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Glucose Distribution
          </h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index]} />
                ))}
              </Pie>
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-gray-900 dark:text-slate-100 mb-1">
                          {data.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-slate-400">
                          {data.value}% ({data.count} readings)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Range Breakdown
          </h4>
          <div className="space-y-2">
            {[
              { key: 'veryLow', label: 'Very Low', color: COLORS.veryLow },
              { key: 'low', label: 'Low', color: COLORS.low },
              { key: 'inRange', label: 'In Range', color: COLORS.inRange },
              { key: 'high', label: 'High', color: COLORS.high },
              { key: 'veryHigh', label: 'Very High', color: COLORS.veryHigh },
            ].map(({ key, label, color }) => {
              const range = data.result.ranges[key as keyof typeof data.result.ranges];
              if (range.percentage === 0) return null;
              return (
                <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="w-3 h-3 rounded flex-shrink-0" style={{ backgroundColor: color }}></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">{label}</div>
                      <div className="text-xs text-gray-600 dark:text-slate-400 truncate">{range.threshold}</div>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-base font-bold text-gray-900 dark:text-slate-100">{range.percentage}%</div>
                    <div className="text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">{range.count}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trend Chart */}
      {data.trends && data.trends.length > 1 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
          <h4 className="text-md font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Time-in-Range Trend
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
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                stroke="#64748b"
                label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip />
              <ReferenceLine y={70} stroke="#22c55e" strokeDasharray="3 3" label="Target 70%" />
              <Line type="monotone" dataKey="inRangePercentage" stroke="#22c55e" strokeWidth={3} name="In Range" />
              <Line type="monotone" dataKey="belowRangePercentage" stroke="#f97316" strokeWidth={2} name="Below Range" />
              <Line type="monotone" dataKey="aboveRangePercentage" stroke="#eab308" strokeWidth={2} name="Above Range" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Avg Glucose</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {data.result.averageGlucose}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">mg/dL</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">GMI (est. A1C)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {data.result.glucoseManagementIndicator}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">Estimated</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Std Deviation</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {data.result.standardDeviation}
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">mg/dL</div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-4">
          <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">Variability (CV)</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {data.result.coefficientOfVariation}%
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-500">
            {data.result.coefficientOfVariation < 36 ? 'Good' : 'High'}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {data.result.assessment.recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Recommendations
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                {data.result.assessment.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2 flex-shrink-0">•</span>
                    <span className="break-words">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
