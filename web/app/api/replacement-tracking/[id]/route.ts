import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 });
    }

    // Get the replacement record first to check sensor info
    const { data: replacement, error: fetchError } = await (supabase as any)
      .from('sensor_replacements')
      .select('*, sensor_model_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError) throw fetchError;

    // Update the replacement status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // If marking as delivered, set delivered_at timestamp
    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString();
    }

    const { data, error } = await (supabase as any)
      .from('sensor_replacements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    // If marking as delivered, increment inventory
    if (status === 'delivered' && replacement.sensor_model_id) {
      try {
        // Check if inventory exists for this sensor model
        const { data: existingInventory } = await (supabase as any)
          .from('sensor_inventory')
          .select('id, quantity')
          .eq('user_id', user.id)
          .eq('sensor_model_id', replacement.sensor_model_id)
          .single();

        if (existingInventory) {
          // Update existing inventory - increment by 1
          await (supabase as any)
            .from('sensor_inventory')
            .update({
              quantity: existingInventory.quantity + 1,
              last_updated: new Date().toISOString()
            })
            .eq('id', existingInventory.id);
        } else {
          // Create new inventory record with quantity 1
          await (supabase as any)
            .from('sensor_inventory')
            .insert({
              user_id: user.id,
              sensor_model_id: replacement.sensor_model_id,
              quantity: 1,
              location: 'Replacement delivery',
              notes: `Added from replacement tracking: ${replacement.tracking_number}`
            });
        }
      } catch (inventoryError) {
        console.error('Error updating inventory:', inventoryError);
        // Don't fail the whole request if inventory update fails
      }
    }

    return NextResponse.json({
      success: true,
      replacement: data
    });

  } catch (error) {
    console.error('Error updating replacement:', error);
    return NextResponse.json(
      { error: 'Failed to update replacement' },
      { status: 500 }
    );
  }
}
