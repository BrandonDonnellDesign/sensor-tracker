import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/nutrition/analytics - Get nutrition analytics and trends
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
    const groupBy = searchParams.get('group_by') || 'day'; // day, week, month

    // Calculate date range based on period
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    // Get food logs for the period
    const { data: logs, error } = await supabase
      .from('food_logs')
      .select('logged_at, total_calories, total_carbs_g, total_protein_g, total_fat_g, meal_type')
      .eq('user_id', user.id)
      .gte('logged_at', startDate.toISOString())
      .lte('logged_at', endDate.toISOString())
      .order('logged_at', { ascending: true });

    if (error) {
      console.error('Error fetching nutrition analytics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch nutrition analytics', details: error.message },
        { status: 500 }
      );
    }

    // Process data for analytics
    const analytics = processNutritionData(logs || [], groupBy);
    
    return NextResponse.json({
      period,
      groupBy,
      analytics
    });
  } catch (error) {
    console.error('Error in nutrition analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function processNutritionData(logs: any[], groupBy: string) {
  // Group logs by time period
  const grouped: { [key: string]: any[] } = {};
  
  logs.forEach(log => {
    const date = new Date(log.logged_at);
    let key: string;
    
    switch (groupBy) {
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'day':
      default:
        key = date.toISOString().split('T')[0];
        break;
    }
    
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(log);
  });

  // Calculate totals and averages for each period
  const dailyTotals = Object.entries(grouped).map(([date, dayLogs]) => {
    const totals = dayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.total_calories) || 0),
        carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
        protein: acc.protein + (Number(log.total_protein_g) || 0),
        fat: acc.fat + (Number(log.total_fat_g) || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    // Group by meal type for this day
    const mealBreakdown = dayLogs.reduce((acc: any, log) => {
      const mealType = log.meal_type || 'other';
      if (!acc[mealType]) {
        acc[mealType] = { calories: 0, carbs: 0, protein: 0, fat: 0 };
      }
      acc[mealType].calories += Number(log.total_calories) || 0;
      acc[mealType].carbs += Number(log.total_carbs_g) || 0;
      acc[mealType].protein += Number(log.total_protein_g) || 0;
      acc[mealType].fat += Number(log.total_fat_g) || 0;
      return acc;
    }, {});

    return {
      date,
      totals,
      mealBreakdown,
      logCount: dayLogs.length
    };
  });

  // Calculate overall averages
  const overallTotals = dailyTotals.reduce(
    (acc, day) => ({
      calories: acc.calories + day.totals.calories,
      carbs: acc.carbs + day.totals.carbs,
      protein: acc.protein + day.totals.protein,
      fat: acc.fat + day.totals.fat,
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  );

  const averages = {
    calories: dailyTotals.length > 0 ? overallTotals.calories / dailyTotals.length : 0,
    carbs: dailyTotals.length > 0 ? overallTotals.carbs / dailyTotals.length : 0,
    protein: dailyTotals.length > 0 ? overallTotals.protein / dailyTotals.length : 0,
    fat: dailyTotals.length > 0 ? overallTotals.fat / dailyTotals.length : 0,
  };

  // Find most common meal types
  const mealTypeStats = logs.reduce((acc: any, log) => {
    const mealType = log.meal_type || 'other';
    acc[mealType] = (acc[mealType] || 0) + 1;
    return acc;
  }, {});

  return {
    dailyTotals,
    overallTotals,
    averages,
    mealTypeStats,
    totalLogs: logs.length,
    daysWithLogs: dailyTotals.length
  };
}