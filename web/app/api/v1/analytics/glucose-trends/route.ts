import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication and rate limit
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 1d, 7d, 30d, 90d
    const includeFood = searchParams.get('include_food') === 'true';

    const supabase = await createClient();
    
    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '1d':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get glucose readings
    const { data: readings, error: readingsError } = await supabase
      .from('glucose_readings')
      .select('value, system_time, trend')
      .eq('user_id', authResult.userId!)
      .gte('system_time', startDate.toISOString())
      .order('system_time', { ascending: true });

    if (readingsError) {
      console.error('Error fetching glucose readings:', readingsError);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch glucose data' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const values = (readings || []).map(r => r.value);
    const stats = {
      count: values.length,
      average: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
      min: values.length > 0 ? Math.min(...values) : 0,
      max: values.length > 0 ? Math.max(...values) : 0,
      timeInRange: {
        veryLow: values.filter(v => v < 54).length,
        low: values.filter(v => v >= 54 && v < 70).length,
        target: values.filter(v => v >= 70 && v <= 180).length,
        high: values.filter(v => v > 180 && v <= 250).length,
        veryHigh: values.filter(v => v > 250).length
      }
    };

    // Convert counts to percentages
    if (stats.count > 0) {
      Object.keys(stats.timeInRange).forEach(key => {
        const typedKey = key as keyof typeof stats.timeInRange;
        stats.timeInRange[typedKey] = Math.round((stats.timeInRange[typedKey] / stats.count) * 100);
      });
    }

    let foodCorrelations = null;
    if (includeFood) {
      // Get basic food logs for correlation analysis
      const { data: foodLogs, error: foodError } = await supabase
        .from('food_logs')
        .select('logged_at, total_carbs_g, meal_type')
        .eq('user_id', authResult.userId!)
        .gte('logged_at', startDate.toISOString());

      if (!foodError && foodLogs) {
        // Analyze food impact on glucose (simplified)
        const mealImpacts: Record<string, any> = {};
        foodLogs.forEach(log => {
          const mealType = log.meal_type || 'unknown';
          if (!mealImpacts[mealType]) {
            mealImpacts[mealType] = { count: 0, avgCarbs: 0 };
          }
          
          mealImpacts[mealType].count++;
          mealImpacts[mealType].avgCarbs += log.total_carbs_g || 0;
        });

        // Calculate averages
        Object.keys(mealImpacts).forEach(mealType => {
          const impact = mealImpacts[mealType];
          if (impact.count > 0) {
            impact.avgCarbs = Math.round(impact.avgCarbs / impact.count);
          }
        });

        foodCorrelations = mealImpacts;
      }
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: {
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        statistics: stats,
        readings: readings || [],
        foodCorrelations
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in glucose trends API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}