'use client';

import { useMemo } from 'react';
import { TrendingUp, Brain, AlertCircle, Target, Clock } from 'lucide-react';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface PredictiveAnalyticsProps {
  readings: GlucoseReading[];
  loading: boolean;
}

export function PredictiveAnalytics({ readings, loading }: PredictiveAnalyticsProps) {
  const predictions = useMemo(() => {
    if (readings.length < 10) return null;

    // Sort readings by time
    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.system_time).getTime() - new Date(b.system_time).getTime()
    );

    const recentReadings = sortedReadings.slice(-20); // Last 20 readings for prediction
    const values = recentReadings.map(r => r.value);
    
    // Simple linear regression for trend prediction
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict next 6 readings (30 minutes if 5-minute intervals)
    const predictions = [];
    for (let i = 1; i <= 6; i++) {
      const predictedValue = intercept + slope * (n + i - 1);
      predictions.push(Math.max(40, Math.min(400, Math.round(predictedValue))));
    }

    // Risk Assessment
    const currentValue = values[values.length - 1];
    const predictedIn30Min = predictions[5]; // 6th prediction (30 min)
    
    let riskLevel = 'low';
    let riskMessage = 'Glucose levels appear stable';
    let riskColor = 'green';
    
    // Hypoglycemia risk
    if (currentValue < 80 && slope < -1) {
      riskLevel = 'high';
      riskMessage = 'High risk of hypoglycemia - consider glucose treatment';
      riskColor = 'red';
    } else if (currentValue < 100 && slope < -0.5) {
      riskLevel = 'moderate';
      riskMessage = 'Moderate risk of low glucose - monitor closely';
      riskColor = 'orange';
    }
    
    // Hyperglycemia risk
    else if (currentValue > 200 && slope > 1) {
      riskLevel = 'high';
      riskMessage = 'High risk of hyperglycemia - consider insulin correction';
      riskColor = 'red';
    } else if (currentValue > 160 && slope > 0.5) {
      riskLevel = 'moderate';
      riskMessage = 'Moderate risk of high glucose - monitor closely';
      riskColor = 'orange';
    }

    // Pattern-based predictions
    const now = new Date();
    const currentHour = now.getHours();
    
    // Meal time predictions
    const mealTimes = [7, 12, 18]; // 7am, 12pm, 6pm
    const nextMealTime = mealTimes.find(time => time > currentHour) || mealTimes[0] + 24;
    const hoursToMeal = nextMealTime > 24 ? nextMealTime - 24 - currentHour : nextMealTime - currentHour;
    
    // Historical patterns for this time of day
    const historicalAtThisHour = sortedReadings.filter(r => {
      const readingHour = new Date(r.system_time).getHours();
      return Math.abs(readingHour - currentHour) <= 1;
    });
    
    const avgAtThisHour = historicalAtThisHour.length > 0 ? 
      historicalAtThisHour.reduce((sum, r) => sum + r.value, 0) / historicalAtThisHour.length : currentValue;

    // Time in range prediction for next 2 hours
    const predictedTIR = predictions.filter(p => p >= 70 && p <= 180).length / predictions.length * 100;

    return {
      shortTerm: {
        predictions,
        trend: slope > 0.5 ? 'rising' : slope < -0.5 ? 'falling' : 'stable',
        slope: Math.round(slope * 10) / 10,
        confidence: Math.min(95, Math.max(60, 100 - Math.abs(slope) * 10))
      },
      risk: {
        level: riskLevel,
        message: riskMessage,
        color: riskColor,
        currentValue,
        predictedIn30Min
      },
      patterns: {
        nextMealHours: hoursToMeal,
        avgAtThisHour: Math.round(avgAtThisHour),
        predictedTIR: Math.round(predictedTIR)
      },
      recommendations: generateRecommendations(currentValue, slope, predictions, hoursToMeal)
    };
  }, [readings]);

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!predictions) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Predictive Analytics</h3>
        <p className="text-slate-400">Need at least 10 glucose readings for predictive analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Predictive Analytics</h3>
        
        {/* Risk Assessment */}
        <div className={`bg-${predictions.risk.color}-900/20 border border-${predictions.risk.color}-800/30 rounded-lg p-4 mb-6`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`h-5 w-5 text-${predictions.risk.color}-400`} />
            <span className="font-medium text-white capitalize">{predictions.risk.level} Risk Alert</span>
          </div>
          <p className={`text-${predictions.risk.color}-200 mb-2`}>{predictions.risk.message}</p>
          <div className="text-sm text-slate-400">
            Current: {predictions.risk.currentValue} mg/dL → Predicted (30min): {predictions.risk.predictedIn30Min} mg/dL
          </div>
        </div>

        {/* Predictions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Short-term Trend */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${
                predictions.shortTerm.trend === 'rising' ? 'text-red-400' :
                predictions.shortTerm.trend === 'falling' ? 'text-blue-400' : 'text-green-400'
              }`} />
              <span className="text-sm text-slate-400">30-Min Trend</span>
            </div>
            <div className="text-xl font-bold text-white capitalize">
              {predictions.shortTerm.trend}
            </div>
            <div className="text-xs text-slate-500">
              {predictions.shortTerm.slope > 0 ? '+' : ''}{predictions.shortTerm.slope} mg/dL/reading
            </div>
          </div>

          {/* Confidence */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-sm text-slate-400">Confidence</span>
            </div>
            <div className="text-xl font-bold text-white">
              {predictions.shortTerm.confidence}%
            </div>
            <div className="text-xs text-slate-500">
              Prediction accuracy
            </div>
          </div>

          {/* Next Meal */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-slate-400">Next Meal</span>
            </div>
            <div className="text-xl font-bold text-white">
              {predictions.patterns.nextMealHours}h
            </div>
            <div className="text-xs text-slate-500">
              Avg at this time: {predictions.patterns.avgAtThisHour} mg/dL
            </div>
          </div>

          {/* Predicted TIR */}
          <div className="bg-slate-700/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-green-400" />
              <span className="text-sm text-slate-400">Predicted TIR</span>
            </div>
            <div className="text-xl font-bold text-white">
              {predictions.patterns.predictedTIR}%
            </div>
            <div className="text-xs text-slate-500">
              Next 30 minutes
            </div>
          </div>
        </div>

        {/* Prediction Timeline */}
        <div className="mb-6">
          <h4 className="text-md font-semibold text-white mb-4">30-Minute Forecast</h4>
          <div className="bg-slate-700/20 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Now</span>
              <span className="text-sm text-slate-400">+30 min</span>
            </div>
            <div className="flex items-center gap-2">
              {predictions.shortTerm.predictions.map((value, i) => (
                <div key={i} className="flex-1">
                  <div 
                    className={`h-8 rounded flex items-center justify-center text-xs font-medium ${
                      value >= 70 && value <= 180 ? 'bg-green-600' :
                      value < 70 ? 'bg-red-600' : 'bg-yellow-600'
                    }`}
                  >
                    {value}
                  </div>
                  <div className="text-xs text-slate-500 text-center mt-1">
                    +{(i + 1) * 5}m
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {predictions.recommendations.length > 0 && (
          <div>
            <h4 className="text-md font-semibold text-white mb-4">AI Recommendations</h4>
            <div className="space-y-2">
              {predictions.recommendations.map((rec, i) => (
                <div key={i} className={`bg-${rec.type === 'warning' ? 'yellow' : rec.type === 'danger' ? 'red' : 'blue'}-900/20 border border-${rec.type === 'warning' ? 'yellow' : rec.type === 'danger' ? 'red' : 'blue'}-800/30 rounded-lg p-3`}>
                  <div className="flex items-start gap-2">
                    <AlertCircle className={`h-4 w-4 mt-0.5 text-${rec.type === 'warning' ? 'yellow' : rec.type === 'danger' ? 'red' : 'blue'}-400`} />
                    <div>
                      <div className="font-medium text-white">{rec.title}</div>
                      <div className={`text-sm text-${rec.type === 'warning' ? 'yellow' : rec.type === 'danger' ? 'red' : 'blue'}-200`}>
                        {rec.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateRecommendations(currentValue: number, slope: number, predictions: number[], hoursToMeal: number) {
  const recommendations = [];

  // Hypoglycemia warnings
  if (currentValue < 80 && slope < -1) {
    recommendations.push({
      type: 'danger',
      title: 'Immediate Action Required',
      message: 'Glucose is dropping rapidly. Consider 15g fast-acting carbs and recheck in 15 minutes.'
    });
  } else if (currentValue < 100 && slope < -0.5) {
    recommendations.push({
      type: 'warning',
      title: 'Monitor Closely',
      message: 'Glucose is trending down. Have fast-acting carbs ready and avoid exercise.'
    });
  }

  // Hyperglycemia warnings
  if (currentValue > 200 && slope > 1) {
    recommendations.push({
      type: 'danger',
      title: 'High Glucose Alert',
      message: 'Glucose is rising rapidly. Consider insulin correction and check for ketones if >250 mg/dL.'
    });
  } else if (currentValue > 160 && slope > 0.5) {
    recommendations.push({
      type: 'warning',
      title: 'Rising Glucose',
      message: 'Glucose is trending up. Consider light exercise or small insulin correction.'
    });
  }

  // Meal timing recommendations
  if (hoursToMeal <= 1 && currentValue < 100) {
    recommendations.push({
      type: 'info',
      title: 'Pre-Meal Planning',
      message: 'Glucose is low before meal time. Consider reducing pre-meal insulin or having a small snack.'
    });
  } else if (hoursToMeal <= 1 && currentValue > 150) {
    recommendations.push({
      type: 'info',
      title: 'Pre-Meal Planning',
      message: 'Glucose is elevated before meal time. Consider pre-bolusing insulin 15-20 minutes early.'
    });
  }

  // Predictions-based recommendations
  const futureOutOfRange = predictions.filter(p => p < 70 || p > 180).length;
  if (futureOutOfRange > 3) {
    recommendations.push({
      type: 'warning',
      title: 'Predicted Range Issues',
      message: `${futureOutOfRange} of the next 6 readings are predicted to be out of range. Consider proactive management.`,
      priority: 2
    });
  }

  // Check for predicted lows in next hour
  const nearTermLows = predictions.slice(0, 2).filter(p => p < 80).length;
  if (nearTermLows > 0) {
    recommendations.push({
      type: 'warning',
      title: 'Predicted Low Alert',
      message: `Low glucose predicted in next 30-60 minutes. Consider preventive carbs.`,
      priority: 3
    });
  }

  // Stability recommendations
  if (Math.abs(slope) < 0.3 && currentValue >= 70 && currentValue <= 180) {
    recommendations.push({
      type: 'info',
      title: 'Great Control!',
      message: 'Glucose is stable and in range. Keep up the good work with your current management.',
      priority: 1
    });
  }

  return recommendations;
}