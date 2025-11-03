import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/items - Get user's custom food items
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const includePublic = searchParams.get('include_public') === 'true';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('food_items')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user's custom foods or public foods (handle missing custom fields gracefully)
    if (includePublic) {
      // For now, just return all items since custom fields may not exist
      // This can be refined once the custom food migration is applied
      query = query;
    } else {
      // Try to filter by created_by_user_id if it exists, otherwise return empty
      query = query.eq('created_by_user_id', user.id);
    }

    // Add search filter
    if (search) {
      query = query.or(`product_name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching food items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch food items', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      items: items || [],
      pagination: {
        limit,
        offset,
        total: items?.length || 0
      }
    });
  } catch (error) {
    console.error('Error in food items API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/food/items - Create a new custom food item
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      product_name,
      brand,
      serving_size = 100,
      serving_unit = 'g',
      energy_kcal,
      carbohydrates_g,
      proteins_g,
      fat_g,
      fiber_g,
      sugars_g,
      sodium_mg,
      image_url,
      is_public = false
    } = body;

    if (!product_name) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      );
    }

    // Check if custom food columns exist by trying to query them
    let hasCustomColumns = false;
    try {
      await supabase
        .from('food_items')
        .select('created_by_user_id, is_custom, is_public')
        .limit(1);
      hasCustomColumns = true;
    } catch (columnError) {
      console.log('Custom columns not available yet, using basic insert');
    }

    // Prepare item data based on available columns
    const baseItemData = {
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
      image_url
    };

    const itemData = hasCustomColumns ? {
      ...baseItemData,
      created_by_user_id: user.id,
      is_custom: true,
      is_public
    } : baseItemData;

    const { data: item, error } = await supabase
      .from('food_items')
      .insert(itemData)
      .select()
      .single();

    if (error) {
      console.error('Error creating food item:', error);
      
      // Handle specific error cases
      if (error.message?.includes('created_by_user_id')) {
        return NextResponse.json(
          { 
            error: 'Custom food support not available yet. Please run database migrations first.',
            details: 'The created_by_user_id column is missing from the food_items table.'
          },
          { status: 500 }
        );
      }
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create food item';
      if (error.code === '23505') {
        errorMessage = 'A food item with this name already exists';
      } else if (error.code === '23503') {
        errorMessage = 'Invalid user reference';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return NextResponse.json(
        { error: errorMessage, details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('Error in food items POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}