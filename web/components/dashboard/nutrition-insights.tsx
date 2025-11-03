'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle,
  Target,
  Clock,
  Zap
} from 'lucide-react';

interface NutritionInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  icon: any;
  action?: string;
}

export function NutritionInsights() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<NutritionInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    
    generateInsights();
  }, [user?.id]);

  const generateInsights = async () => {
    try {
      setLoading(true);
      
      // Fetch recent nutrition data
      const [analyticsRes, statsRes] = await Promise.all([
        fetch('/api/food/nutrition/analytics?period=7d'),
        fetch('/api/food/stats?period=7d')
      ]);

      const generatedInsights: NutritionInsight[] = [];

      if (analyticsRes.ok && statsRes.ok) {
        const analytics = await analyticsRes.json();
        const stats = await statsRes.json();
        
        const nutritionData = analytics.analytics;
        const foodStats = stats.stats;

        // Analyze logging consistency
        if (foodStats.loggingStreak.current >= 7) {
          generatedInsights.push({
            type: 'success',
            title: 'Great Consistency! 🔥',
            message: `You've logged food for ${foodStats.loggingStreak.current} days straight. Keep it up!`,
            icon: CheckCircle
          });
        } else if (foodStats.averageLogsPerDay < 2) {
          generatedInsights.push({
            type: 'warning',
            title: 'Log More Meals',
            message: 'Try logging at least 3 meals per day for better insights.',
            icon: AlertCircle,
            action: 'Log a meal now'
          });
        }

        // Analyze calorie patterns
        const avgCalories = foodStats.nutritionAverages.calories;
        if (avgCalories < 1200) {
          generatedInsights.push({
            type: 'warning',
            title: 'Low Calorie Intake',
            message: `Your average of ${Math.round(avgCalories)} calories may be too low. Consider consulting a nutritionist.`,
            icon: TrendingDown
          });
        } else if (avgCalories > 2500) {
          generatedInsights.push({
            type: 'info',
            title: 'High Calorie Intake',
            message: `Your average of ${Math.round(avgCalories)} calories is quite high. Monitor portion sizes.`,
            icon: TrendingUp
          });
        } else {
          generatedInsights.push({
            type: 'success',
            title: 'Balanced Calories',
            message: `Your average of ${Math.round(avgCalories)} calories looks well-balanced.`,
            icon: Target
          });
        }

        // Analyze macronutrient balance
        const totalMacros = foodStats.nutritionAverages.carbs + foodStats.nutritionAverages.protein + foodStats.nutritionAverages.fat;
        if (totalMacros > 0) {
          const carbPercent = (foodStats.nutritionAverages.carbs * 4 / avgCalories) * 100;
          const proteinPercent = (foodStats.nutritionAverages.protein * 4 / avgCalories) * 100;

          if (proteinPercent < 15) {
            generatedInsights.push({
              type: 'warning',
              title: 'Low Protein Intake',
              message: `Only ${proteinPercent.toFixed(1)}% of calories from protein. Aim for 15-25%.`,
              icon: AlertCircle,
              action: 'Add protein sources'
            });
          } else if (proteinPercent > 25) {
            generatedInsights.push({
              type: 'info',
              title: 'High Protein Diet',
              message: `${proteinPercent.toFixed(1)}% of calories from protein. Great for muscle maintenance!`,
              icon: Zap
            });
          }

          if (carbPercent > 60) {
            generatedInsights.push({
              type: 'warning',
              title: 'High Carb Intake',
              message: `${carbPercent.toFixed(1)}% of calories from carbs. Consider balancing with protein and healthy fats.`,
              icon: TrendingUp
            });
          }
        }

        // Analyze meal timing patterns
        const mealTypes = Object.keys(foodStats.mealTypeBreakdown);
        if (!mealTypes.includes('breakfast') || foodStats.mealTypeBreakdown.breakfast < 2) {
          generatedInsights.push({
            type: 'info',
            title: 'Missing Breakfast',
            message: 'Regular breakfast can help stabilize blood sugar throughout the day.',
            icon: Clock,
            action: 'Log breakfast'
          });
        }

        // Analyze food variety
        if (foodStats.topFoods.length > 0) {
          const topFoodPercent = (foodStats.topFoods[0].count / foodStats.totalLogs) * 100;
          if (topFoodPercent > 30) {
            generatedInsights.push({
              type: 'info',
              title: 'Limited Food Variety',
              message: `${foodStats.topFoods[0].name} makes up ${topFoodPercent.toFixed(1)}% of your logs. Try adding variety!`,
              icon: Brain,
              action: 'Explore new foods'
            });
          }
        }

        // Custom food usage insight
        if (foodStats.customFoodUsage.percentage > 50) {
          generatedInsights.push({
            type: 'success',
            title: 'Great Custom Tracking',
            message: `${foodStats.customFoodUsage.percentage.toFixed(1)}% of your foods are custom entries. Very detailed tracking!`,
            icon: CheckCircle
          });
        }

        // Weekly trend analysis
        if (nutritionData.dailyTotals.length >= 7) {
          const recentDays = nutritionData.dailyTotals.slice(-3);
          const earlierDays = nutritionData.dailyTotals.slice(0, 3);
          
          const recentAvgCalories = recentDays.reduce((sum: number, day: any) => sum + day.totals.calories, 0) / recentDays.length;
          const earlierAvgCalories = earlierDays.reduce((sum: number, day: any) => sum + day.totals.calories, 0) / earlierDays.length;
          
          const calorieChange = ((recentAvgCalories - earlierAvgCalories) / earlierAvgCalories) * 100;
          
          if (Math.abs(calorieChange) > 15) {
            generatedInsights.push({
              type: calorieChange > 0 ? 'warning' : 'info',
              title: `${calorieChange > 0 ? 'Increasing' : 'Decreasing'} Calorie Trend`,
              message: `Your calories have ${calorieChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(calorieChange).toFixed(1)}% this week.`,
              icon: calorieChange > 0 ? TrendingUp : TrendingDown
            });
          }
        }
      }

      // Add general tips if no specific insights
      if (generatedInsights.length === 0) {
        generatedInsights.push({
          type: 'info',
          title: 'Keep Logging!',
          message: 'Log more meals to unlock personalized nutrition insights and recommendations.',
          icon: Brain,
          action: 'Log a meal'
        });
      }

      setInsights(generatedInsights.slice(0, 4)); // Limit to 4 insights
      
    } catch (error) {
      console.error('Error generating nutrition insights:', error);
      setInsights([{
        type: 'info',
        title: 'Start Food Logging',
        message: 'Begin tracking your meals to receive AI-powered nutrition insights.',
        icon: Brain,
        action: 'Go to Food Log'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'error': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default: return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
      <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Brain className="w-4 h-4" />
        Nutrition Insights
      </h3>
      
      <div className="space-y-3">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div
              key={index}
              className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}
            >
              <div className="flex items-start gap-2">
                <IconComponent className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs mt-1 opacity-90">{insight.message}</p>
                  {insight.action && (
                    <button className="text-xs underline mt-1 hover:no-underline">
                      {insight.action}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-slate-700">
        <a
          href="/dashboard/food"
          className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          View Food Dashboard →
        </a>
      </div>
    </div>
  );
}