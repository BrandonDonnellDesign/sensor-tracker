import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/logs/[logId] - Get a specific food log
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { logId } = await params;

    const { data: log, error } = await supabase
      .from('food_logs_with_cgm')
      .select('*')
      .eq('id', logId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Food log not found' }, { status: 404 });
      }
      console.error('Error fetching food log:', error);
      return NextResponse.json(
        { error: 'Failed to fetch food log', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error in food log GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/food/logs/[logId] - Update a specific food log
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { logId } = await params;
    const body = await request.json();

    const {
      serving_size,
      serving_unit,
      user_serving_size,
      user_serving_unit,
      total_calories,
      total_carbs_g,
      total_protein_g,
      total_fat_g,
      meal_type,
      notes,
      logged_at
    } = body;

    const updateData: any = {};
    
    // Only update provided fields
    if (serving_size !== undefined) updateData.serving_size = serving_size;
    if (serving_unit !== undefined) updateData.serving_unit = serving_unit;
    if (user_serving_size !== undefined) updateData.user_serving_size = user_serving_size;
    if (user_serving_unit !== undefined) updateData.user_serving_unit = user_serving_unit;
    if (total_calories !== undefined) updateData.total_calories = total_calories;
    if (total_carbs_g !== undefined) updateData.total_carbs_g = total_carbs_g;
    if (total_protein_g !== undefined) updateData.total_protein_g = total_protein_g;
    if (total_fat_g !== undefined) updateData.total_fat_g = total_fat_g;
    if (meal_type !== undefined) updateData.meal_type = meal_type;
    if (notes !== undefined) updateData.notes = notes;
    if (logged_at !== undefined) updateData.logged_at = logged_at;

    const { data: log, error } = await supabase
      .from('food_logs')
      .update(updateData)
      .eq('id', logId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating food log:', error);
      return NextResponse.json(
        { error: 'Failed to update food log', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Error in food log PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/food/logs/[logId] - Delete a specific food log
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { logId } = await params;

    const { error } = await supabase
      .from('food_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting food log:', error);
      return NextResponse.json(
        { error: 'Failed to delete food log', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Food log deleted successfully' });
  } catch (error) {
    console.error('Error in food log DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}