import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/stats - Get comprehensive food logging statistics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, all

    // Calculate date range
    let startDate: Date | null = null;
    if (period !== 'all') {
      startDate = new Date();
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }
    }

    // Build query
    let query = supabase
      .from('food_logs')
      .select(`
        id,
        logged_at,
        meal_type,
        total_calories,
        total_carbs_g,
        total_protein_g,
        total_fat_g,
        food_item_id,
        food_items!inner (
          product_name,
          brand
        )
      `)
      .eq('user_id', user.id);

    if (startDate) {
      query = query.gte('logged_at', startDate.toISOString());
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching food stats:', error);
      return NextResponse.json(
        { error: 'Failed to fetch food stats', details: error.message },
        { status: 500 }
      );
    }

    // Calculate statistics
    const stats = calculateFoodStats(logs || []);

    return NextResponse.json({
      period,
      stats
    });
  } catch (error) {
    console.error('Error in food stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateFoodStats(logs: any[]) {
  const totalLogs = logs.length;
  
  if (totalLogs === 0) {
    return {
      totalLogs: 0,
      totalDays: 0,
      averageLogsPerDay: 0,
      nutritionTotals: { calories: 0, carbs: 0, protein: 0, fat: 0 },
      nutritionAverages: { calories: 0, carbs: 0, protein: 0, fat: 0 },
      mealTypeBreakdown: {},
      topFoods: [],
      topBrands: [],
      customFoodUsage: { total: 0, percentage: 0 },
      loggingStreak: { current: 0, longest: 0 },
      dailyAverages: { logsPerDay: 0, caloriesPerDay: 0 }
    };
  }

  // Calculate nutrition totals
  const nutritionTotals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (Number(log.total_calories) || 0),
      carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
      protein: acc.protein + (Number(log.total_protein_g) || 0),
      fat: acc.fat + (Number(log.total_fat_g) || 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  // Calculate unique days
  const uniqueDays = new Set(
    logs.map(log => new Date(log.logged_at).toDateString())
  ).size;

  // Calculate averages
  const nutritionAverages = {
    calories: uniqueDays > 0 ? nutritionTotals.calories / uniqueDays : 0,
    carbs: uniqueDays > 0 ? nutritionTotals.carbs / uniqueDays : 0,
    protein: uniqueDays > 0 ? nutritionTotals.protein / uniqueDays : 0,
    fat: uniqueDays > 0 ? nutritionTotals.fat / uniqueDays : 0,
  };

  // Meal type breakdown
  const mealTypeBreakdown = logs.reduce((acc: any, log) => {
    const mealType = log.meal_type || 'other';
    acc[mealType] = (acc[mealType] || 0) + 1;
    return acc;
  }, {});

  // Top foods
  const foodCounts = logs.reduce((acc: any, log) => {
    const foodName = log.food_items?.product_name || 'Unknown';
    acc[foodName] = (acc[foodName] || 0) + 1;
    return acc;
  }, {});

  const topFoods = Object.entries(foodCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Top brands
  const brandCounts = logs.reduce((acc: any, log) => {
    const brand = log.food_items?.brand;
    if (brand) {
      acc[brand] = (acc[brand] || 0) + 1;
    }
    return acc;
  }, {});

  const topBrands = Object.entries(brandCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));

  // Custom food usage (placeholder since is_custom field may not exist yet)
  const customFoodLogs = logs.filter(log => (log.food_items as any)?.is_custom === true);
  const customFoodUsage = {
    total: customFoodLogs.length,
    percentage: totalLogs > 0 ? (customFoodLogs.length / totalLogs) * 100 : 0
  };

  // Calculate logging streak
  const sortedDates = Array.from(
    new Set(logs.map(log => new Date(log.logged_at).toDateString()))
  ).sort();

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date().toDateString();
  let checkingCurrent = true;

  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const currentDate = new Date(sortedDates[i]);
    const nextDate = i < sortedDates.length - 1 ? new Date(sortedDates[i + 1]) : new Date();
    
    const dayDiff = Math.floor((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (dayDiff <= 1) {
      tempStreak++;
      if (checkingCurrent && (sortedDates[i] === today || dayDiff === 1)) {
        currentStreak = tempStreak;
      }
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
      checkingCurrent = false;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return {
    totalLogs,
    totalDays: uniqueDays,
    averageLogsPerDay: uniqueDays > 0 ? totalLogs / uniqueDays : 0,
    nutritionTotals,
    nutritionAverages,
    mealTypeBreakdown,
    topFoods,
    topBrands,
    customFoodUsage,
    loggingStreak: { current: currentStreak, longest: longestStreak },
    dailyAverages: {
      logsPerDay: uniqueDays > 0 ? totalLogs / uniqueDays : 0,
      caloriesPerDay: nutritionAverages.calories
    }
  };
}