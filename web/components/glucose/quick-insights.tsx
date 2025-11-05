'use client';

import { useMemo } from 'react';
import { Lightbulb, TrendingUp, Clock, Utensils, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface QuickInsightsProps {
  readings: GlucoseReading[];
  loading?: boolean;
}

export function QuickInsights({ readings, loading = false }: QuickInsightsProps) {
  const insights = useMemo(() => {
    if (readings.length < 10) return [];

    const insights = [];
    const values = readings.map(r => r.value);
    const latest = readings[0];
    
    // Time in range analysis
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const timeInRange = (inRange / values.length) * 100;
    
    if (timeInRange >= 80) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Excellent Control',
        message: `${Math.round(timeInRange)}% time in range - keep up the great work!`,
        priority: 1
      });
    } else if (timeInRange < 60) {
      insights.push({
        type: 'warning',
        icon: TrendingUp,
        title: 'Room for Improvement',
        message: `Only ${Math.round(timeInRange)}% time in range. Consider reviewing your management strategy.`,
        priority: 3
      });
    }

    // Variability analysis
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    const cv = (Math.sqrt(variance) / mean) * 100;
    
    if (cv > 36) {
      insights.push({
        type: 'info',
        icon: Activity,
        title: 'High Variability',
        message: 'Your glucose shows high variability. Consider more frequent monitoring or adjusting meal timing.',
        priority: 2
      });
    }

    // Pattern-based insights
    const hourlyAverages: { [hour: number]: number[] } = {};
    readings.forEach(reading => {
      const hour = new Date(reading.system_time).getHours();
      if (!hourlyAverages[hour]) hourlyAverages[hour] = [];
      hourlyAverages[hour].push(reading.value);
    });

    // Dawn phenomenon detection
    const morningHours = [5, 6, 7, 8];
    const morningReadings = morningHours.flatMap(hour => hourlyAverages[hour] || []);
    if (morningReadings.length > 5) {
      const morningAvg = morningReadings.reduce((a, b) => a + b, 0) / morningReadings.length;
      if (morningAvg > 140) {
        insights.push({
          type: 'info',
          icon: Clock,
          title: 'Morning Pattern',
          message: 'Higher glucose levels detected in the morning. Consider discussing dawn phenomenon with your healthcare provider.',
          priority: 2
        });
      }
    }

    // Meal timing insights
    const mealHours = [7, 12, 18]; // Typical meal times
    const postMealReadings = mealHours.flatMap(hour => 
      [hour + 1, hour + 2].flatMap(h => hourlyAverages[h] || [])
    );
    
    if (postMealReadings.length > 5) {
      const postMealAvg = postMealReadings.reduce((a, b) => a + b, 0) / postMealReadings.length;
      if (postMealAvg > 180) {
        insights.push({
          type: 'info',
          icon: Utensils,
          title: 'Post-Meal Spikes',
          message: 'Consider pre-bolusing insulin 15-20 minutes before meals to reduce post-meal spikes.',
          priority: 2
        });
      }
    }

    // Recent trend analysis
    const recentReadings = readings.slice(0, 10);
    if (recentReadings.length >= 5) {
      const recentValues = recentReadings.map(r => r.value);
      const isRising = recentValues.every((val, i) => i === 0 || val >= recentValues[i - 1]);
      const isFalling = recentValues.every((val, i) => i === 0 || val <= recentValues[i - 1]);
      
      if (isRising && latest.value > 200) {
        insights.push({
          type: 'warning',
          icon: TrendingUp,
          title: 'Rising Trend',
          message: 'Glucose is consistently rising. Consider checking for missed insulin or illness.',
          priority: 3
        });
      } else if (isFalling && latest.value < 80) {
        insights.push({
          type: 'warning',
          icon: TrendingUp,
          title: 'Falling Trend',
          message: 'Glucose is consistently falling. Have fast-acting carbs ready and monitor closely.',
          priority: 3
        });
      }
    }

    // Sort by priority (higher priority first)
    return insights.sort((a, b) => b.priority - a.priority).slice(0, 3);
  }, [readings]);

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-700 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="bg-slate-800/50 border-slate-700/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Quick Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-sm">
            {readings.length < 10 
              ? 'Need more glucose data for insights' 
              : 'No specific insights available at this time'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Quick Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => {
          const IconComponent = insight.icon;
          return (
            <div 
              key={i} 
              className={`p-3 rounded-lg border ${
                insight.type === 'success' ? 'bg-green-900/20 border-green-800/30' :
                insight.type === 'warning' ? 'bg-yellow-900/20 border-yellow-800/30' :
                'bg-blue-900/20 border-blue-800/30'
              }`}
            >
              <div className="flex items-start gap-3">
                <IconComponent className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                  insight.type === 'success' ? 'text-green-400' :
                  insight.type === 'warning' ? 'text-yellow-400' :
                  'text-blue-400'
                }`} />
                <div>
                  <div className="font-medium text-white text-sm mb-1">
                    {insight.title}
                  </div>
                  <div className={`text-sm ${
                    insight.type === 'success' ? 'text-green-200' :
                    insight.type === 'warning' ? 'text-yellow-200' :
                    'text-blue-200'
                  }`}>
                    {insight.message}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}