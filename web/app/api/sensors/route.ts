import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const problematic = searchParams.get('problematic');
    const demo = searchParams.get('demo');
    const userId = request.headers.get('x-user-id');

    let query = supabase
      .from('sensors')
      .select(`
        id,
        serial_number,
        lot_number,
        date_added,
        is_problematic,
        issue_notes,
        sensor_models (
          manufacturer,
          model_name,
          duration_days
        )
      `)
      .eq('is_deleted', false)
      .order('date_added', { ascending: false });

    // Only filter by user_id if we have a valid one and not in demo mode
    if (userId && !demo) {
      query = query.eq('user_id', userId);
    }

    // Limit results for demo mode to prevent overwhelming response
    if (demo) {
      query = query.limit(10);
    }

    if (problematic === 'true') {
      query = query.eq('is_problematic', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sensors:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sensors' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sensors: data || [] });

  } catch (error) {
    console.error('Error in sensors GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}