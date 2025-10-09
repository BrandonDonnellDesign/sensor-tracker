import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const adminClient = createAdminClient();

    // Use type assertion to bypass TypeScript issues with sensor_models table
    const { data: sensorModels, error } = await (adminClient as any)
      .from('sensor_models')
      .select('*')
      .order('manufacturer', { ascending: true })
      .order('model_name', { ascending: true });

    if (error) {
      console.error('Error fetching sensor models:', error);
      return NextResponse.json({ error: 'Failed to fetch sensor models' }, { status: 500 });
    }

    return NextResponse.json({ sensorModels: sensorModels || [] });
  } catch (error) {
    console.error('Admin sensor models API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    const body = await request.json();
    const { manufacturer, model_name, duration_days, is_active } = body;

    // Validate required fields
    if (!manufacturer || !model_name || !duration_days) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use type assertion to bypass TypeScript issues
    const { data: sensorModel, error } = await (adminClient as any)
      .from('sensor_models')
      .insert([{
        manufacturer,
        model_name,
        duration_days: parseInt(duration_days),
        is_active: is_active ?? true
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating sensor model:', error);
      return NextResponse.json({ error: 'Failed to create sensor model' }, { status: 500 });
    }

    return NextResponse.json({ sensorModel });
  } catch (error) {
    console.error('Admin sensor models POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    const body = await request.json();
    const { id, manufacturer, model_name, duration_days, is_active } = body;

    if (!id) {
      return NextResponse.json({ error: 'Sensor model ID is required' }, { status: 400 });
    }

    // Use type assertion to bypass TypeScript issues
    const { data: sensorModel, error } = await (adminClient as any)
      .from('sensor_models')
      .update({
        manufacturer,
        model_name,
        duration_days: duration_days ? parseInt(duration_days) : undefined,
        is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating sensor model:', error);
      return NextResponse.json({ error: 'Failed to update sensor model' }, { status: 500 });
    }

    return NextResponse.json({ sensorModel });
  } catch (error) {
    console.error('Admin sensor models PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminClient = createAdminClient();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Sensor model ID is required' }, { status: 400 });
    }

    // Check if sensor model is in use
    const { data: sensorsUsingModel, error: checkError } = await adminClient
      .from('sensors')
      .select('id')
      .eq('sensor_model_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking sensor model usage:', checkError);
      return NextResponse.json({ error: 'Failed to check sensor model usage' }, { status: 500 });
    }

    if (sensorsUsingModel && sensorsUsingModel.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete sensor model that is in use by existing sensors' 
      }, { status: 400 });
    }

    // Use type assertion to bypass TypeScript issues
    const { error } = await (adminClient as any)
      .from('sensor_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting sensor model:', error);
      return NextResponse.json({ error: 'Failed to delete sensor model' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin sensor models DELETE API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}