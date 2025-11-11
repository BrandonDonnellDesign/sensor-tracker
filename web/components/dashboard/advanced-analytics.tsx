'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock, 
  Target,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { Database } from '@/lib/database.types';

type Sensor = Database['public']['Tables']['sensors']['Row'];

interface AdvancedAnalyticsProps {
  sensors: Sensor[];
  className?: string;
}

interface AnalyticsData {
  monthlyTrends: Array<{
    month: string;
    sensors: number;
    successful: number;
    problematic: number;
    successRate: number;
  }>;
  durationAnalysis: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  performanceMetrics: {
    averageDuration: number;
    successRate: number;
    totalSensors: number;
    predictedNextFailure: number;
  };
  seasonalPatterns: Array<{
    season: string;
    successRate: number;
    avgDuration: number;
    count: number;
  }>;
}



export const AdvancedAnalytics = memo(function AdvancedAnalytics({ 
  sensors, 
  className = '' 
}: AdvancedAnalyticsProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'3m' | '6m' | '1y' | 'all'>('6m');
  const [selectedMetric, setSelectedMetric] = useState<'success' | 'duration' | 'trends'>('success');

  const analyticsData = useMemo((): AnalyticsData => {
    if (sensors.length === 0) {
      return {
        monthlyTrends: [],
        durationAnalysis: [],
        performanceMetrics: {
          averageDuration: 0,
          successRate: 0,
          totalSensors: 0,
          predictedNextFailure: 0
        },
        seasonalPatterns: []
      };
    }

    // Filter sensors based on time range
    const now = new Date();
    const cutoffDate = new Date();
    switch (selectedTimeRange) {
      case '3m':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoffDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        cutoffDate.setFullYear(2020); // Far back date
        break;
    }

    const filteredSensors = sensors.filter(s => 
      new Date(s.date_added) >= cutoffDate
    );

    // Monthly trends analysis
    const monthlyData = new Map<string, { sensors: number; successful: number; problematic: number }>();
    
    filteredSensors.forEach(sensor => {
      const date = new Date(sensor.date_added);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { sensors: 0, successful: 0, problematic: 0 });
      }
      
      const data = monthlyData.get(monthKey)!;
      data.sensors++;
      if (sensor.is_problematic) {
        data.problematic++;
      } else {
        data.successful++;
      }
    });

    const monthlyTrends = Array.from(monthlyData.entries())
      .map(([month, data]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...data,
        successRate: data.sensors > 0 ? (data.successful / data.sensors) * 100 : 0
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Duration analysis - only calculate for sensors we know the actual duration
    const durations: number[] = [];
    const sortedSensors = [...filteredSensors].sort((a, b) => 
      new Date(a.date_added).getTime() - new Date(b.date_added).getTime()
    );

    // Calculate actual wear durations
    for (let i = 0; i < sortedSensors.length - 1; i++) {
      const currentSensor = sortedSensors[i];
      const nextSensor = sortedSensors[i + 1];
      
      const startDate = new Date(currentSensor.date_added);
      const endDate = new Date(nextSensor.date_added);
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only include reasonable durations (1-30 days)
      if (duration >= 1 && duration <= 30) {
        durations.push(duration);
      }
    }

    // For problematic sensors, estimate their duration based on when they failed
    filteredSensors.forEach(sensor => {
      if (sensor.is_problematic) {
        const daysSinceAdded = Math.floor(
          (Date.now() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24)
        );
        // If it's a recent failure (within 14 days), use actual days as duration
        if (daysSinceAdded <= 14) {
          durations.push(daysSinceAdded);
        }
      }
    });

    const durationRanges = [
      { range: '0-3 days', min: 0, max: 3 },
      { range: '4-7 days', min: 4, max: 7 },
      { range: '8-10 days', min: 8, max: 10 },
      { range: '11-14 days', min: 11, max: 14 },
      { range: '15+ days', min: 15, max: Infinity }
    ];

    const durationAnalysis = durationRanges.map(range => {
      const count = durations.filter(d => d >= range.min && d <= range.max).length;
      return {
        range: range.range,
        count,
        percentage: durations.length > 0 ? (count / durations.length) * 100 : 0
      };
    });

    // Performance metrics
    const successfulSensors = filteredSensors.filter(s => !s.is_problematic);
    const averageDuration = durations.length > 0 
      ? durations.reduce((a, b) => a + b, 0) / durations.length 
      : 0;
    const successRate = filteredSensors.length > 0 
      ? (successfulSensors.length / filteredSensors.length) * 100 
      : 0;

    // Predict next failure (simple heuristic based on patterns)
    const recentFailures = filteredSensors
      .filter(s => s.is_problematic)
      .slice(-5); // Last 5 failures
    
    const avgFailureDays = recentFailures.length > 0
      ? recentFailures.reduce((sum, sensor) => {
          const days = Math.floor((Date.now() - new Date(sensor.date_added).getTime()) / (1000 * 60 * 60 * 24));
          return sum + days;
        }, 0) / recentFailures.length
      : 10; // Default to 10 days

    // Seasonal patterns - use actual durations, not time since added
    const seasonalData = new Map<string, { successful: number; total: number; durations: number[] }>();
    
    // Add durations to seasonal data based on when sensors were added
    for (let i = 0; i < sortedSensors.length - 1; i++) {
      const currentSensor = sortedSensors[i];
      const nextSensor = sortedSensors[i + 1];
      
      const startDate = new Date(currentSensor.date_added);
      const endDate = new Date(nextSensor.date_added);
      const duration = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (duration >= 1 && duration <= 30) {
        const month = startDate.getMonth();
        let season: string;
        
        if (month >= 2 && month <= 4) season = 'Spring';
        else if (month >= 5 && month <= 7) season = 'Summer';
        else if (month >= 8 && month <= 10) season = 'Fall';
        else season = 'Winter';
        
        if (!seasonalData.has(season)) {
          seasonalData.set(season, { successful: 0, total: 0, durations: [] });
        }
        
        const data = seasonalData.get(season)!;
        data.total++;
        data.durations.push(duration);
        if (!currentSensor.is_problematic) data.successful++;
      }
    }

    const seasonalPatterns = Array.from(seasonalData.entries()).map(([season, data]) => ({
      season,
      successRate: data.total > 0 ? (data.successful / data.total) * 100 : 0,
      avgDuration: data.durations.length > 0 ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length : 0,
      count: data.total
    }));

    return {
      monthlyTrends,
      durationAnalysis,
      performanceMetrics: {
        averageDuration,
        successRate,
        totalSensors: filteredSensors.length,
        predictedNextFailure: avgFailureDays
      },
      seasonalPatterns
    };
  }, [sensors, selectedTimeRange]);

  const renderMetricCard = useCallback((
    title: string, 
    value: string | number, 
    subtitle: string, 
    icon: React.ReactNode,
    trend?: 'up' | 'down' | 'stable',
    trendValue?: string
  ) => (
    <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 min-h-[140px] flex flex-col">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 leading-tight">
            {title}
          </h4>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        <div className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-1">
          {value}
        </div>
        <div className="text-xs text-gray-500 dark:text-slate-500 leading-relaxed">
          {subtitle}
        </div>
      </div>

      {trend && trendValue && (
        <div className={`flex items-center justify-center space-x-1 text-xs mt-2 pt-2 border-t border-gray-200 dark:border-slate-600 ${
          trend === 'up' ? 'text-green-600 dark:text-green-400' :
          trend === 'down' ? 'text-red-600 dark:text-red-400' :
          'text-gray-600 dark:text-gray-400'
        }`}>
          {trend === 'up' ? <TrendingUp className="w-3 h-3" /> :
           trend === 'down' ? <TrendingDown className="w-3 h-3" /> :
           <Activity className="w-3 h-3" />}
          <span className="text-center">{trendValue}</span>
        </div>
      )}
    </div>
  ), []);

  if (sensors.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="text-center py-8">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100 mb-2">
            No Analytics Available
          </h3>
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            Add more sensors to unlock advanced analytics and insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg p-4 lg:p-6 border border-gray-200 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center space-x-2 lg:space-x-3">
          <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-base lg:text-lg font-semibold text-gray-900 dark:text-slate-100">
            Advanced Analytics
          </h3>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Selector */}
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="text-xs lg:text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 lg:px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 flex-1 sm:flex-none min-w-[120px]"
          >
            <option value="3m">Last 3 months</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
            <option value="all">All time</option>
          </select>
          
          {/* Metric Selector */}
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
            className="text-xs lg:text-sm border border-gray-300 dark:border-slate-600 rounded-lg px-2 lg:px-3 py-1.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 flex-1 sm:flex-none min-w-[120px]"
          >
            <option value="success">Success Rate</option>
            <option value="duration">Duration</option>
            <option value="trends">Trends</option>
          </select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {renderMetricCard(
          'Success Rate',
          `${analyticsData.performanceMetrics.successRate.toFixed(1)}%`,
          'Overall performance',
          <CheckCircle className="w-4 h-4 text-green-500" />,
          analyticsData.performanceMetrics.successRate >= 85 ? 'up' : 'down',
          analyticsData.performanceMetrics.successRate >= 85 ? 'Excellent' : 'Needs improvement'
        )}
        
        {renderMetricCard(
          'Avg Duration',
          `${analyticsData.performanceMetrics.averageDuration.toFixed(1)}d`,
          'Days per sensor',
          <Clock className="w-4 h-4 text-blue-500" />,
          analyticsData.performanceMetrics.averageDuration >= 10 ? 'up' : 'down',
          analyticsData.performanceMetrics.averageDuration >= 10 ? 'Above target' : 'Below target'
        )}
        
        {renderMetricCard(
          'Total Sensors',
          analyticsData.performanceMetrics.totalSensors,
          'In selected period',
          <Target className="w-4 h-4 text-purple-500" />
        )}
        
        {renderMetricCard(
          'Failure Risk',
          `${analyticsData.performanceMetrics.predictedNextFailure.toFixed(0)} days`,
          'Predicted timeline',
          <AlertCircle className="w-4 h-4 text-yellow-500" />,
          'stable',
          'AI Prediction'
        )}
      </div>

      {/* Main Chart */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
          {selectedMetric === 'success' ? 'Success Rate Trends' :
           selectedMetric === 'duration' ? 'Duration Distribution' :
           'Monthly Sensor Trends'}
        </h4>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetric === 'success' && (
              <AreaChart data={analyticsData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(30 41 59)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#3B82F6" 
                  fill="#3B82F6" 
                  fillOpacity={0.3}
                  name="Success Rate (%)"
                />
              </AreaChart>
            )}
            
            {selectedMetric === 'duration' && (
              <RechartsBarChart data={analyticsData.durationAnalysis}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="range" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(30 41 59)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="count" fill="#10B981" name="Sensor Count" />
              </RechartsBarChart>
            )}
            
            {selectedMetric === 'trends' && (
              <LineChart data={analyticsData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgb(30 41 59)', 
                    border: 'none', 
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="sensors" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="Total Sensors"
                />
                <Line 
                  type="monotone" 
                  dataKey="successful" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Successful"
                />
                <Line 
                  type="monotone" 
                  dataKey="problematic" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  name="Problematic"
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Seasonal Patterns */}
      {analyticsData.seasonalPatterns.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-4">
            Seasonal Performance Patterns
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {analyticsData.seasonalPatterns.map((season) => (
              <div key={season.season} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 min-h-[140px]">
                <h5 className="text-sm font-medium text-gray-900 dark:text-slate-100 mb-3 truncate">
                  {season.season}
                </h5>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-slate-400 truncate pr-2">Success Rate:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">
                      {season.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-slate-400 truncate pr-2">Avg Duration:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">
                      {season.avgDuration.toFixed(1)}d
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600 dark:text-slate-400 truncate pr-2">Sensors:</span>
                    <span className="font-medium text-gray-900 dark:text-slate-100 flex-shrink-0">
                      {season.count}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});