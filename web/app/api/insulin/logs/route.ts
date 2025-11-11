import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/insulin/logs - Retrieve insulin logs with pagination
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const deliveryType = searchParams.get('delivery_type');
    const insulinType = searchParams.get('insulin_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // Build query
    let query = supabase
      .from('insulin_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false });

    // Apply filters
    if (deliveryType) {
      query = query.eq('delivery_type', deliveryType);
    }
    if (insulinType) {
      query = query.eq('insulin_type', insulinType);
    }
    if (startDate) {
      query = query.gte('taken_at', startDate);
    }
    if (endDate) {
      query = query.lte('taken_at', endDate);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Calculate pagination metadata
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      data: logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/insulin/logs - Create new insulin log entry
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validate required fields
    const { units, insulin_type, taken_at } = body;
    if (!units || !insulin_type || !taken_at) {
      return NextResponse.json(
        { error: 'Missing required fields: units, insulin_type, taken_at' },
        { status: 400 }
      );
    }

    // Validate units is a positive number
    if (typeof units !== 'number' || units <= 0) {
      return NextResponse.json(
        { error: 'Units must be a positive number' },
        { status: 400 }
      );
    }

    // Validate insulin_type
    const validInsulinTypes = ['rapid', 'short', 'intermediate', 'long'];
    if (!validInsulinTypes.includes(insulin_type)) {
      return NextResponse.json(
        { error: 'Invalid insulin_type. Must be one of: ' + validInsulinTypes.join(', ') },
        { status: 400 }
      );
    }

    // Validate taken_at is a valid date
    const takenAtDate = new Date(taken_at);
    if (isNaN(takenAtDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid taken_at date format' },
        { status: 400 }
      );
    }

    // Prepare log entry
    const logEntry = {
      user_id: user.id,
      units,
      insulin_type,
      taken_at: takenAtDate.toISOString(),
      insulin_name: body.insulin_name || null,
      delivery_type: body.delivery_type || 'bolus',
      meal_relation: body.meal_relation || null,
      injection_site: body.injection_site || null,
      blood_glucose_before: body.blood_glucose_before || null,
      blood_glucose_after: body.blood_glucose_after || null,
      notes: body.notes || null,
      mood: body.mood || null,
      activity_level: body.activity_level || null,
      logged_via: 'api'
    };

    // Insert into database
    const { data: newLog, error } = await supabase
      .from('insulin_logs')
      .insert(logEntry)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create log entry' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Insulin log created successfully',
      data: newLog
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}