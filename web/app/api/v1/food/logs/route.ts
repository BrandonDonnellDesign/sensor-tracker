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
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const mealType = searchParams.get('meal_type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    
    let query = supabase
      .from('food_logs_with_cgm')
      .select('*')
      .eq('user_id', authResult.userId!)
      .order('logged_at', { ascending: false });

    // Apply filters
    if (date) {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;
      query = query.gte('logged_at', startOfDay).lte('logged_at', endOfDay);
    }

    if (mealType) {
      query = query.eq('meal_type', mealType);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching food logs:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch food logs' },
        { status: 500 }
      );
    }

    // Calculate nutrition totals
    const totals = (logs || []).reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.total_calories) || 0),
        carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
        protein: acc.protein + (Number(log.total_protein_g) || 0),
        fat: acc.fat + (Number(log.total_fat_g) || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: logs || [],
      totals,
      pagination: {
        page,
        limit,
        total: logs?.length || 0,
        hasNext: (logs?.length || 0) === limit,
        hasPrev: page > 1
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in food logs API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}