'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart
} from 'recharts';
import { 
  UtensilsCrossed, 
  TrendingUp, 
  Target,
  Award,
  Activity
} from 'lucide-react';

interface NutritionAnalytics {
  dailyTotals: Array<{
    date: string;
    totals: {
      calories: number;
      carbs: number;
      protein: number;
      fat: number;
    };
    mealBreakdown: Record<string, any>;
    logCount: number;
  }>;
  overallTotals: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  averages: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  mealTypeStats: Record<string, number>;
  totalLogs: number;
  daysWithLogs: number;
}

interface FoodStats {
  totalLogs: number;
  totalDays: number;
  averageLogsPerDay: number;
  nutritionTotals: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  nutritionAverages: {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
  };
  mealTypeBreakdown: Record<string, number>;
  topFoods: Array<{ name: string; count: number }>;
  topBrands: Array<{ name: string; count: number }>;
  customFoodUsage: {
    total: number;
    percentage: number;
  };
  loggingStreak: {
    current: number;
    longest: number;
  };
  dailyAverages: {
    logsPerDay: number;
    caloriesPerDay: number;
  };
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export function FoodAnalytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<NutritionAnalytics | null>(null);
  const [stats, setStats] = useState<FoodStats | null>(null);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    fetchAnalytics();
  }, [user?.id, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      const [analyticsRes, statsRes] = await Promise.all([
        fetch(`/api/food/nutrition/analytics?period=${period}`),
        fetch(`/api/food/stats?period=${period}`)
      ]);

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        setAnalytics(analyticsData.analytics);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Error fetching food analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
              <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics || !stats) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-8 border border-gray-200 dark:border-slate-700 text-center">
        <UtensilsCrossed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
          No Food Data Available
        </h3>
        <p className="text-gray-600 dark:text-slate-400 mb-4">
          Start logging your meals to see nutrition analytics and insights.
        </p>
        <a
          href="/dashboard/food"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UtensilsCrossed className="w-4 h-4 mr-2" />
          Start Food Logging
        </a>
      </div>
    );
  }

  // Prepare meal type data for pie chart
  const mealTypeData = Object.entries(stats.mealTypeBreakdown).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
    percentage: ((count / stats.totalLogs) * 100).toFixed(1)
  }));

  // Prepare daily nutrition data for line chart
  const dailyNutritionData = analytics.dailyTotals.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: day.totals.calories,
    carbs: day.totals.carbs,
    protein: day.totals.protein,
    fat: day.totals.fat,
    logs: day.logCount
  }));

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
          <UtensilsCrossed className="w-5 h-5" />
          Food & Nutrition Analytics
        </h2>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stats.totalLogs}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Avg Calories/Day</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {Math.round(stats.nutritionAverages.calories)}
              </p>
            </div>
            <Target className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Current Streak</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats.loggingStreak.current} days
              </p>
            </div>
            <Award className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-slate-400">Logs/Day</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                {stats.averageLogsPerDay.toFixed(1)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Daily Nutrition Trends */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
          Daily Nutrition Trends
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyNutritionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgb(30 41 59)',
                  border: '1px solid rgb(51 65 85)',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
              <Area
                type="monotone"
                dataKey="calories"
                stackId="1"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
                name="Calories"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Meal Type Distribution */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Meal Type Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mealTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mealTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any, name: any) => [`${value} logs (${mealTypeData.find(d => d.name === name)?.percentage}%)`, name]}
                  contentStyle={{
                    backgroundColor: 'rgb(30 41 59)',
                    border: '1px solid rgb(51 65 85)',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {mealTypeData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  {entry.name}: {entry.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Macronutrient Breakdown */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Average Daily Macros
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-slate-400">Carbs</span>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {Math.round(stats.nutritionAverages.carbs)}g
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min((stats.nutritionAverages.carbs / 300) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-slate-400">Protein</span>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {Math.round(stats.nutritionAverages.protein)}g
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min((stats.nutritionAverages.protein / 150) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-600 dark:text-slate-400">Fat</span>
                <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                  {Math.round(stats.nutritionAverages.fat)}g
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ 
                    width: `${Math.min((stats.nutritionAverages.fat / 100) * 100, 100)}%` 
                  }}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-slate-400">Total Calories</span>
                <span className="text-lg font-bold text-gray-900 dark:text-slate-100">
                  {Math.round(stats.nutritionAverages.calories)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Foods and Brands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Most Logged Foods
          </h3>
          <div className="space-y-3">
            {stats.topFoods.slice(0, 5).map((food, index) => (
              <div key={food.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400 w-4 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-slate-100 truncate" title={food.name}>
                    {food.name}
                  </span>
                </div>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">
                  {food.count} logs
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">
            Top Brands
          </h3>
          <div className="space-y-3">
            {stats.topBrands.slice(0, 5).map((brand, index) => (
              <div key={brand.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-slate-400 w-4 flex-shrink-0">
                    #{index + 1}
                  </span>
                  <span className="text-sm text-gray-900 dark:text-slate-100 truncate" title={brand.name || 'Generic'}>
                    {brand.name || 'Generic'}
                  </span>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400 flex-shrink-0">
                  {brand.count} logs
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}