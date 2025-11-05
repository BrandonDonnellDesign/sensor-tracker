'use client';

import { useMemo } from 'react';
import { Activity, Target, TrendingUp, TrendingDown, Clock, BarChart3 } from 'lucide-react';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface GlucoseStatsProps {
  readings: GlucoseReading[];
  loading: boolean;
}

export function GlucoseStats({ readings, loading }: GlucoseStatsProps) {
  const stats = useMemo(() => {
    if (readings.length === 0) return null;

    const values = readings.map(r => r.value);
    
    // Basic statistics
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Time in range calculations
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const low = values.filter(v => v < 70).length;
    const high = values.filter(v => v > 180).length;
    const veryLow = values.filter(v => v < 54).length;
    const veryHigh = values.filter(v => v > 250).length;
    
    const timeInRange = (inRange / values.length) * 100;
    const timeLow = (low / values.length) * 100;
    const timeHigh = (high / values.length) * 100;
    const timeVeryLow = (veryLow / values.length) * 100;
    const timeVeryHigh = (veryHigh / values.length) * 100;
    
    // Variability metrics
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const cv = (standardDeviation / average) * 100;
    
    // Percentiles
    const sortedValues = [...values].sort((a, b) => a - b);
    const p25 = sortedValues[Math.floor(sortedValues.length * 0.25)];
    const p50 = sortedValues[Math.floor(sortedValues.length * 0.5)]; // Median
    const p75 = sortedValues[Math.floor(sortedValues.length * 0.75)];
    
    // Time-based analysis
    const last24h = readings.filter(r => 
      new Date(r.system_time) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    const last7d = readings.filter(r => 
      new Date(r.system_time) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    
    return {
      total: values.length,
      average: Math.round(average),
      min,
      max,
      median: p50,
      p25,
      p75,
      standardDeviation: Math.round(standardDeviation),
      cv: Math.round(cv * 10) / 10,
      timeInRange: Math.round(timeInRange),
      timeLow: Math.round(timeLow),
      timeHigh: Math.round(timeHigh),
      timeVeryLow: Math.round(timeVeryLow),
      timeVeryHigh: Math.round(timeVeryHigh),
      inRange,
      low,
      high,
      veryLow,
      veryHigh,
      last24h: last24h.length,
      last7d: last7d.length
    };
  }, [readings]);

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Glucose Statistics</h3>
        <p className="text-slate-400">No glucose data available for analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Glucose Statistics</h3>
        
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">Time in Range</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.timeInRange}%</div>
            <div className="text-xs text-slate-500">70-180 mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-slate-400">Average</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.average}</div>
            <div className="text-xs text-slate-500">mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-400">Variability</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.cv}%</div>
            <div className="text-xs text-slate-500">CV</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-slate-400">Total Readings</span>
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-slate-500">readings</div>
          </div>
        </div>

        {/* Time in Range Breakdown */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-white mb-4">Time in Range Breakdown</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300">Very Low</span>
              </div>
              <div className="text-xl font-bold text-white">{stats.timeVeryLow}%</div>
              <div className="text-xs text-slate-400">&lt;54 mg/dL ({stats.veryLow} readings)</div>
            </div>

            <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-orange-300">Low</span>
              </div>
              <div className="text-xl font-bold text-white">{stats.timeLow}%</div>
              <div className="text-xs text-slate-400">54-69 mg/dL ({stats.low - stats.veryLow} readings)</div>
            </div>

            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-green-400" />
                <span className="text-sm text-green-300">In Range</span>
              </div>
              <div className="text-xl font-bold text-white">{stats.timeInRange}%</div>
              <div className="text-xs text-slate-400">70-180 mg/dL ({stats.inRange} readings)</div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">High</span>
              </div>
              <div className="text-xl font-bold text-white">{stats.timeHigh}%</div>
              <div className="text-xs text-slate-400">181-250 mg/dL ({stats.high - stats.veryHigh} readings)</div>
            </div>

            <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-300">Very High</span>
              </div>
              <div className="text-xl font-bold text-white">{stats.timeVeryHigh}%</div>
              <div className="text-xs text-slate-400">&gt;250 mg/dL ({stats.veryHigh} readings)</div>
            </div>
          </div>
        </div>

        {/* Statistical Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Minimum</div>
            <div className="text-xl font-bold text-white">{stats.min} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">25th Percentile</div>
            <div className="text-xl font-bold text-white">{stats.p25} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Median</div>
            <div className="text-xl font-bold text-white">{stats.median} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">75th Percentile</div>
            <div className="text-xl font-bold text-white">{stats.p75} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Maximum</div>
            <div className="text-xl font-bold text-white">{stats.max} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Standard Deviation</div>
            <div className="text-xl font-bold text-white">{stats.standardDeviation} mg/dL</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Last 24 Hours</div>
            <div className="text-xl font-bold text-white">{stats.last24h} readings</div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Last 7 Days</div>
            <div className="text-xl font-bold text-white">{stats.last7d} readings</div>
          </div>
        </div>
      </div>
    </div>
  );
}