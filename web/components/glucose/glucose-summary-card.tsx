'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Target, AlertTriangle, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface GlucoseSummaryCardProps {
  readings: GlucoseReading[];
  loading?: boolean;
}

export function GlucoseSummaryCard({ readings, loading = false }: GlucoseSummaryCardProps) {
  const summary = useMemo(() => {
    if (readings.length === 0) return null;

    const values = readings.map(r => r.value);
    const latest = readings[0];
    
    // Basic stats
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const timeInRange = (inRange / values.length) * 100;
    
    // Trend analysis (last 5 readings)
    const recentReadings = readings.slice(0, 5);
    let trend = 'stable';
    if (recentReadings.length >= 3) {
      const recent = recentReadings.map(r => r.value);
      const slope = (recent[0] - recent[2]) / 2; // Simple slope
      
      if (slope > 10) trend = 'rising';
      else if (slope < -10) trend = 'falling';
    }

    // Risk assessment
    let riskLevel = 'low';
    let riskMessage = 'Glucose levels are stable';
    
    if (latest.value < 70) {
      riskLevel = 'high';
      riskMessage = 'Low glucose detected';
    } else if (latest.value > 250) {
      riskLevel = 'high';
      riskMessage = 'Very high glucose detected';
    } else if (latest.value < 80 || latest.value > 200) {
      riskLevel = 'moderate';
      riskMessage = 'Glucose outside optimal range';
    }

    return {
      latest: latest.value,
      trend,
      average: Math.round(average),
      timeInRange: Math.round(timeInRange),
      riskLevel,
      riskMessage,
      readingCount: readings.length,
      lastUpdated: latest.system_time
    };
  }, [readings]);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Glucose Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-700 rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-slate-700 rounded"></div>
              <div className="h-16 bg-slate-700 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Glucose Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">No glucose data available</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (summary.trend) {
      case 'rising':
        return <TrendingUp className="h-4 w-4 text-red-400" />;
      case 'falling':
        return <TrendingDown className="h-4 w-4 text-blue-400" />;
      default:
        return <Target className="h-4 w-4 text-green-400" />;
    }
  };

  const getRiskColor = () => {
    switch (summary.riskLevel) {
      case 'high':
        return 'text-red-400';
      case 'moderate':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Glucose Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest Reading */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-bold text-white flex items-center gap-2">
              {summary.latest}
              {getTrendIcon()}
            </div>
            <div className="text-sm text-slate-400">
              mg/dL • {new Date(summary.lastUpdated).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </div>
          </div>
          <Badge 
            variant={summary.riskLevel === 'high' ? 'destructive' : 
                   summary.riskLevel === 'moderate' ? 'secondary' : 'default'}
            className="capitalize"
          >
            {summary.riskLevel} Risk
          </Badge>
        </div>

        {/* Risk Message */}
        {summary.riskLevel !== 'low' && (
          <div className={`flex items-center gap-2 text-sm ${getRiskColor()}`}>
            <AlertTriangle className="h-4 w-4" />
            {summary.riskMessage}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">Time in Range</div>
            <div className="text-xl font-bold text-white">{summary.timeInRange}%</div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="text-sm text-slate-400 mb-1">Average</div>
            <div className="text-xl font-bold text-white">{summary.average} mg/dL</div>
          </div>
        </div>

        {/* Data Info */}
        <div className="text-xs text-slate-500 border-t border-slate-700 pt-3">
          Based on {summary.readingCount} readings from the last 7 days
        </div>
      </CardContent>
    </Card>
  );
}