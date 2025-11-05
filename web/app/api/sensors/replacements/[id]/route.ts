import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const userId = request.headers.get('x-user-id') || 'demo-user';
    const { id } = await params;

    const {
      status,
      deliveredAt,
      expectedDelivery,
      notes
    } = body;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (deliveredAt) updateData.delivered_at = deliveredAt;
    if (expectedDelivery) updateData.expected_delivery = expectedDelivery;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('sensor_replacements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating replacement:', error);
      return NextResponse.json(
        { error: 'Failed to update replacement tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Replacement tracking updated successfully',
      replacement: data
    });

  } catch (error) {
    console.error('Error in replacement PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}