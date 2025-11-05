import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const deliveryType = searchParams.get('delivery_type'); // 'bolus', 'basal', etc.

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    let query = supabase
      .from('insulin_logs')
      .select(`
        id,
        insulin_type,
        insulin_name,
        units,
        delivery_type,
        meal_relation,
        taken_at,
        injection_site,
        blood_glucose_before,
        blood_glucose_after,
        notes,
        mood,
        activity_level,
        logged_via
      `)
      .eq('user_id', user.id)
      .gte('taken_at', startDate.toISOString())
      .lte('taken_at', endDate.toISOString())
      .order('taken_at', { ascending: false });

    // Filter by delivery type if specified
    if (deliveryType) {
      query = query.eq('delivery_type', deliveryType);
    }

    const { data: logs, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching insulin logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs || [],
      total: logs?.length || 0,
      hasMore: (logs?.length || 0) === limit
    });

  } catch (error) {
    console.error('Insulin logs API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      insulin_type,
      insulin_name,
      units,
      delivery_type,
      meal_relation,
      taken_at,
      injection_site,
      blood_glucose_before,
      blood_glucose_after,
      notes,
      mood,
      activity_level
    } = body;

    // Validate required fields
    if (!units || !insulin_type) {
      return NextResponse.json(
        { error: 'Missing required fields: units and insulin_type' },
        { status: 400 }
      );
    }

    // Insert the insulin log
    const { data: log, error: insertError } = await supabase
      .from('insulin_logs')
      .insert({
        user_id: user.id,
        insulin_type,
        insulin_name: insulin_name || 'Insulin',
        units: parseFloat(units),
        delivery_type: delivery_type || 'bolus',
        meal_relation,
        taken_at: taken_at || new Date().toISOString(),
        injection_site,
        blood_glucose_before: blood_glucose_before ? parseFloat(blood_glucose_before) : null,
        blood_glucose_after: blood_glucose_after ? parseFloat(blood_glucose_after) : null,
        notes,
        mood,
        activity_level,
        logged_via: 'manual'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating insulin log:', insertError);
      return NextResponse.json(
        { error: 'Failed to create log entry' },
        { status: 500 }
      );
    }

    return NextResponse.json({ log }, { status: 201 });

  } catch (error) {
    console.error('Insulin logs POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}