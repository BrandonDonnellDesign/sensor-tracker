import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const demo = searchParams.get('demo');
    const userId = request.headers.get('x-user-id');

    let query = supabase
      .from('replacement_tracking')
      .select('*')
      .order('created_at', { ascending: false });

    // Only filter by user_id if we have a valid one and not in demo mode
    if (userId && !demo) {
      query = query.eq('user_id', userId);
    }

    // Limit results for demo mode
    if (demo) {
      query = query.limit(20);
    }

    const { data: replacements, error } = await query;

    if (error) {
      console.error('Error fetching replacements:', error);
      return NextResponse.json({ error: 'Failed to fetch replacements' }, { status: 500 });
    }

    return NextResponse.json({ replacements });
  } catch (error) {
    console.error('Error in replacement tracking GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use a demo user ID for development - in production this would come from auth
    const userId = request.headers.get('x-user-id') || '00000000-0000-0000-0000-000000000000';

    const body = await request.json();
    const {
      sensor_serial_number,
      sensor_lot_number,
      warranty_claim_number,
      carrier,
      tracking_number,
      expected_delivery,
      notes
    } = body;

    if (!sensor_serial_number || !carrier || !tracking_number) {
      return NextResponse.json({ 
        error: 'Missing required fields: sensor_serial_number, carrier, tracking_number' 
      }, { status: 400 });
    }

    const { data: replacement, error } = await supabase
      .from('replacement_tracking')
      .insert({
        user_id: userId,
        sensor_serial_number,
        sensor_lot_number,
        warranty_claim_number,
        carrier,
        tracking_number,
        expected_delivery,
        notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating replacement:', error);
      return NextResponse.json({ error: 'Failed to create replacement' }, { status: 500 });
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error('Error in replacement tracking POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}