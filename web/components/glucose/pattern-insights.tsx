'use client';

import { useMemo } from 'react';
import { Calendar, TrendingUp, Utensils, Activity, Moon, Sun } from 'lucide-react';

interface GlucoseReading {
  id: string;
  value: number;
  system_time: string;
  trend?: string | null;
  source: string | null;
}

interface FoodLog {
  id: string;
  user_id: string;
  product_name: string;
  total_carbs_g: number;
  logged_at: string;
}

interface InsulinLog {
  id: string;
  user_id: string;
  units: number;
  insulin_type: string;
  taken_at: string;
}

interface PatternInsightsProps {
  readings: GlucoseReading[];
  foodLogs?: FoodLog[];
  insulinLogs?: InsulinLog[];
  loading: boolean;
}

export function PatternInsights({ readings, foodLogs = [], insulinLogs = [], loading }: PatternInsightsProps) {
  const insights = useMemo(() => {
    if (readings.length < 50) return null; // Need sufficient data for pattern analysis

    const sortedReadings = [...readings].sort((a, b) => 
      new Date(a.system_time).getTime() - new Date(b.system_time).getTime()
    );

    // Day of week patterns
    const dayPatterns = Array.from({ length: 7 }, (_, day) => {
      const dayReadings = sortedReadings.filter(r => 
        new Date(r.system_time).getDay() === day
      );
      
      if (dayReadings.length === 0) return { day, average: 0, tir: 0, count: 0 };
      
      const values = dayReadings.map(r => r.value);
      const average = values.reduce((a, b) => a + b, 0) / values.length;
      const inRange = values.filter(v => v >= 70 && v <= 180).length;
      
      return {
        day,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day],
        average: Math.round(average),
        tir: Math.round((inRange / values.length) * 100),
        count: dayReadings.length
      };
    });

    // Meal impact analysis
    const mealImpacts = foodLogs.map(meal => {
      const mealTime = new Date(meal.logged_at);
      
      // Get glucose readings 1 hour before and 3 hours after meal
      const preReadings = sortedReadings.filter(r => {
        const readingTime = new Date(r.system_time);
        const timeDiff = (mealTime.getTime() - readingTime.getTime()) / (1000 * 60);
        return timeDiff >= 0 && timeDiff <= 60; // 1 hour before
      });
      
      const postReadings = sortedReadings.filter(r => {
        const readingTime = new Date(r.system_time);
        const timeDiff = (readingTime.getTime() - mealTime.getTime()) / (1000 * 60);
        return timeDiff >= 0 && timeDiff <= 180; // 3 hours after
      });

      if (preReadings.length === 0 || postReadings.length === 0) return null;

      const preAvg = preReadings.reduce((sum, r) => sum + r.value, 0) / preReadings.length;
      const postMax = Math.max(...postReadings.map(r => r.value));
      const postAvg = postReadings.reduce((sum, r) => sum + r.value, 0) / postReadings.length;
      
      return {
        meal: meal.product_name,
        carbs: meal.total_carbs_g,
        preGlucose: Math.round(preAvg),
        postMax: postMax,
        postAvg: Math.round(postAvg),
        spike: Math.round(postMax - preAvg),
        time: meal.logged_at
      };
    }).filter((meal): meal is NonNullable<typeof meal> => meal !== null);

    // Sleep pattern analysis (10pm - 6am)
    const sleepReadings = sortedReadings.filter(r => {
      const hour = new Date(r.system_time).getHours();
      return hour >= 22 || hour <= 6;
    });

    const sleepStats = sleepReadings.length > 0 ? {
      average: Math.round(sleepReadings.reduce((sum, r) => sum + r.value, 0) / sleepReadings.length),
      tir: Math.round((sleepReadings.filter(r => r.value >= 70 && r.value <= 180).length / sleepReadings.length) * 100),
      lows: sleepReadings.filter(r => r.value < 70).length,
      highs: sleepReadings.filter(r => r.value > 180).length
    } : null;

    // Dawn phenomenon detection (4am - 8am)
    const dawnReadings = sortedReadings.filter(r => {
      const hour = new Date(r.system_time).getHours();
      return hour >= 4 && hour <= 8;
    });

    const dawnPhenomenon = dawnReadings.length > 10 ? {
      detected: dawnReadings.some((reading, i) => {
        if (i === 0) return false;
        const prevReading = dawnReadings[i - 1];
        return reading.value - prevReading.value > 30; // 30+ mg/dL rise
      }),
      averageRise: dawnReadings.length > 1 ? 
        Math.round((dawnReadings[dawnReadings.length - 1].value - dawnReadings[0].value) / (dawnReadings.length - 1)) : 0
    } : null;

    // Exercise correlation (if we had exercise data, we'd analyze it here)
    // For now, we'll look for patterns in glucose drops that might indicate exercise
    const potentialExerciseEvents = [];
    for (let i = 1; i < sortedReadings.length; i++) {
      const current = sortedReadings[i];
      const previous = sortedReadings[i - 1];
      const timeDiff = (new Date(current.system_time).getTime() - new Date(previous.system_time).getTime()) / (1000 * 60);
      
      if (timeDiff <= 30 && previous.value - current.value > 50) { // 50+ mg/dL drop in 30 min
        potentialExerciseEvents.push({
          time: current.system_time,
          drop: previous.value - current.value,
          startValue: previous.value,
          endValue: current.value
        });
      }
    }

    // Best and worst days analysis
    const dailyStats: { [key: string]: { values: number[]; date: string } } = {};
    sortedReadings.forEach(reading => {
      const date = new Date(reading.system_time).toDateString();
      if (!dailyStats[date]) {
        dailyStats[date] = { values: [], date };
      }
      dailyStats[date].values.push(reading.value);
    });

    const dailyTIR = Object.values(dailyStats).map(day => ({
      date: day.date,
      tir: (day.values.filter(v => v >= 70 && v <= 180).length / day.values.length) * 100,
      average: day.values.reduce((a, b) => a + b, 0) / day.values.length,
      count: day.values.length
    })).filter(day => day.count >= 10); // Only days with sufficient data

    const bestDay = dailyTIR.length > 0 ? dailyTIR.reduce((best, day) => day.tir > best.tir ? day : best) : null;
    const worstDay = dailyTIR.length > 0 ? dailyTIR.reduce((worst, day) => day.tir < worst.tir ? day : worst) : null;

    return {
      dayPatterns,
      mealImpacts: mealImpacts.slice(-10), // Last 10 meals
      sleepStats,
      dawnPhenomenon,
      potentialExerciseEvents: potentialExerciseEvents.slice(-5), // Last 5 events
      bestDay,
      worstDay,
      weeklyTrend: calculateWeeklyTrend(dailyTIR)
    };
  }, [readings, foodLogs, insulinLogs]);

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Pattern Insights</h3>
        <p className="text-slate-400">Need at least 50 glucose readings for pattern analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/30 rounded-lg border border-slate-700/30 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Pattern Insights</h3>
        
        {/* Weekly Pattern */}
        <div className="mb-8">
          <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Weekly Patterns
          </h4>
          <div className="grid grid-cols-7 gap-2">
            {insights.dayPatterns.map((pattern) => (
              <div key={pattern.day} className="bg-slate-700/30 rounded-lg p-3 text-center">
                <div className="text-sm font-medium text-white mb-1">{pattern.dayName}</div>
                <div className="text-lg font-bold text-white">{pattern.tir}%</div>
                <div className="text-xs text-slate-400">TIR</div>
                <div className="text-sm text-slate-300 mt-1">{pattern.average} mg/dL</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sleep Analysis */}
        {insights.sleepStats && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Sleep Patterns (10pm - 6am)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Average</div>
                <div className="text-xl font-bold text-white">{insights.sleepStats.average} mg/dL</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Time in Range</div>
                <div className="text-xl font-bold text-white">{insights.sleepStats.tir}%</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Night Lows</div>
                <div className="text-xl font-bold text-white">{insights.sleepStats.lows}</div>
              </div>
              <div className="bg-slate-700/30 rounded-lg p-4">
                <div className="text-sm text-slate-400 mb-1">Night Highs</div>
                <div className="text-xl font-bold text-white">{insights.sleepStats.highs}</div>
              </div>
            </div>
          </div>
        )}

        {/* Dawn Phenomenon */}
        {insights.dawnPhenomenon && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Dawn Phenomenon (4am - 8am)
            </h4>
            <div className={`${insights.dawnPhenomenon.detected ? 'bg-yellow-900/20 border-yellow-800/30' : 'bg-green-900/20 border-green-800/30'} border rounded-lg p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`text-lg font-bold ${insights.dawnPhenomenon.detected ? 'text-yellow-300' : 'text-green-300'}`}>
                  {insights.dawnPhenomenon.detected ? 'Detected' : 'Not Detected'}
                </div>
              </div>
              <div className="text-sm text-slate-300">
                {insights.dawnPhenomenon.detected 
                  ? `Average rise: ${insights.dawnPhenomenon.averageRise} mg/dL per hour`
                  : 'No significant morning glucose rise detected'
                }
              </div>
            </div>
          </div>
        )}

        {/* Meal Impact Analysis */}
        {insights.mealImpacts.length > 0 && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <Utensils className="h-4 w-4" />
              Recent Meal Impacts
            </h4>
            <div className="space-y-3">
              {insights.mealImpacts.slice(0, 5).map((meal, i) => (
                <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium text-white">{meal.meal}</div>
                      <div className="text-sm text-slate-400">{meal.carbs}g carbs</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${meal.spike > 80 ? 'text-red-400' : meal.spike > 50 ? 'text-yellow-400' : 'text-green-400'}`}>
                        +{meal.spike} mg/dL
                      </div>
                      <div className="text-xs text-slate-400">spike</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-300">
                    <span>Pre: {meal.preGlucose} mg/dL</span>
                    <span>Peak: {meal.postMax} mg/dL</span>
                    <span>3hr Avg: {meal.postAvg} mg/dL</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise Events */}
        {insights.potentialExerciseEvents.length > 0 && (
          <div className="mb-8">
            <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Potential Exercise Events
            </h4>
            <div className="space-y-2">
              {insights.potentialExerciseEvents.map((event, i) => (
                <div key={i} className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-blue-200">
                        {new Date(event.time).toLocaleDateString()} {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-blue-300 font-medium">-{event.drop} mg/dL</div>
                      <div className="text-xs text-slate-400">{event.startValue} → {event.endValue}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best vs Worst Days */}
        {insights.bestDay && insights.worstDay && (
          <div>
            <h4 className="text-md font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance Comparison
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-green-400 font-medium">Best Day</div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{Math.round(insights.bestDay.tir)}% TIR</div>
                <div className="text-sm text-slate-300">
                  {new Date(insights.bestDay.date).toLocaleDateString()}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {Math.round(insights.bestDay.average)} mg/dL
                </div>
              </div>

              <div className="bg-red-900/20 border border-red-800/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-red-400 font-medium">Challenging Day</div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{Math.round(insights.worstDay.tir)}% TIR</div>
                <div className="text-sm text-slate-300">
                  {new Date(insights.worstDay.date).toLocaleDateString()}
                </div>
                <div className="text-sm text-slate-400">
                  Avg: {Math.round(insights.worstDay.average)} mg/dL
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function calculateWeeklyTrend(dailyTIR: any[]) {
  if (dailyTIR.length < 7) return null;
  
  const recentWeek = dailyTIR.slice(-7);
  const previousWeek = dailyTIR.slice(-14, -7);
  
  if (previousWeek.length < 7) return null;
  
  const recentAvg = recentWeek.reduce((sum, day) => sum + day.tir, 0) / recentWeek.length;
  const previousAvg = previousWeek.reduce((sum, day) => sum + day.tir, 0) / previousWeek.length;
  
  return {
    current: Math.round(recentAvg),
    previous: Math.round(previousAvg),
    change: Math.round(recentAvg - previousAvg)
  };
}