'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { createClient } from '@/lib/supabase-client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';

interface BasalTrendData {
  date: string;
  basal: number;
  formattedDate: string;
  isOutlier: boolean;
}

interface BasalStats {
  average: number;
  standardDeviation: number;
  consistencyScore: number;
  outlierDays: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface BasalTrendsProps {
  className?: string;
}

export function BasalTrends({ className = '' }: BasalTrendsProps) {
  const { user } = useAuth();
  const [trendData, setTrendData] = useState<BasalTrendData[]>([]);
  const [stats, setStats] = useState<BasalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<14 | 30 | 60>(14);

  useEffect(() => {
    if (user) {
      fetchBasalTrends();
    }
  }, [user, selectedPeriod]);

  const fetchBasalTrends = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();
      
      // Get basal insulin logs for the selected period
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedPeriod);
      startDate.setHours(0, 0, 0, 0);

      const { data: logs, error } = await supabase
        .from('all_insulin_delivery')
        .select('units, taken_at')
        .eq('user_id', user.id)
        .eq('delivery_type', 'basal')
        .gte('taken_at', startDate.toISOString())
        .order('taken_at', { ascending: true });

      if (error) throw error;

      // Group by date and sum basal for each day
      const dailyBasal = new Map<string, number>();
      
      logs?.forEach(log => {
        const date = new Date(log.taken_at).toISOString().split('T')[0];
        const current = dailyBasal.get(date) || 0;
        dailyBasal.set(date, current + log.units);
      });

      // Create array with all days (including zeros)
      const trendsArray: BasalTrendData[] = [];
      for (let i = selectedPeriod - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const basal = dailyBasal.get(dateStr) || 0;
        
        trendsArray.push({
          date: dateStr,
          basal: Math.round(basal * 10) / 10,
          formattedDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          isOutlier: false // Will be calculated below
        });
      }

      // Calculate statistics
      const basalValues = trendsArray.filter(d => d.basal > 0).map(d => d.basal);
      if (basalValues.length > 0) {
        const average = basalValues.reduce((sum, val) => sum + val, 0) / basalValues.length;
        const variance = basalValues.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / basalValues.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Mark outliers (more than 1.5 standard deviations from mean)
        const outlierThreshold = 1.5 * standardDeviation;
        trendsArray.forEach(day => {
          if (day.basal > 0) {
            day.isOutlier = Math.abs(day.basal - average) > outlierThreshold;
          }
        });

        // Calculate trend (linear regression slope)
        const n = basalValues.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        const xMean = (n - 1) / 2;
        const yMean = average;
        
        const numerator = xValues.reduce((sum, x, i) => sum + (x - xMean) * (basalValues[i] - yMean), 0);
        const denominator = xValues.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0);
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
        if (Math.abs(slope) > 0.1) {
          trend = slope > 0 ? 'increasing' : 'decreasing';
        }

        // Consistency score (inverse of coefficient of variation)
        const coefficientOfVariation = average > 0 ? standardDeviation / average : 0;
        const consistencyScore = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));

        setStats({
          average: Math.round(average * 10) / 10,
          standardDeviation: Math.round(standardDeviation * 10) / 10,
          consistencyScore: Math.round(consistencyScore),
          outlierDays: trendsArray.filter(d => d.isOutlier).length,
          trend
        });
      }

      setTrendData(trendsArray);

    } catch (error) {
      console.error('Error fetching basal trends:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-slate-600 rounded w-1/3"></div>
          <div className="h-40 bg-gray-200 dark:bg-slate-600 rounded"></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 dark:bg-slate-600 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-slate-600 rounded"></div>
            <div className="h-16 bg-gray-200 dark:bg-slate-600 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const hasData = trendData.some(d => d.basal > 0);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Basal Rate Trends
            </h3>
            <p className="text-sm text-gray-600 dark:text-slate-400">
              Daily basal insulin consistency and patterns
            </p>
          </div>
        </div>
        
        {/* Period Selector */}
        <div className="flex space-x-1 bg-gray-100 dark:bg-slate-700 rounded-lg p-1">
          {[14, 30, 60].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period as 14 | 30 | 60)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-all duration-200 ${
                selectedPeriod === period
                  ? 'bg-white dark:bg-slate-600 text-orange-600 dark:text-orange-400 shadow-sm'
                  : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'
              }`}
            >
              {period}d
            </button>
          ))}
        </div>
      </div>

      {hasData ? (
        <>
          {/* Chart */}
          <div className="mb-6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="formattedDate" 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                  label={{ value: 'Basal (U)', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as BasalTrendData;
                      return (
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-gray-900 dark:text-slate-100">{label}</p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-orange-600">Basal:</span>
                            <span className="text-sm font-medium">{data.basal}u</span>
                          </div>
                          {data.isOutlier && (
                            <p className="text-xs text-amber-600 mt-1">⚠️ Outlier day</p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {stats && (
                  <ReferenceLine 
                    y={stats.average} 
                    stroke="#f97316" 
                    strokeDasharray="5 5" 
                    label={{ value: "Average", position: "right" }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="basal" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={(props) => {
                    const data = props.payload as BasalTrendData;
                    return (
                      <circle
                        key={`dot-${props.index}`}
                        cx={props.cx}
                        cy={props.cy}
                        r={data?.isOutlier ? 6 : 4}
                        fill={data?.isOutlier ? "#f59e0b" : "#f97316"}
                        stroke={data?.isOutlier ? "#d97706" : "#ea580c"}
                        strokeWidth={2}
                      />
                    );
                  }}
                  activeDot={{ r: 6, stroke: "#ea580c", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-orange-600 dark:text-orange-400 mb-1">
                      Average Basal
                    </p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                      {stats.average}u
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                      Consistency
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        {stats.consistencyScore}%
                      </p>
                      {stats.consistencyScore >= 80 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-1">
                      Trend
                    </p>
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-bold text-purple-900 dark:text-purple-100">
                        {stats.trend === 'increasing' ? '↗' : stats.trend === 'decreasing' ? '↘' : '→'}
                      </span>
                      <span className="text-sm text-purple-700 dark:text-purple-300 capitalize">
                        {stats.trend}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                      Outlier Days
                    </p>
                    <div className="flex items-center space-x-2">
                      <p className="text-lg font-bold text-amber-900 dark:text-amber-100">
                        {stats.outlierDays}
                      </p>
                      {stats.outlierDays === 0 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="h-12 w-12 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-500 text-sm">
            No basal data found for the selected period
          </p>
          <p className="text-gray-400 dark:text-slate-600 text-xs mt-1">
            Import basal data to see trends and consistency analysis
          </p>
        </div>
      )}
    </div>
  );
}