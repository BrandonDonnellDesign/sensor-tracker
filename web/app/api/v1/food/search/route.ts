import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication and rate limit
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    let queryBuilder = supabase
      .from('food_items')
      .select(`
        id,
        product_name,
        brand,
        barcode,
        energy_kcal,
        carbohydrates_g,
        proteins_g,
        fat_g,
        fiber_g,
        sugars_g,
        sodium_mg,
        serving_size,
        serving_unit,
        image_url,
        created_at
      `)
      .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(limit)
      .order('product_name', { ascending: true });

    const { data: foods, error } = await queryBuilder;

    if (error) {
      console.error('Error searching foods:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to search foods' },
        { status: 500 }
      );
    }

    // Format the response
    const formattedFoods = (foods || []).map(food => ({
      id: food.id,
      name: food.product_name,
      brand: food.brand,
      barcode: food.barcode,
      nutrition: {
        calories: food.energy_kcal || 0,
        carbs: food.carbohydrates_g || 0,
        protein: food.proteins_g || 0,
        fat: food.fat_g || 0,
        fiber: food.fiber_g || 0,
        sugar: food.sugars_g || 0,
        sodium: food.sodium_mg || 0
      },
      serving: {
        size: food.serving_size || 100,
        unit: food.serving_unit || 'g'
      },
      imageUrl: food.image_url,
      isCustom: false, // Will be updated when custom food migration runs
      isOwnCustom: false,
      createdAt: food.created_at
    }));

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: formattedFoods,
      query: query.trim(),
      pagination: {
        limit,
        total: formattedFoods.length,
        hasMore: formattedFoods.length === limit
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in food search API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
