import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// Debug endpoint to check favorites schema
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const debug: any = {
      userId: user.id,
      tables: {},
      queries: {}
    };

    // Check if favorite_foods table exists and get its structure
    try {
      const { data: favoritesTest, error: favoritesError } = await supabase
        .from('favorite_foods')
        .select('*')
        .limit(1);
      
      debug.tables.favorite_foods = {
        exists: !favoritesError,
        error: favoritesError?.message,
        sampleData: favoritesTest
      };
    } catch (error: any) {
      debug.tables.favorite_foods = {
        exists: false,
        error: error.message
      };
    }

    // Check if food_items table exists and has expected fields
    try {
      const { data: foodItemsTest, error: foodItemsError } = await supabase
        .from('food_items')
        .select('id, product_name, name, brand, energy_kcal, is_custom, created_by_user_id')
        .limit(1);
      
      debug.tables.food_items = {
        exists: !foodItemsError,
        error: foodItemsError?.message,
        sampleData: foodItemsTest
      };
    } catch (error: any) {
      debug.tables.food_items = {
        exists: false,
        error: error.message
      };
    }

    // Test the exact query that's failing
    try {
      const { data: joinTest, error: joinError } = await supabase
        .from('favorite_foods')
        .select(`
          id,
          nickname,
          default_serving_size,
          default_serving_unit,
          created_at,
          food_items (
            id,
            product_name,
            brand,
            image_url,
            energy_kcal,
            carbohydrates_g,
            proteins_g,
            fat_g,
            serving_size,
            serving_unit,
            is_custom,
            created_by_user_id
          )
        `)
        .eq('user_id', user.id)
        .limit(1);
      
      debug.queries.joinQuery = {
        success: !joinError,
        error: joinError?.message,
        data: joinTest
      };
    } catch (error: any) {
      debug.queries.joinQuery = {
        success: false,
        error: error.message
      };
    }

    return NextResponse.json({ debug });
  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error.message },
      { status: 500 }
    );
  }
}