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
    const { id } = await params;
    // For demo purposes, don't strictly filter by user_id
    const userId = request.headers.get('x-user-id');

    const body = await request.json();
    const { status, delivered_at } = body;

    const updateData: any = { status };
    if (status === 'delivered' && !delivered_at) {
      updateData.delivered_at = new Date().toISOString();
    } else if (delivered_at) {
      updateData.delivered_at = delivered_at;
    }

    let query = supabase
      .from('replacement_tracking')
      .update(updateData)
      .eq('id', id);

    // Only filter by user_id if we have one
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: replacement, error } = await query
      .select()
      .single();

    if (error) {
      console.error('Error updating replacement:', error);
      return NextResponse.json({ error: 'Failed to update replacement' }, { status: 500 });
    }

    return NextResponse.json({ replacement });
  } catch (error) {
    console.error('Error in replacement tracking PATCH:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}