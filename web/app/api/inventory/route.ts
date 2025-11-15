import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get inventory
    const { data: inventory, error: inventoryError } = await (supabase as any)
      .from('sensor_inventory')
      .select('*')
      .eq('user_id', user.id)
      .order('last_updated', { ascending: false });

    if (inventoryError) throw inventoryError;
    
    // Get sensor models separately
    const modelIds = inventory?.map((i: any) => i.sensor_model_id).filter(Boolean) || [];
    const { data: models } = await supabase
      .from('sensor_models')
      .select('*')
      .in('id', modelIds);
    
    // Attach models to inventory
    const inventoryWithModels = inventory?.map((item: any) => ({
      ...item,
      sensorModel: models?.find(m => m.id === item.sensor_model_id)
    }));

    // Calculate usage statistics
    const { data: sensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('date_added, sensor_model_id')
      .eq('user_id', user.id)
      .gte('date_added', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
      .order('date_added', { ascending: false });

    if (sensorsError) throw sensorsError;

    // Calculate usage rate (sensors per month)
    const usageRate = sensors.length > 0 ? (sensors.length / 3) : 0; // 3 months of data

    // Calculate total quantity
    const totalQuantity = inventoryWithModels?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

    // Calculate days until empty based on sensor duration
    // For each sensor model, calculate how many days that quantity will last
    let totalDaysOfSupply = 0;
    inventoryWithModels?.forEach((item: any) => {
      const sensorDuration = item.sensorModel?.duration_days || 10; // Default to 10 days
      totalDaysOfSupply += item.quantity * sensorDuration;
    });

    const daysUntilEmpty = totalDaysOfSupply;

    // Calculate recommended reorder date (when you'll have 2 sensors left)
    // Assume average sensor duration for calculation
    const avgSensorDuration = inventoryWithModels && inventoryWithModels.length > 0
      ? inventoryWithModels.reduce((sum: number, item: any) => sum + (item.sensorModel?.duration_days || 10), 0) / inventoryWithModels.length
      : 10;
    
    const daysUntilReorder = Math.max(0, totalDaysOfSupply - (2 * avgSensorDuration));
    const recommendedReorderDate = new Date(Date.now() + daysUntilReorder * 24 * 60 * 60 * 1000);

    const stats = {
      totalQuantity,
      usageRate: Math.round(usageRate * 10) / 10,
      daysUntilEmpty: Math.round(daysUntilEmpty),
      recommendedReorderDate: recommendedReorderDate.toISOString(),
      lowStock: totalQuantity <= 2,
      byModel: inventoryWithModels?.map((item: any) => {
        const sensorDuration = item.sensorModel?.duration_days || 10;
        const daysOfSupply = item.quantity * sensorDuration;
        return {
          modelId: item.sensor_model_id,
          modelName: item.sensorModel?.model_name || 'Unknown',
          quantity: item.quantity,
          daysOfSupply,
          sensorDuration
        };
      }) || []
    };

    return NextResponse.json({
      success: true,
      inventory: inventoryWithModels || [],
      stats
    });

  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
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
    const { sensor_model_id, quantity, location, notes } = body;

    if (!sensor_model_id || quantity === undefined) {
      return NextResponse.json(
        { error: 'sensor_model_id and quantity are required' },
        { status: 400 }
      );
    }

    // Check if inventory already exists for this model
    const { data: existing } = await (supabase as any)
      .from('sensor_inventory')
      .select('id, quantity')
      .eq('user_id', user.id)
      .eq('sensor_model_id', sensor_model_id)
      .single();

    let result;
    if (existing) {
      // Update existing inventory
      const { data, error } = await (supabase as any)
        .from('sensor_inventory')
        .update({
          quantity: existing.quantity + quantity,
          location,
          notes,
          last_updated: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new inventory record
      const { data, error } = await (supabase as any)
        .from('sensor_inventory')
        .insert({
          user_id: user.id,
          sensor_model_id,
          quantity,
          location,
          notes
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return NextResponse.json({
      success: true,
      inventory: result
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, quantity, location, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: any = { last_updated: new Date().toISOString() };
    if (quantity !== undefined) updateData.quantity = quantity;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await (supabase as any)
      .from('sensor_inventory')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      inventory: data
    });

  } catch (error) {
    console.error('Error updating inventory:', error);
    return NextResponse.json(
      { error: 'Failed to update inventory' },
      { status: 500 }
    );
  }
}
