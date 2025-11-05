'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Utensils, Syringe, Activity } from 'lucide-react';

interface FoodLog {
  id: string;
  logged_at: string;
  product_name?: string | null;
  custom_food_name?: string | null;
  serving_size?: number | null;
  total_carbs_g?: number | null;
  total_calories?: number | null;
  meal_type?: string | null;
  user_serving_size?: number | null;
  user_serving_unit?: string | null;
  cgm_reading_at_meal?: number | null;
  cgm_trend_at_meal?: string | null;
  created_at: string;
  custom_calories?: number | null;
  custom_carbs_g?: number | null;
}

interface InsulinLog {
  id: string;
  taken_at: string;
  units: number;
  insulin_type: string;
  notes?: string | null;
  delivery_type?: string;
  activity_level?: string | null;
  blood_glucose_after?: number | null;
  blood_glucose_before?: number | null;
  created_at?: string | null;
  injection_site?: string | null;
  user_id: string;
}

interface GlucoseReading {
  id: string;
  system_time: string;
  value: number;
  trend?: string | null;
}

interface MealImpactAnalyzerProps {
  foodLogs: FoodLog[];
  insulinLogs: InsulinLog[];
  glucoseReadings: GlucoseReading[];
}

interface MealEvent {
  id: string;
  timestamp: string;
  type: 'meal' | 'insulin' | 'glucose';
  foodLog?: FoodLog;
  insulinLog?: InsulinLog;
  glucoseReading?: GlucoseReading;
  relatedEvents: string[];
}

export function MealImpactAnalyzer({ foodLogs, insulinLogs, glucoseReadings }: MealImpactAnalyzerProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<'24h' | '7d'>('24h');
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);

  const mealAnalysis = useMemo(() => {
    // Filter data by time range
    const now = new Date();
    const cutoffTime = new Date();
    if (selectedTimeRange === '24h') {
      cutoffTime.setHours(now.getHours() - 24);
    } else {
      cutoffTime.setDate(now.getDate() - 7);
    }

    const recentFoodLogs = foodLogs.filter(log => new Date(log.logged_at) >= cutoffTime);
    const recentInsulinLogs = insulinLogs.filter(log => new Date(log.taken_at) >= cutoffTime);
    const recentGlucoseReadings = glucoseReadings.filter(reading => new Date(reading.system_time) >= cutoffTime);

    // Group events by meal
    const mealGroups: { [key: string]: MealEvent[] } = {};

    // Process food logs as meal anchors
    recentFoodLogs.forEach(foodLog => {
      const mealTime = new Date(foodLog.logged_at);
      const mealId = `meal_${foodLog.id}`;
      
      mealGroups[mealId] = [{
        id: foodLog.id,
        timestamp: foodLog.logged_at,
        type: 'meal',
        foodLog,
        relatedEvents: []
      }];

      // Find related insulin within 2 hours before/after meal
      const insulinWindow = 2 * 60 * 60 * 1000; // 2 hours
      recentInsulinLogs.forEach(insulinLog => {
        const insulinTime = new Date(insulinLog.taken_at);
        const timeDiff = Math.abs(mealTime.getTime() - insulinTime.getTime());
        
        if (timeDiff <= insulinWindow) {
          mealGroups[mealId].push({
            id: insulinLog.id,
            timestamp: insulinLog.taken_at,
            type: 'insulin',
            insulinLog,
            relatedEvents: [foodLog.id]
          });
        }
      });

      // Find glucose readings 4 hours before and after meal
      const glucoseWindow = 4 * 60 * 60 * 1000; // 4 hours
      recentGlucoseReadings.forEach(reading => {
        const readingTime = new Date(reading.system_time);
        const timeDiff = readingTime.getTime() - mealTime.getTime();
        
        if (timeDiff >= -glucoseWindow && timeDiff <= glucoseWindow) {
          mealGroups[mealId].push({
            id: reading.id,
            timestamp: reading.system_time,
            type: 'glucose',
            glucoseReading: reading,
            relatedEvents: [foodLog.id]
          });
        }
      });

      // Sort events by timestamp
      mealGroups[mealId].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    });

    // Analyze each meal's impact
    const mealImpacts = Object.entries(mealGroups).map(([mealId, events]) => {
      const mealEvent = events.find(e => e.type === 'meal');
      const insulinEvents = events.filter(e => e.type === 'insulin');
      const glucoseEvents = events.filter(e => e.type === 'glucose');

      if (!mealEvent?.foodLog) return null;

      // Calculate glucose impact
      const mealTime = new Date(mealEvent.timestamp);
      const preMealGlucose = glucoseEvents
        .filter(e => new Date(e.timestamp) <= mealTime)
        .slice(-3) // Last 3 readings before meal
        .map(e => e.glucoseReading!.value);
      
      const postMealGlucose = glucoseEvents
        .filter(e => {
          const readingTime = new Date(e.timestamp);
          const timeDiff = readingTime.getTime() - mealTime.getTime();
          return timeDiff > 0 && timeDiff <= 3 * 60 * 60 * 1000; // 3 hours after meal
        })
        .map(e => e.glucoseReading!.value);

      const preMealAvg = preMealGlucose.length > 0 ? 
        preMealGlucose.reduce((a, b) => a + b, 0) / preMealGlucose.length : null;
      
      const postMealPeak = postMealGlucose.length > 0 ? Math.max(...postMealGlucose) : null;
      const postMealAvg = postMealGlucose.length > 0 ? 
        postMealGlucose.reduce((a, b) => a + b, 0) / postMealGlucose.length : null;

      const glucoseRise = preMealAvg && postMealPeak ? postMealPeak - preMealAvg : null;
      
      // Calculate insulin coverage
      const totalInsulin = insulinEvents.reduce((sum, e) => sum + (e.insulinLog?.units || 0), 0);
      const carbRatio = totalInsulin > 0 && (mealEvent.foodLog.total_carbs_g || 0) > 0 ? 
        (mealEvent.foodLog.total_carbs_g || 0) / totalInsulin : null;

      return {
        mealId,
        foodLog: mealEvent.foodLog,
        insulinEvents,
        glucoseEvents,
        preMealAvg,
        postMealPeak,
        postMealAvg,
        glucoseRise,
        totalInsulin,
        carbRatio,
        events
      };
    }).filter(Boolean);

    return mealImpacts;
  }, [foodLogs, insulinLogs, glucoseReadings, selectedTimeRange]);

  const selectedMealData = useMemo(() => {
    if (!selectedMeal) return null;
    return mealAnalysis.find(meal => meal?.mealId === selectedMeal);
  }, [selectedMeal, mealAnalysis]);

  const chartData = useMemo(() => {
    if (!selectedMealData) return [];
    
    return selectedMealData.glucoseEvents.map(event => ({
      timestamp: event.timestamp,
      glucose: event.glucoseReading!.value,
      formattedTime: new Date(event.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }));
  }, [selectedMealData]);

  const getMealImpactColor = (rise: number | null) => {
    if (!rise) return 'bg-gray-500';
    if (rise < 50) return 'bg-green-500';
    if (rise < 100) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getMealImpactLabel = (rise: number | null) => {
    if (!rise) return 'Unknown';
    if (rise < 50) return 'Low Impact';
    if (rise < 100) return 'Moderate Impact';
    return 'High Impact';
  };

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedTimeRange === '24h' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeRange('24h')}
        >
          Last 24 Hours
        </Button>
        <Button
          variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedTimeRange('7d')}
        >
          Last 7 Days
        </Button>
      </div>

      {/* Meal Impact Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Meal Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mealAnalysis.length === 0 ? (
            <p className="text-slate-400">No meals found in the selected time range.</p>
          ) : (
            <div className="space-y-4">
              {mealAnalysis.map((meal) => {
                if (!meal) return null;
                
                const foodName = meal.foodLog.product_name || meal.foodLog.custom_food_name || 'Unknown Food';
                const mealTime = new Date(meal.foodLog.logged_at);
                
                return (
                  <div
                    key={meal.mealId}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMeal === meal.mealId 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedMeal(selectedMeal === meal.mealId ? null : meal.mealId)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{foodName}</h4>
                        <p className="text-sm text-slate-500">
                          {mealTime.toLocaleString()} • {meal.foodLog.total_carbs_g || 0}g carbs
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {meal.totalInsulin > 0 && (
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Syringe className="h-3 w-3" />
                            {meal.totalInsulin}u
                          </Badge>
                        )}
                        
                        {meal.glucoseRise !== null && (
                          <Badge className={`${getMealImpactColor(meal.glucoseRise)} text-white`}>
                            {meal.glucoseRise > 0 ? '+' : ''}{Math.round(meal.glucoseRise)} mg/dL
                          </Badge>
                        )}
                        
                        <Badge variant="secondary">
                          {getMealImpactLabel(meal.glucoseRise)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Meal Analysis */}
      {selectedMealData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Detailed Analysis: {selectedMealData.foodLog.product_name || selectedMealData.foodLog.custom_food_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meal Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Total Carbs</div>
                <div className="text-xl font-bold">{selectedMealData.foodLog.total_carbs_g || 0}g</div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                <div className="text-sm text-slate-500 mb-1">Insulin Given</div>
                <div className="text-xl font-bold">{selectedMealData.totalInsulin}u</div>
              </div>
              
              {selectedMealData.carbRatio && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-sm text-slate-500 mb-1">Carb Ratio</div>
                  <div className="text-xl font-bold">1:{Math.round(selectedMealData.carbRatio)}</div>
                </div>
              )}
              
              {selectedMealData.glucoseRise !== null && (
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-sm text-slate-500 mb-1">Glucose Rise</div>
                  <div className="text-xl font-bold">
                    {selectedMealData.glucoseRise > 0 ? '+' : ''}{Math.round(selectedMealData.glucoseRise)} mg/dL
                  </div>
                </div>
              )}
            </div>

            {/* Glucose Chart */}
            {chartData.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Glucose Response</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="formattedTime" />
                      <YAxis domain={[50, 300]} />
                      <Tooltip />
                      <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="5 5" />
                      <ReferenceLine y={180} stroke="#f97316" strokeDasharray="5 5" />
                      <Line
                        type="monotone"
                        dataKey="glucose"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="font-medium mb-3">Event Timeline</h4>
              <div className="space-y-2">
                {selectedMealData.events.map((event) => {
                  const time = new Date(event.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  return (
                    <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800 rounded">
                      {event.type === 'meal' && <Utensils className="h-4 w-4 text-green-500" />}
                      {event.type === 'insulin' && <Syringe className="h-4 w-4 text-blue-500" />}
                      {event.type === 'glucose' && <Activity className="h-4 w-4 text-red-500" />}
                      
                      <span className="text-sm font-mono">{time}</span>
                      
                      <span className="text-sm">
                        {event.type === 'meal' && `${event.foodLog?.product_name || event.foodLog?.custom_food_name} (${event.foodLog?.total_carbs_g || 0}g carbs)`}
                        {event.type === 'insulin' && `${event.insulinLog?.units}u insulin`}
                        {event.type === 'glucose' && `${event.glucoseReading?.value} mg/dL`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}