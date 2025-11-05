'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useInsulinData } from '@/lib/hooks/use-insulin-data';
import { 
  TrendingUp, 
  Target, 
  Clock,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';



interface DosingAnalyticsProps {
  className?: string;
}

export function DosingAnalytics({ className = '' }: DosingAnalyticsProps) {
  const { doses, isLoading } = useInsulinData();
  // Calculate dosing patterns and effectiveness
  const analytics = useMemo(() => {
    const now = new Date();
    const last30Days = doses.filter(dose => 
      (now.getTime() - dose.timestamp.getTime()) / (1000 * 60 * 60 * 24) <= 30
    );

    // Daily averages
    const dailyTotals = new Map<string, number>();
    last30Days.forEach(dose => {
      const dateKey = dose.timestamp.toDateString();
      dailyTotals.set(dateKey, (dailyTotals.get(dateKey) || 0) + dose.amount);
    });

    const avgDailyInsulin = Array.from(dailyTotals.values())
      .reduce((sum, total) => sum + total, 0) / Math.max(1, dailyTotals.size);

    // Meal effectiveness (doses with both pre and post glucose)
    const mealDoses = last30Days.filter(dose => 
      dose.mealCarbs && dose.preGlucose && dose.postGlucose
    );

    const effectiveDoses = mealDoses.filter(dose => {
      const glucoseChange = (dose.postGlucose! - dose.preGlucose!);
      // Effective if glucose stayed stable or decreased appropriately
      return glucoseChange <= 50 && dose.postGlucose! <= 180;
    });

    const effectiveness = mealDoses.length > 0 
      ? (effectiveDoses.length / mealDoses.length) * 100 
      : 0;

    // Timing patterns
    const hourlyDoses = new Array(24).fill(0);
    last30Days.forEach(dose => {
      const hour = dose.timestamp.getHours();
      hourlyDoses[hour] += dose.amount;
    });

    const peakHour = hourlyDoses.indexOf(Math.max(...hourlyDoses));

    // Carb ratios analysis
    const carbRatios = mealDoses
      .filter(dose => dose.mealCarbs! > 0)
      .map(dose => dose.mealCarbs! / dose.amount);
    
    const avgCarbRatio = carbRatios.length > 0
      ? carbRatios.reduce((sum, ratio) => sum + ratio, 0) / carbRatios.length
      : 15;

    // Correction effectiveness
    const correctionDoses = last30Days.filter(dose => 
      !dose.mealCarbs && dose.preGlucose && dose.postGlucose
    );

    const effectiveCorrections = correctionDoses.filter(dose => {
      const glucoseChange = dose.preGlucose! - dose.postGlucose!;
      // Effective if glucose decreased appropriately (30-80 mg/dL per unit)
      const expectedChange = dose.amount * 50; // Assuming 1:50 correction factor
      return Math.abs(glucoseChange - expectedChange) <= 30;
    });

    const correctionEffectiveness = correctionDoses.length > 0
      ? (effectiveCorrections.length / correctionDoses.length) * 100
      : 0;

    return {
      totalDoses: last30Days.length,
      avgDailyInsulin: Math.round(avgDailyInsulin * 10) / 10,
      effectiveness: Math.round(effectiveness),
      correctionEffectiveness: Math.round(correctionEffectiveness),
      peakHour,
      avgCarbRatio: Math.round(avgCarbRatio),
      mealDoses: mealDoses.length,
      correctionDoses: correctionDoses.length,
      hourlyPattern: hourlyDoses
    };
  }, [doses]);

  const getEffectivenessColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getEffectivenessIcon = (percentage: number) => {
    if (percentage >= 80) return <CheckCircle className="w-4 h-4" />;
    if (percentage >= 60) return <AlertCircle className="w-4 h-4" />;
    return <AlertCircle className="w-4 h-4" />;
  };

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${period}`;
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Dosing Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading analytics data...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (analytics.totalDoses === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Dosing Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No dosing data available</p>
            <p className="text-sm">Analytics will appear after logging insulin doses</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Dosing Analytics (Last 30 Days)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {analytics.totalDoses}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Doses
            </div>
          </div>
          
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {analytics.avgDailyInsulin}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg Daily Units
            </div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              1:{analytics.avgCarbRatio}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Avg Carb Ratio
            </div>
          </div>
          
          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
            <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
              {formatHour(analytics.peakHour)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Peak Dosing Time
            </div>
          </div>
        </div>

        {/* Effectiveness Metrics */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-4 h-4" />
            Dosing Effectiveness
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Meal Boluses</span>
                <div className={`flex items-center gap-2 ${getEffectivenessColor(analytics.effectiveness)}`}>
                  {getEffectivenessIcon(analytics.effectiveness)}
                  <span className="font-bold">{analytics.effectiveness}%</span>
                </div>
              </div>
              
              <Progress 
                value={analytics.effectiveness} 
                className="h-2"
              />
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {analytics.mealDoses} meal doses analyzed
              </div>
            </div>
            
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Corrections</span>
                <div className={`flex items-center gap-2 ${getEffectivenessColor(analytics.correctionEffectiveness)}`}>
                  {getEffectivenessIcon(analytics.correctionEffectiveness)}
                  <span className="font-bold">{analytics.correctionEffectiveness}%</span>
                </div>
              </div>
              
              <Progress 
                value={analytics.correctionEffectiveness} 
                className="h-2"
              />
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {analytics.correctionDoses} correction doses analyzed
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Pattern */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Daily Dosing Pattern
          </h3>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>12AM</span>
              <span>6AM</span>
              <span>12PM</span>
              <span>6PM</span>
              <span>11PM</span>
            </div>
            
            <div className="relative h-16 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
              {analytics.hourlyPattern.map((amount, hour) => {
                const maxAmount = Math.max(...analytics.hourlyPattern);
                const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                
                return (
                  <div
                    key={hour}
                    className="absolute bg-blue-500 opacity-70 rounded-t"
                    style={{
                      left: `${(hour / 24) * 100}%`,
                      width: `${100 / 24}%`,
                      height: `${height}%`,
                      bottom: 0
                    }}
                    title={`${formatHour(hour)}: ${amount.toFixed(1)} units`}
                  />
                );
              })}
            </div>
            
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              Hover over bars to see hourly totals
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Insights & Recommendations</h3>
          
          <div className="space-y-2">
            {analytics.effectiveness < 70 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-200">
                    Meal Bolus Effectiveness Below Target
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    Consider adjusting your insulin-to-carb ratio or pre-bolus timing with your healthcare provider.
                  </div>
                </div>
              </div>
            )}
            
            {analytics.correctionEffectiveness < 70 && (
              <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <div className="font-medium text-red-800 dark:text-red-200">
                    Correction Doses Need Adjustment
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-300">
                    Your correction factor may need adjustment. Discuss with your healthcare provider.
                  </div>
                </div>
              </div>
            )}
            
            {analytics.effectiveness >= 80 && analytics.correctionEffectiveness >= 80 && (
              <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <div className="font-medium text-green-800 dark:text-green-200">
                    Excellent Dosing Control
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    Your insulin dosing is highly effective. Keep up the great work!
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}