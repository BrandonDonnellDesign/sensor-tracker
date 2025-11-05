'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface GlucoseInsightsProps {
  readings: GlucoseReading[];
}

export function GlucoseInsights({ readings }: GlucoseInsightsProps) {
  const insights = useMemo(() => {
    if (readings.length === 0) return null;

    const last24h = readings.filter(r => 
      new Date(r.system_time) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    );

    const values = last24h.map(r => r.value);
    const average = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Time in range analysis
    const inRange = values.filter(v => v >= 70 && v <= 180).length;
    const timeInRange = (inRange / values.length) * 100;
    
    // Variability analysis
    const variance = values.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    const cv = (standardDeviation / average) * 100;
    
    // Pattern analysis
    const lowEvents = values.filter(v => v < 70).length;
    const highEvents = values.filter(v => v > 180).length;
    
    // Recent trend analysis
    const recentReadings = last24h.slice(-6); // Last 6 readings
    const isRising = recentReadings.length >= 2 && 
      recentReadings[recentReadings.length - 1].value > recentReadings[recentReadings.length - 2].value;
    const isFalling = recentReadings.length >= 2 && 
      recentReadings[recentReadings.length - 1].value < recentReadings[recentReadings.length - 2].value;
    
    // Generate insights
    const insights = [];
    
    // Time in Range insights
    if (timeInRange >= 70) {
      insights.push({
        type: 'success' as const,
        icon: CheckCircle,
        title: 'Excellent Time in Range',
        description: `${Math.round(timeInRange)}% of readings are in target range (70-180 mg/dL). Keep up the great work!`,
        priority: 1
      });
    } else if (timeInRange >= 50) {
      insights.push({
        type: 'warning' as const,
        icon: Info,
        title: 'Good Time in Range',
        description: `${Math.round(timeInRange)}% of readings are in target range. Consider adjusting meal timing or insulin doses.`,
        priority: 2
      });
    } else {
      insights.push({
        type: 'error' as const,
        icon: AlertTriangle,
        title: 'Low Time in Range',
        description: `Only ${Math.round(timeInRange)}% of readings are in target range. Consider consulting with your healthcare provider.`,
        priority: 3
      });
    }
    
    // Variability insights
    if (cv > 36) {
      insights.push({
        type: 'warning' as const,
        icon: TrendingUp,
        title: 'High Glucose Variability',
        description: `Your glucose variability (CV: ${Math.round(cv)}%) is higher than recommended. Consider more consistent meal timing.`,
        priority: 2
      });
    } else if (cv < 20) {
      insights.push({
        type: 'success' as const,
        icon: CheckCircle,
        title: 'Stable Glucose Levels',
        description: `Your glucose levels are very stable (CV: ${Math.round(cv)}%). Excellent glucose management!`,
        priority: 1
      });
    }
    
    // Low glucose events
    if (lowEvents > 2) {
      insights.push({
        type: 'error' as const,
        icon: TrendingDown,
        title: 'Frequent Low Glucose',
        description: `${lowEvents} low glucose events in the last 24 hours. Consider reducing insulin or adjusting meal timing.`,
        priority: 3
      });
    } else if (lowEvents === 0) {
      insights.push({
        type: 'success' as const,
        icon: CheckCircle,
        title: 'No Low Glucose Events',
        description: 'No low glucose events in the last 24 hours. Great job avoiding hypoglycemia!',
        priority: 1
      });
    }
    
    // High glucose events
    if (highEvents > 3) {
      insights.push({
        type: 'warning' as const,
        icon: TrendingUp,
        title: 'Frequent High Glucose',
        description: `${highEvents} high glucose events in the last 24 hours. Consider adjusting meal portions or insulin timing.`,
        priority: 2
      });
    }
    
    // Recent trend
    if (isRising && recentReadings[recentReadings.length - 1].value > 200) {
      insights.push({
        type: 'error' as const,
        icon: TrendingUp,
        title: 'Rising Glucose Trend',
        description: 'Your glucose is trending upward and is currently high. Consider taking corrective action.',
        priority: 3
      });
    } else if (isFalling && recentReadings[recentReadings.length - 1].value < 80) {
      insights.push({
        type: 'warning' as const,
        icon: TrendingDown,
        title: 'Falling Glucose Trend',
        description: 'Your glucose is trending downward. Monitor closely and consider having a snack if needed.',
        priority: 2
      });
    }
    
    return insights.sort((a, b) => b.priority - a.priority);
  }, [readings]);

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Glucose Insights</h3>
        <p className="text-slate-400">Not enough data to generate insights. Sync more glucose readings to see personalized recommendations.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Glucose Insights</h3>
      </div>
      
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = insight.icon;
          const colors = {
            success: 'text-green-400 bg-green-400/10 border-green-400/20',
            warning: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
            error: 'text-red-400 bg-red-400/10 border-red-400/20'
          };
          
          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${colors[insight.type]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${insight.type === 'success' ? 'text-green-400' : insight.type === 'warning' ? 'text-yellow-400' : 'text-red-400'}`} />
                <div>
                  <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                  <p className="text-sm text-slate-300">{insight.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
        <p className="text-xs text-slate-400">
          <strong>Note:</strong> These insights are based on your recent glucose data and are for informational purposes only. 
          Always consult with your healthcare provider for medical advice.
        </p>
      </div>
    </div>
  );
}