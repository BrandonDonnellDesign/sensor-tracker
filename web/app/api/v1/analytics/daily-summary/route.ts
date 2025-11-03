import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/analytics/daily-summary:
 *   get:
 *     tags: [Analytics]
 *     summary: Get daily glucose and activity summary
 *     description: Retrieve comprehensive daily summary including glucose stats, food logs, and insights
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date for summary (YYYY-MM-DD). Defaults to today
 *       - in: query
 *         name: timezone
 *         schema:
 *           type: string
 *         description: Timezone for date calculations (e.g., "America/New_York")
 *     responses:
 *       200:
 *         description: Daily summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     glucose_stats:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                           description: Average glucose (mg/dL)
 *                         min:
 *                           type: number
 *                         max:
 *                           type: number
 *                         readings_count:
 *                           type: integer
 *                         time_in_range:
 *                           type: object
 *                           properties:
 *                             target_range:
 *                               type: object
 *                               properties:
 *                                 min:
 *                                   type: number
 *                                 max:
 *                                   type: number
 *                             percentage:
 *                               type: number
 *                             minutes:
 *                               type: integer
 *                         variability:
 *                           type: object
 *                           properties:
 *                             coefficient_of_variation:
 *                               type: number
 *                             standard_deviation:
 *                               type: number
 *                     food_summary:
 *                       type: object
 *                       properties:
 *                         total_meals:
 *                           type: integer
 *                         total_carbs:
 *                           type: number
 *                         total_calories:
 *                           type: number
 *                         meal_breakdown:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               meal_type:
 *                                 type: string
 *                               carbs:
 *                                 type: number
 *                               calories:
 *                                 type: number
 *                               logged_at:
 *                                 type: string
 *                                 format: date-time
 *                     insights:
 *                       type: object
 *                       properties:
 *                         glucose_trends:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                         alerts:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               type:
 *                                 type: string
 *                               message:
 *                                 type: string
 *                               severity:
 *                                 type: string
 *                     comparison:
 *                       type: object
 *                       properties:
 *                         vs_yesterday:
 *                           type: object
 *                           properties:
 *                             average_glucose_change:
 *                               type: number
 *                             time_in_range_change:
 *                               type: number
 *                         vs_7_day_avg:
 *                           type: object
 *                           properties:
 *                             average_glucose_change:
 *                               type: number
 *                             time_in_range_change:
 *                               type: number
 *       401:
 *         description: Authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    const timezone = searchParams.get('timezone') || 'UTC';
    
    // Default to today if no date provided
    const targetDate = dateParam || new Date().toISOString().split('T')[0];
    
    const supabase = await createClient();

    // Get glucose readings for the day
    const { data: glucoseReadings, error: glucoseError } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', authResult.userId)
      .gte('timestamp', `${targetDate}T00:00:00.000Z`)
      .lt('timestamp', `${targetDate}T23:59:59.999Z`)
      .order('timestamp', { ascending: true });

    if (glucoseError) {
      console.error('Error fetching glucose readings:', glucoseError);
    }

    // Get food logs for the day
    const { data: foodLogs, error: foodError } = await supabase
      .from('food_logs')
      .select(`
        *,
        food_items (
          name,
          carbs_per_100g,
          calories_per_100g
        )
      `)
      .eq('user_id', authResult.userId)
      .gte('logged_at', `${targetDate}T00:00:00.000Z`)
      .lt('logged_at', `${targetDate}T23:59:59.999Z`)
      .order('logged_at', { ascending: true });

    if (foodError) {
      console.error('Error fetching food logs:', foodError);
    }

    // Calculate glucose statistics
    const glucoseStats = calculateGlucoseStats(glucoseReadings || []);
    
    // Calculate food summary
    const foodSummary = calculateFoodSummary(foodLogs || []);
    
    // Generate insights
    const insights = generateInsights(glucoseReadings || [], foodLogs || []);
    
    // Get comparison data
    const comparison = await getComparisonData(
      supabase, 
      authResult.userId, 
      targetDate, 
      glucoseStats
    );

    return NextResponse.json({
      success: true,
      data: {
        date: targetDate,
        glucose_stats: glucoseStats,
        food_summary: foodSummary,
        insights,
        comparison
      }
    });

  } catch (error) {
    console.error('Error in daily summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateGlucoseStats(readings: any[]) {
  if (readings.length === 0) {
    return {
      average: null,
      min: null,
      max: null,
      readings_count: 0,
      time_in_range: {
        target_range: { min: 70, max: 180 },
        percentage: null,
        minutes: null
      },
      variability: {
        coefficient_of_variation: null,
        standard_deviation: null
      }
    };
  }

  const values = readings.map(r => r.glucose_value);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Calculate time in range (70-180 mg/dL)
  const inRangeReadings = readings.filter(r => 
    r.glucose_value >= 70 && r.glucose_value <= 180
  );
  const timeInRangePercentage = (inRangeReadings.length / readings.length) * 100;
  
  // Estimate minutes (assuming readings every 5 minutes for CGM)
  const estimatedMinutes = Math.round(timeInRangePercentage * 14.4); // 24 hours = 1440 minutes

  // Calculate variability
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const coefficientOfVariation = (standardDeviation / average) * 100;

  return {
    average: Math.round(average * 10) / 10,
    min,
    max,
    readings_count: readings.length,
    time_in_range: {
      target_range: { min: 70, max: 180 },
      percentage: Math.round(timeInRangePercentage * 10) / 10,
      minutes: estimatedMinutes
    },
    variability: {
      coefficient_of_variation: Math.round(coefficientOfVariation * 10) / 10,
      standard_deviation: Math.round(standardDeviation * 10) / 10
    }
  };
}

function calculateFoodSummary(foodLogs: any[]) {
  if (foodLogs.length === 0) {
    return {
      total_meals: 0,
      total_carbs: 0,
      total_calories: 0,
      meal_breakdown: []
    };
  }

  let totalCarbs = 0;
  let totalCalories = 0;
  const mealBreakdown: any[] = [];

  foodLogs.forEach(log => {
    const carbs = log.carbs || (log.food_items?.carbs_per_100g * log.quantity / 100) || 0;
    const calories = log.calories || (log.food_items?.calories_per_100g * log.quantity / 100) || 0;
    
    totalCarbs += carbs;
    totalCalories += calories;
    
    mealBreakdown.push({
      meal_type: log.meal_type,
      carbs: Math.round(carbs * 10) / 10,
      calories: Math.round(calories),
      logged_at: log.logged_at
    });
  });

  return {
    total_meals: foodLogs.length,
    total_carbs: Math.round(totalCarbs * 10) / 10,
    total_calories: Math.round(totalCalories),
    meal_breakdown: mealBreakdown
  };
}

function generateInsights(glucoseReadings: any[], foodLogs: any[]) {
  const trends: string[] = [];
  const recommendations: string[] = [];
  const alerts: any[] = [];

  if (glucoseReadings.length === 0) {
    alerts.push({
      type: 'no_data',
      message: 'No glucose readings available for this day',
      severity: 'warning'
    });
    return { glucose_trends: trends, recommendations, alerts };
  }

  const values = glucoseReadings.map(r => r.glucose_value);
  const average = values.reduce((sum, val) => sum + val, 0) / values.length;

  // Analyze trends
  if (average > 200) {
    trends.push('High average glucose levels detected');
    recommendations.push('Consider reviewing carbohydrate intake and medication timing');
    alerts.push({
      type: 'high_glucose',
      message: 'Average glucose above 200 mg/dL',
      severity: 'high'
    });
  } else if (average < 70) {
    trends.push('Low average glucose levels detected');
    recommendations.push('Monitor for hypoglycemia and consider adjusting medication');
    alerts.push({
      type: 'low_glucose',
      message: 'Average glucose below 70 mg/dL',
      severity: 'high'
    });
  } else if (average >= 70 && average <= 180) {
    trends.push('Glucose levels within target range');
  }

  // Check for high variability
  const variance = values.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / values.length;
  const cv = (Math.sqrt(variance) / average) * 100;
  
  if (cv > 36) {
    trends.push('High glucose variability detected');
    recommendations.push('Focus on consistent meal timing and portion sizes');
  }

  // Food-related insights
  if (foodLogs.length === 0) {
    recommendations.push('Consider logging meals to better understand glucose patterns');
  } else {
    const totalCarbs = foodLogs.reduce((sum, log) => sum + (log.carbs || 0), 0);
    if (totalCarbs > 200) {
      recommendations.push('High carbohydrate intake detected - consider spreading throughout the day');
    }
  }

  return {
    glucose_trends: trends,
    recommendations,
    alerts
  };
}

async function getComparisonData(supabase: any, userId: string, targetDate: string, currentStats: any) {
  // Get yesterday's data
  const yesterday = new Date(targetDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Get 7-day average (excluding today)
  const sevenDaysAgo = new Date(targetDate);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  try {
    // Yesterday's glucose data
    const { data: yesterdayReadings } = await supabase
      .from('glucose_readings')
      .select('glucose_value')
      .eq('user_id', userId)
      .gte('timestamp', `${yesterdayStr}T00:00:00.000Z`)
      .lt('timestamp', `${yesterdayStr}T23:59:59.999Z`);

    // 7-day average data
    const { data: weekReadings } = await supabase
      .from('glucose_readings')
      .select('glucose_value')
      .eq('user_id', userId)
      .gte('timestamp', `${sevenDaysAgoStr}T00:00:00.000Z`)
      .lt('timestamp', `${targetDate}T00:00:00.000Z`);

    const comparison: any = {
      vs_yesterday: { average_glucose_change: null, time_in_range_change: null },
      vs_7_day_avg: { average_glucose_change: null, time_in_range_change: null }
    };

    // Calculate yesterday comparison
    if (yesterdayReadings && yesterdayReadings.length > 0) {
      const yesterdayAvg = yesterdayReadings.reduce((sum: number, r: any) => sum + r.glucose_value, 0) / yesterdayReadings.length;
      const yesterdayTIR = (yesterdayReadings.filter((r: any) => r.glucose_value >= 70 && r.glucose_value <= 180).length / yesterdayReadings.length) * 100;
      
      comparison.vs_yesterday = {
        average_glucose_change: currentStats.average ? Math.round((currentStats.average - yesterdayAvg) * 10) / 10 : null,
        time_in_range_change: currentStats.time_in_range.percentage ? Math.round((currentStats.time_in_range.percentage - yesterdayTIR) * 10) / 10 : null
      };
    }

    // Calculate 7-day average comparison
    if (weekReadings && weekReadings.length > 0) {
      const weekAvg = weekReadings.reduce((sum: number, r: any) => sum + r.glucose_value, 0) / weekReadings.length;
      const weekTIR = (weekReadings.filter((r: any) => r.glucose_value >= 70 && r.glucose_value <= 180).length / weekReadings.length) * 100;
      
      comparison.vs_7_day_avg = {
        average_glucose_change: currentStats.average ? Math.round((currentStats.average - weekAvg) * 10) / 10 : null,
        time_in_range_change: currentStats.time_in_range.percentage ? Math.round((currentStats.time_in_range.percentage - weekTIR) * 10) / 10 : null
      };
    }

    return comparison;
  } catch (error) {
    console.error('Error calculating comparison data:', error);
    return {
      vs_yesterday: { average_glucose_change: null, time_in_range_change: null },
      vs_7_day_avg: { average_glucose_change: null, time_in_range_change: null }
    };
  }
}
