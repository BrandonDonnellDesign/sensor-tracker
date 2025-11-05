import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const { data, error } = await supabase
      .from('sensor_replacements')
      .select(`
        *,
        sensors (
          id,
          serial_number,
          lot_number,
          sensor_models (
            manufacturer,
            model_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching replacements:', error);
      return NextResponse.json(
        { error: 'Failed to fetch replacement tracking' },
        { status: 500 }
      );
    }

    // Transform data for frontend
    const replacements = data?.map(replacement => ({
      id: replacement.id,
      originalSensorId: replacement.original_sensor_id,
      originalSensor: replacement.sensors ? {
        serial_number: replacement.sensors.serial_number,
        lot_number: replacement.sensors.lot_number,
        sensor_model: replacement.sensors.sensor_models ? {
          manufacturer: replacement.sensors.sensor_models.manufacturer,
          model_name: replacement.sensors.sensor_models.model_name
        } : undefined
      } : undefined,
      carrier: replacement.carrier,
      trackingNumber: replacement.tracking_number,
      claimNumber: replacement.claim_number,
      expectedDelivery: replacement.expected_delivery ? new Date(replacement.expected_delivery) : undefined,
      status: replacement.status,
      notes: replacement.notes,
      createdAt: new Date(replacement.created_at),
      deliveredAt: replacement.delivered_at ? new Date(replacement.delivered_at) : undefined
    })) || [];

    return NextResponse.json({ replacements });

  } catch (error) {
    console.error('Error in replacements GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'demo-user';

    const {
      originalSensorId,
      carrier,
      trackingNumber,
      claimNumber,
      expectedDelivery,
      notes
    } = body;

    // Validate required fields
    if (!originalSensorId || !carrier || !trackingNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('sensor_replacements')
      .insert({
        user_id: userId,
        original_sensor_id: originalSensorId,
        carrier: carrier,
        tracking_number: trackingNumber,
        claim_number: claimNumber,
        expected_delivery: expectedDelivery,
        status: 'shipped',
        notes: notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating replacement tracking:', error);
      return NextResponse.json(
        { error: 'Failed to create replacement tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Replacement tracking created successfully',
      replacement: data
    });

  } catch (error) {
    console.error('Error in replacements POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}