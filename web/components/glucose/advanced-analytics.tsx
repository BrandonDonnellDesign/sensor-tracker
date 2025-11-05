'use client';

import { useMemo } from 'react';
import { TrendingUp, Calendar, Activity, AlertTriangle } from 'lucide-react';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface AdvancedAnalyticsProps {
  readings: GlucoseReading[];
  loading: boolean;
}

export function AdvancedAnalytics({ readings, loading }: AdvancedAnalyticsProps) {
  const analytics = useMemo(() => {
    if (readings.length === 0) return null;

    // Sort readings by time
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.system_time).getTime() - new Date(b.system_time).getTime()
    );

    // Pattern Recognition - Time of Day Analysis
    const hourlyPatterns = Array.from({ length: 24 }, (_, hour) => {
      const hourReadings = sortedReadings.filter(r => 
        new Date(r.system_time).getHours() === hour
      );
      
      if (hourReadings.length === 0) return { hour, average: 0, count: 0, inRange: 0 };
      
      const values = hourReadings.map(r => r.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const inRange = values.filter(v => v >= 70 && v <= 180).length;
      
      return {
        hour,
        average: Math.round(average),
        count: hourReadings.length,
        inRange: Math.round((inRange / values.length) * 100)
      };
    });

    // Glucose Variability Analysis
    const values = sortedReadings.map(r => r.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Mean Absolute Glucose (MAG)
    const mag = values.reduce((sum, val, i) => {
      if (i === 0) return 0;
      return sum + Math.abs(val - values[i - 1]);
    }, 0) / (values.length - 1);

    // J-Index (combination of mean and variability)
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const jIndex = 0.001 * Math.pow(mean + variance, 2);

    // Glycemic Risk Assessment Index (ADRR)
    const riskScores = values.map(val => {
      if (val <= 112.5) return 0;
      if (val >= 112.5 && val <= 180) return 10 * Math.pow(Math.log(val / 112.5), 1.084);
      return 10 * Math.pow(Math.log(val / 112.5), 1.084);
    });
    const adrr = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

    // Trend Analysis
    const recentReadings = sortedReadings.slice(-20); // Last 20 readings
    let trendDirection = 'stable';
    let trendStrength = 0;
    
    if (recentReadings.length >= 3) {
      const recent = recentReadings.slice(-3).map(r => r.value);
      const slope = (recent[2] - recent[0]) / 2;
      
      if (Math.abs(slope) > 2) {
        trendDirection = slope > 0 ? 'rising' : 'falling';
        trendStrength = Math.min(Math.abs(slope) / 10, 1);
      }
    }

    // Weekly Comparison
    const now = new Date();
    const thisWeek = sortedReadings.filter(r => {
      const readingDate = new Date(r.system_time);
      const daysDiff = (now.getTime() - readingDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });
    
    const lastWeek = sortedReadings.filter(r => {
      const readingDate = new Date(r.system_time);
      const daysDiff = (now.getTime() - readingDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 7 && daysDiff <= 14;
    });

    const thisWeekTIR = thisWeek.length > 0 ? 
      (thisWeek.filter(r => r.value >= 70 && r.value <= 180).length / thisWeek.length) * 100 : 0;
    const lastWeekTIR = lastWeek.length > 0 ? 
      (lastWeek.filter(r => r.value >= 70 && r.value <= 180).length / lastWeek.length) * 100 : 0;

    // Peak and Valley Detection
    const peaks = [];
    const valleys = [];
    
    for (let i = 1; i < values.length - 1; i++) {
      if (values[i] > values[i-1] && values[i] > values[i+1] && values[i] > 200) {
        peaks.push({ time: sortedReadings[i].system_time, value: values[i] });
      }
      if (values[i] < values[i-1] && values[i] < values[i+1] && values[i] < 80) {
        valleys.push({ time: sortedReadings[i].system_time, value: values[i] });
      }
    }

    return {
      hourlyPatterns,
      variability: {
        mag: Math.round(mag * 10) / 10,
        jIndex: Math.round(jIndex * 10) / 10,
        adrr: Math.round(adrr * 10) / 10
      },
      trend: {
        direction: trendDirection,
        strength: Math.round(trendStrength * 100)
      },
      weeklyComparison: {
        thisWeek: Math.round(thisWeekTIR),
        lastWeek: Math.round(lastWeekTIR),
        change: Math.round(thisWeekTIR - lastWeekTIR)
      },
      events: {
        peaks: peaks.slice(-5), // Last 5 peaks
        valleys: valleys.slice(-5) // Last 5 valleys
      }
    };
  }, [readings]);

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Advanced Analytics</h3>
        <p className="text-slate-400">No glucose data available for advanced analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Advanced Analytics</h3>
        
        {/* Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {/* Trend Analysis */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${
                analytics.trend.direction === 'rising' ? 'text-red-400' :
                analytics.trend.direction === 'falling' ? 'text-blue-400' : 'text-green-400'
              }`} />
              <span className="text-sm text-slate-400">Current Trend</span>
            </div>
            <div className="text-xl font-bold text-white capitalize">
              {analytics.trend.direction}
            </div>
            <div className="text-xs text-slate-500">
              Strength: {analytics.trend.strength}%
            </div>
          </div>

          {/* Weekly Progress */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-400">Weekly Progress</span>
            </div>
            <div className="text-xl font-bold text-white">
              {analytics.weeklyComparison.change > 0 ? '+' : ''}{analytics.weeklyComparison.change}%
            </div>
            <div className="text-xs text-slate-500">
              TIR: {analytics.weeklyComparison.thisWeek}% vs {analytics.weeklyComparison.lastWeek}%
            </div>
          </div>

          {/* Glucose Variability */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-slate-400">Variability (MAG)</span>
            </div>
            <div className="text-xl font-bold text-white">
              {analytics.variability.mag}
            </div>
            <div className="text-xs text-slate-500">
              {analytics.variability.mag < 18 ? 'Low' : 
               analytics.variability.mag < 25 ? 'Moderate' : 'High'} variability
            </div>
          </div>
        </div>

        {/* Hourly Patterns */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-white mb-4">Daily Patterns</h4>
          <div className="bg-slate-700/20 rounded-lg p-4">
            <div className="grid grid-cols-12 gap-1">
              {analytics.hourlyPatterns.map((pattern) => (
                <div key={pattern.hour} className="text-center">
                  <div className="text-xs text-slate-400 mb-1">
                    {pattern.hour.toString().padStart(2, '0')}
                  </div>
                  <div 
                    className={`h-8 rounded text-xs flex items-center justify-center font-medium ${
                      pattern.average === 0 ? 'bg-slate-600' :
                      pattern.inRange >= 70 ? 'bg-green-600' :
                      pattern.inRange >= 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                  >
                    {pattern.average > 0 ? pattern.average : '-'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {pattern.count > 0 ? `${pattern.inRange}%` : ''}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-2">
              Average glucose by hour (% time in range below)
            </div>
          </div>
        </div>

        {/* Recent Events */}
        {(analytics.events.peaks.length > 0 || analytics.events.valleys.length > 0) && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4">Recent Events</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analytics.events.peaks.length > 0 && (
                <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span className="text-sm font-medium text-red-300">Recent High Peaks</span>
                  </div>
                  <div className="space-y-2">
                    {analytics.events.peaks.map((peak, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-300">
                          {new Date(peak.time).toLocaleDateString()} {new Date(peak.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-red-300 font-medium">{peak.value} mg/dL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analytics.events.valleys.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-800/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-orange-400" />
                    <span className="text-sm font-medium text-orange-300">Recent Low Valleys</span>
                  </div>
                  <div className="space-y-2">
                    {analytics.events.valleys.map((valley, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-slate-300">
                          {new Date(valley.time).toLocaleDateString()} {new Date(valley.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-orange-300 font-medium">{valley.value} mg/dL</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Advanced Metrics */}
        <div>
          <h4 className="text-md font-semibold text-white mb-4">Advanced Metrics</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Mean Absolute Glucose (MAG)</div>
              <div className="text-xl font-bold text-white">{analytics.variability.mag}</div>
              <div className="text-xs text-slate-500">
                Target: &lt;18 mg/dL
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">J-Index</div>
              <div className="text-xl font-bold text-white">{analytics.variability.jIndex}</div>
              <div className="text-xs text-slate-500">
                Lower is better
              </div>
            </div>

            <div className="bg-slate-700/30 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">ADRR Risk Score</div>
              <div className="text-xl font-bold text-white">{analytics.variability.adrr}</div>
              <div className="text-xs text-slate-500">
                {analytics.variability.adrr < 20 ? 'Low risk' :
                 analytics.variability.adrr < 40 ? 'Moderate risk' : 'High risk'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}