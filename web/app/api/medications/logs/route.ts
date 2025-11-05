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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    // Only use insulin_logs table now
    const { data: logs, error } = await supabase
      .from('insulin_logs')
      .select(`
        id,
        insulin_type,
        insulin_name,
        units,
        delivery_type,
        taken_at,
        injection_site,
        notes
      `)
      .eq('user_id', user.id)
      .gte('taken_at', startDate.toISOString())
      .lte('taken_at', endDate.toISOString())
      .order('taken_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching insulin logs:', error);
      return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
    }

    // Transform to match expected format for UI compatibility
    const transformedLogs = logs?.map(log => ({
      id: log.id,
      dosage_amount: log.units,
      dosage_unit: 'units',
      taken_at: log.taken_at,
      injection_site: log.injection_site,
      notes: log.notes,
      user_medication: {
        custom_name: log.insulin_name,
        brand_name: log.insulin_name,
        medication_type: {
          name: `${log.insulin_type.charAt(0).toUpperCase() + log.insulin_type.slice(1)}-Acting Insulin`,
          category: 'insulin'
        }
      }
    })) || [];

    return NextResponse.json({
      logs: transformedLogs,
      total: transformedLogs.length,
      hasMore: transformedLogs.length === limit
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
      taken_at,
      injection_site,
      notes,
      blood_glucose_before,
      blood_glucose_after,
      meal_relation,
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

    // Insert the insulin log directly
    const { data: log, error: insertError } = await supabase
      .from('insulin_logs')
      .insert({
        user_id: user.id,
        insulin_type,
        insulin_name: insulin_name || 'Insulin',
        units: parseFloat(units),
        delivery_type: delivery_type || 'bolus',
        taken_at: taken_at || new Date().toISOString(),
        injection_site,
        notes,
        blood_glucose_before: blood_glucose_before ? parseFloat(blood_glucose_before) : null,
        blood_glucose_after: blood_glucose_after ? parseFloat(blood_glucose_after) : null,
        meal_relation,
        mood,
        activity_level,
        logged_via: 'manual'
      })
      .select(`
        id,
        insulin_type,
        insulin_name,
        units,
        delivery_type,
        taken_at,
        injection_site,
        notes
      `)
      .single();

    if (insertError) {
      console.error('Error creating insulin log:', insertError);
      return NextResponse.json(
        { error: 'Failed to create log entry' },
        { status: 500 }
      );
    }

    // Transform to match expected format for UI compatibility
    const transformedLog = {
      id: log.id,
      dosage_amount: log.units,
      dosage_unit: 'units',
      taken_at: log.taken_at,
      injection_site: log.injection_site,
      notes: log.notes,
      user_medication: {
        custom_name: log.insulin_name,
        brand_name: log.insulin_name,
        medication_type: {
          name: `${log.insulin_type.charAt(0).toUpperCase() + log.insulin_type.slice(1)}-Acting Insulin`,
          category: 'insulin'
        }
      }
    };

    return NextResponse.json({ log: transformedLog }, { status: 201 });

  } catch (error) {
    console.error('Insulin logs POST API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}