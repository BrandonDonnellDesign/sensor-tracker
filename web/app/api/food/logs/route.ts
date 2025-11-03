import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/logs - Get user's food logs with filtering options
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date'); // YYYY-MM-DD format
    const mealType = searchParams.get('meal_type'); // breakfast, lunch, dinner, snack
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('food_logs_with_cgm')
      .select('*')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false });

    // Apply filters
    if (date) {
      const startOfDay = `${date}T00:00:00Z`;
      const endOfDay = `${date}T23:59:59Z`;
      query = query.gte('logged_at', startOfDay).lte('logged_at', endOfDay);
    }

    if (startDate && endDate) {
      query = query.gte('logged_at', `${startDate}T00:00:00Z`).lte('logged_at', `${endDate}T23:59:59Z`);
    }

    if (mealType) {
      query = query.eq('meal_type', mealType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, error } = await query;

    if (error) {
      console.error('Error fetching food logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch food logs', details: error.message },
        { status: 500 }
      );
    }

    // Calculate nutrition totals for the filtered logs
    const totals = (logs || []).reduce(
      (acc, log) => ({
        calories: acc.calories + (Number(log.total_calories) || 0),
        carbs: acc.carbs + (Number(log.total_carbs_g) || 0),
        protein: acc.protein + (Number(log.total_protein_g) || 0),
        fat: acc.fat + (Number(log.total_fat_g) || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    return NextResponse.json({
      logs: logs || [],
      totals,
      pagination: {
        limit,
        offset,
        total: logs?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in food logs API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/food/logs - Create a new food log entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      food_item_id,
      serving_size,
      serving_unit = 'g',
      user_serving_size,
      user_serving_unit,
      total_calories,
      total_carbs_g,
      total_protein_g,
      total_fat_g,
      meal_type = 'snack',
      notes,
      logged_at
    } = body;

    if (!food_item_id) {
      return NextResponse.json(
        { error: 'Food item ID is required' },
        { status: 400 }
      );
    }

    const logData = {
      user_id: user.id,
      food_item_id,
      serving_size: serving_size || 100,
      serving_unit,
      user_serving_size,
      user_serving_unit,
      total_calories,
      total_carbs_g,
      total_protein_g,
      total_fat_g,
      meal_type,
      notes,
      logged_at: logged_at || new Date().toISOString(),
    };

    const { data: log, error } = await supabase
      .from('food_logs')
      .insert(logData)
      .select()
      .single();

    if (error) {
      console.error('Error creating food log:', error);
      return NextResponse.json(
        { error: 'Failed to create food log', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    console.error('Error in food logs POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}