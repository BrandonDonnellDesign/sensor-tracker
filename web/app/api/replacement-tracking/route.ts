import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: replacements, error } = await (supabase as any)
      .from('sensor_replacements')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      replacements: replacements || []
    });

  } catch (error) {
    console.error('Error fetching replacements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replacements' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    if (!sensor_serial_number || !tracking_number) {
      return NextResponse.json(
        { error: 'sensor_serial_number and tracking_number are required' },
        { status: 400 }
      );
    }

    const { data, error } = await (supabase as any)
      .from('sensor_replacements')
      .insert({
        user_id: user.id,
        sensor_serial_number,
        sensor_lot_number,
        warranty_claim_number,
        carrier,
        tracking_number,
        expected_delivery,
        status: 'shipped',
        notes
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      replacement: data
    });

  } catch (error) {
    console.error('Error creating replacement:', error);
    return NextResponse.json(
      { error: 'Failed to create replacement' },
      { status: 500 }
    );
  }
}
