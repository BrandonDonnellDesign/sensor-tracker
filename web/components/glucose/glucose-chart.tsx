'use client';

import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { Loader2, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface GlucoseChartProps {
  readings: GlucoseReading[];
  loading: boolean;
}

export function GlucoseChart({ readings, loading }: GlucoseChartProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  const { chartData, analytics } = useMemo(() => {
    // Filter readings based on time range
    const now = new Date();
    const cutoffTime = new Date();
    
    switch (timeRange) {
      case '24h':
        cutoffTime.setHours(now.getHours() - 24);
        break;
      case '7d':
        cutoffTime.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoffTime.setDate(now.getDate() - 30);
        break;
    }

    const filteredReadings = readings.filter(reading => 
      new Date(reading.system_time) >= cutoffTime
    );

    const data = filteredReadings
      .slice()
      .reverse() // Show chronological order
      .map(reading => ({
        timestamp: reading.system_time,
        glucose: reading.value,
        formattedTime: new Date(reading.system_time).toLocaleString(undefined, { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        source: reading.source,
        trend: reading.trend
      }));

    // Calculate analytics
    const values = filteredReadings.map(r => r.value);
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const low = values.filter(v => v < 70).length;
    const high = values.filter(v => v > 180).length;
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const timeInRange = values.length > 0 ? (inRange / values.length) * 100 : 0;

    // Calculate coefficient of variation (CV)
    const variance = values.length > 0 ? 
      values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length : 0;
    const standardDeviation = Math.sqrt(variance);
    const cv = average > 0 ? (standardDeviation / average) * 100 : 0;

    return {
      chartData: data,
      analytics: {
        average: Math.round(average),
        timeInRange: Math.round(timeInRange),
        low,
        high,
        inRange,
        total: values.length,
        cv: Math.round(cv * 10) / 10,
        standardDeviation: Math.round(standardDeviation)
      }
    };
  }, [readings, timeRange]);

  const getGlucoseColor = (value: number) => {
    if (value < 70) return '#ef4444'; // red - low
    if (value > 180) return '#f97316'; // orange - high
    return '#22c55e'; // green - normal
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="font-medium text-white">{new Date(data.timestamp).toLocaleString()}</p>
          <p className="text-sm">
            <span className="font-medium" style={{ color: getGlucoseColor(data.glucose) }}>
              {data.glucose} mg/dL
            </span>
          </p>
          <p className="text-xs text-slate-400">Source: {data.source}</p>
          {data.trend && (
            <p className="text-xs text-slate-400">Trend: {data.trend}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Glucose Trend</h3>
          <p className="text-sm text-slate-400">Your glucose readings over time</p>
        </div>
        <div className="h-96 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      </div>
    );
  }

  if (readings.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">Glucose Trend</h3>
          <p className="text-sm text-slate-400">Your glucose readings over time</p>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-slate-400">No glucose data available</p>
            <p className="text-sm text-slate-500 mt-1">
              Connect your Dexcom account or manually add readings to see your glucose trend
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-green-400" />
            <span className="text-sm text-slate-400">Time in Range</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.timeInRange}%</div>
          <div className="text-xs text-slate-500">{analytics.inRange}/{analytics.total} readings</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-slate-400">Average</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.average}</div>
          <div className="text-xs text-slate-500">mg/dL</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-400" />
            <span className="text-sm text-slate-400">Low Events</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.low}</div>
          <div className="text-xs text-slate-500">&lt;70 mg/dL</div>
        </div>

        <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-orange-400" />
            <span className="text-sm text-slate-400">High Events</span>
          </div>
          <div className="text-2xl font-bold text-white">{analytics.high}</div>
          <div className="text-xs text-slate-500">&gt;180 mg/dL</div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Glucose Trend</h3>
            <p className="text-sm text-slate-400">
              Your glucose readings over time ({analytics.total} readings)
            </p>
          </div>
          
          <div className="flex gap-2">
            {/* Time Range Selector */}
            <div className="flex bg-slate-700/50 rounded-lg p-1">
              {(['24h', '7d', '30d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={`text-xs ${timeRange === range ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
                >
                  {range}
                </Button>
              ))}
            </div>

            {/* Chart Type Selector */}
            <div className="flex bg-slate-700/50 rounded-lg p-1">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className={`text-xs ${chartType === 'line' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                Line
              </Button>
              <Button
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className={`text-xs ${chartType === 'area' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'}`}
              >
                Area
              </Button>
            </div>
          </div>
        </div>

        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                <XAxis 
                  dataKey="formattedTime"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis 
                  domain={[50, 300]}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                  axisLine={{ stroke: '#475569' }}
                />
                
                {/* Target range lines */}
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
                <ReferenceLine y={180} stroke="#f97316" strokeDasharray="5 5" opacity={0.7} />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Area
                  type="monotone"
                  dataKey="glucose"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.3} />
                <XAxis 
                  dataKey="formattedTime"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  interval="preserveStartEnd"
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis 
                  domain={[50, 300]}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#94a3b8' } }}
                  axisLine={{ stroke: '#475569' }}
                />
                
                {/* Target range lines */}
                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
                <ReferenceLine y={180} stroke="#f97316" strokeDasharray="5 5" opacity={0.7} />
                
                <Tooltip content={<CustomTooltip />} />
                
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#60a5fa' }}
                  activeDot={{ r: 5, fill: '#60a5fa' }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Legend and Additional Stats */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500"></div>
              <span className="text-slate-300">Low (&lt;70)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-green-500"></div>
              <span className="text-slate-300">Normal (70-180)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500"></div>
              <span className="text-slate-300">High (&gt;180)</span>
            </div>
          </div>
          
          <div className="text-xs text-slate-400">
            CV: {analytics.cv}% | SD: {analytics.standardDeviation} mg/dL
          </div>
        </div>
      </div>
    </div>
  );
}