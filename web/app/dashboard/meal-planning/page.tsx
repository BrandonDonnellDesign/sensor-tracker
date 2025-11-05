'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';
import { SmartFoodLogger } from '@/components/food/smart-food-logger';
import { MealImpactAnalyzer } from '@/components/food/meal-impact-analyzer';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/components/providers/auth-provider';
import { Utensils, Clock, Target, Activity, Calculator, Lightbulb } from 'lucide-react';

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
  source?: string | null;
  created_at?: string | null;
  display_app?: string | null;
  display_device?: string | null;
  display_time?: string | null;
  rate_unit?: string | null;
  record_id?: string | null;
  status?: string | null;
  transmitter_generation?: string | null;
  transmitter_id?: string | null;
  unit?: string | null;
}

export default function MealPlanningPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>([]);
  const [glucoseReadings, setGlucoseReadings] = useState<GlucoseReading[]>([]);
  const [currentGlucose, setCurrentGlucose] = useState<number | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load recent food logs (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [foodResponse, insulinResponse, glucoseResponse] = await Promise.all([
        supabase
          .from('food_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', thirtyDaysAgo.toISOString())
          .order('logged_at', { ascending: false }),
        
        supabase
          .from('insulin_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('taken_at', thirtyDaysAgo.toISOString())
          .order('taken_at', { ascending: false }),
        
        supabase
          .from('glucose_readings')
          .select('*')
          .eq('user_id', user.id)
          .gte('system_time', thirtyDaysAgo.toISOString())
          .order('system_time', { ascending: false })
      ]);

      if (foodResponse.data) setFoodLogs(foodResponse.data);
      if (insulinResponse.data) setInsulinLogs(insulinResponse.data);
      if (glucoseResponse.data) {
        setGlucoseReadings(glucoseResponse.data);
        // Set current glucose to most recent reading
        if (glucoseResponse.data.length > 0) {
          setCurrentGlucose(glucoseResponse.data[0].value);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily statistics
  const todayStats = {
    totalCarbs: foodLogs
      .filter(log => {
        const logDate = new Date(log.logged_at);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      })
      .reduce((sum, log) => sum + (log.total_carbs_g || 0), 0),
    
    totalInsulin: insulinLogs
      .filter(log => {
        const logDate = new Date(log.taken_at);
        const today = new Date();
        return logDate.toDateString() === today.toDateString();
      })
      .reduce((sum, log) => sum + log.units, 0),
    
    mealsToday: foodLogs.filter(log => {
      const logDate = new Date(log.logged_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length
  };

  // Calculate average carb ratio from recent data
  const averageCarbRatio = (() => {
    const recentMeals = foodLogs.slice(0, 10);
    const ratios = recentMeals
      .map(meal => {
        const mealTime = new Date(meal.logged_at);
        const relatedInsulin = insulinLogs.find(insulin => {
          const insulinTime = new Date(insulin.taken_at);
          const timeDiff = Math.abs(mealTime.getTime() - insulinTime.getTime());
          return timeDiff <= 2 * 60 * 60 * 1000; // 2 hours
        });

        if (relatedInsulin && (meal.total_carbs_g || 0) > 0) {
          return (meal.total_carbs_g || 0) / relatedInsulin.units;
        }
        return null;
      })
      .filter((ratio): ratio is number => ratio !== null);

    return ratios.length > 0 ? 
      Math.round(ratios.reduce((a, b) => a + b, 0) / ratios.length) : null;
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Meal Planning & Analysis</h1>
          <p className="text-slate-400">
            Smart food logging with insulin suggestions and meal impact analysis
          </p>
        </div>

        {/* Today's Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Utensils className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-400">Today's Carbs</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(todayStats.totalCarbs)}g</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-400">Today's Insulin</span>
              </div>
              <div className="text-2xl font-bold">{Math.round(todayStats.totalInsulin * 10) / 10}u</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-400">Meals Today</span>
              </div>
              <div className="text-2xl font-bold">{todayStats.mealsToday}</div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-orange-400" />
                <span className="text-sm text-slate-400">Current Glucose</span>
              </div>
              <div className="text-2xl font-bold">
                {currentGlucose ? `${currentGlucose} mg/dL` : 'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Carb Ratio Insight */}
        {averageCarbRatio && (
          <Card className="mb-8 bg-blue-900/20 border-blue-800/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                <span className="font-medium">Your Average Carb Ratio</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                  1:{averageCarbRatio}
                </Badge>
                <span className="text-sm text-slate-300">
                  Based on your recent meals and insulin doses
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="logger" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
            <TabsTrigger value="logger" className="data-[state=active]:bg-blue-600">
              Smart Logger
            </TabsTrigger>
            <TabsTrigger value="analysis" className="data-[state=active]:bg-blue-600">
              Meal Analysis
            </TabsTrigger>
            <TabsTrigger value="insights" className="data-[state=active]:bg-blue-600">
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="logger" className="space-y-6">
            <SmartFoodLogger
              onFoodLogged={loadData}
              currentGlucose={currentGlucose}
              recentMeals={foodLogs}
              insulinHistory={insulinLogs}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <MealImpactAnalyzer
              foodLogs={foodLogs}
              insulinLogs={insulinLogs}
              glucoseReadings={glucoseReadings}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Personalized Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Carb Ratio Insights */}
                {averageCarbRatio && (
                  <div className="p-4 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                    <h4 className="font-medium mb-2">Carb Ratio Analysis</h4>
                    <p className="text-sm text-slate-300 mb-2">
                      Your average carb ratio is 1:{averageCarbRatio}, which means you need about 1 unit of insulin for every {averageCarbRatio} grams of carbs.
                    </p>
                    <div className="text-xs text-slate-400">
                      This is calculated from your recent meal and insulin data. Individual meals may vary based on factors like time of day, activity level, and food type.
                    </div>
                  </div>
                )}

                {/* Meal Timing Insights */}
                <div className="p-4 bg-green-900/20 border border-green-800/30 rounded-lg">
                  <h4 className="font-medium mb-2">Meal Timing Patterns</h4>
                  <p className="text-sm text-slate-300 mb-2">
                    You've logged {todayStats.mealsToday} meals today. Consistent meal timing can help improve glucose control.
                  </p>
                  <div className="text-xs text-slate-400">
                    Try to maintain regular meal times and consider the timing of your insulin doses relative to meals.
                  </div>
                </div>

                {/* Glucose Management */}
                {currentGlucose && (
                  <div className={`p-4 border rounded-lg ${
                    currentGlucose < 70 ? 'bg-red-900/20 border-red-800/30' :
                    currentGlucose > 180 ? 'bg-orange-900/20 border-orange-800/30' :
                    'bg-green-900/20 border-green-800/30'
                  }`}>
                    <h4 className="font-medium mb-2">Current Glucose Status</h4>
                    <p className="text-sm text-slate-300 mb-2">
                      Your current glucose is {currentGlucose} mg/dL.
                      {currentGlucose < 70 && ' This is low - consider having a snack with fast-acting carbs.'}
                      {currentGlucose > 180 && ' This is elevated - consider a correction dose if it\'s been more than 2 hours since your last insulin.'}
                      {currentGlucose >= 70 && currentGlucose <= 180 && ' This is in your target range - great job!'}
                    </p>
                  </div>
                )}

                {/* Data Quality */}
                <div className="p-4 bg-slate-700/30 border border-slate-600/30 rounded-lg">
                  <h4 className="font-medium mb-2">Data Summary</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Food Logs</div>
                      <div className="font-medium">{foodLogs.length} entries</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Insulin Logs</div>
                      <div className="font-medium">{insulinLogs.length} entries</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Glucose Readings</div>
                      <div className="font-medium">{glucoseReadings.length} readings</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">
                    More data helps provide better insights and insulin dose suggestions.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}