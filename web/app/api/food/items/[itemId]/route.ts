import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/items/[itemId] - Get a specific food item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;

    const { data: item, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Food item not found' }, { status: 404 });
      }
      console.error('Error fetching food item:', error);
      return NextResponse.json(
        { error: 'Failed to fetch food item', details: error.message },
        { status: 500 }
      );
    }

    // Check if user has access to this item (handle missing custom fields gracefully)
    const itemAny = item as any;
    const hasAccess = itemAny.is_public !== false || itemAny.created_by_user_id === user.id;
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error in food item GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/food/items/[itemId] - Update a custom food item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;
    const body = await request.json();

    // Check if user owns this item
    const { data: existingItem, error: fetchError } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: 'Food item not found' }, { status: 404 });
    }

    const existingItemAny = existingItem as any;
    if (existingItemAny.created_by_user_id !== user.id || existingItemAny.is_custom === false) {
      return NextResponse.json({ error: 'Can only update your own custom food items' }, { status: 403 });
    }

    const {
      product_name,
      brand,
      serving_size,
      serving_unit,
      energy_kcal,
      carbohydrates_g,
      proteins_g,
      fat_g,
      fiber_g,
      sugars_g,
      sodium_mg,
      image_url,
      is_public
    } = body;

    const updateData: any = {};
    
    // Only update provided fields
    if (product_name !== undefined) updateData.product_name = product_name;
    if (brand !== undefined) updateData.brand = brand;
    if (serving_size !== undefined) updateData.serving_size = serving_size;
    if (serving_unit !== undefined) updateData.serving_unit = serving_unit;
    if (energy_kcal !== undefined) updateData.energy_kcal = energy_kcal;
    if (carbohydrates_g !== undefined) updateData.carbohydrates_g = carbohydrates_g;
    if (proteins_g !== undefined) updateData.proteins_g = proteins_g;
    if (fat_g !== undefined) updateData.fat_g = fat_g;
    if (fiber_g !== undefined) updateData.fiber_g = fiber_g;
    if (sugars_g !== undefined) updateData.sugars_g = sugars_g;
    if (sodium_mg !== undefined) updateData.sodium_mg = sodium_mg;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_public !== undefined) updateData.is_public = is_public;

    const { data: item, error } = await supabase
      .from('food_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('created_by_user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating food item:', error);
      return NextResponse.json(
        { error: 'Failed to update food item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Error in food item PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/food/items/[itemId] - Delete a custom food item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = await params;

    // Check if user owns this item and it's custom
    const { data: existingItem, error: fetchError } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (fetchError || !existingItem) {
      return NextResponse.json({ error: 'Food item not found' }, { status: 404 });
    }

    const existingItemAny = existingItem as any;
    if (existingItemAny.created_by_user_id !== user.id || existingItemAny.is_custom === false) {
      return NextResponse.json({ error: 'Can only delete your own custom food items' }, { status: 403 });
    }

    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', itemId)
      .eq('created_by_user_id', user.id);

    if (error) {
      console.error('Error deleting food item:', error);
      return NextResponse.json(
        { error: 'Failed to delete food item', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Food item deleted successfully' });
  } catch (error) {
    console.error('Error in food item DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}