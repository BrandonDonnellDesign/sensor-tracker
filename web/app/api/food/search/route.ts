import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { searchProducts } from '@/lib/openfoodfacts';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    // const pageSize = parseInt(searchParams.get('pageSize') || '20'); // For future pagination

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Search local database (cached results + user's logged foods)
    const { data: localResults } = await supabase
      .from('food_items')
      .select('*')
      .or(`product_name.ilike.%${query}%,brand.ilike.%${query}%`)
      .limit(20);

    // Convert local results to FoodItem format
    const formattedLocalResults = (localResults || []).map((item: any) => ({
      id: item.id,
      name: item.product_name,
      brand: item.brand,
      barcode: item.barcode,
      calories: item.energy_kcal || 0,
      protein: item.proteins_g || 0,
      carbs: item.carbohydrates_g || 0,
      fat: item.fat_g || 0,
      fiber: item.fiber_g,
      sugar: item.sugars_g,
      sodium: item.sodium_mg,
      servingSize: item.serving_size,
      servingUnit: item.serving_unit,
      imageUrl: item.image_url,
    }));

    // If we have enough local results, return them
    if (formattedLocalResults.length >= 10) {
      return NextResponse.json({
        local: formattedLocalResults,
        remote: [],
        total: formattedLocalResults.length,
        page: page,
        source: 'cache',
      });
    }

    // Otherwise, fetch from OpenFoodFacts API
    const offResults = await searchProducts(query);

    // Cache the OpenFoodFacts results in background (don't wait)
    if (offResults.length > 0) {
      cacheOpenFoodFactsResults(offResults).catch(err => 
        console.error('Error caching results:', err)
      );
    }

    return NextResponse.json({
      local: formattedLocalResults,
      remote: offResults,
      total: formattedLocalResults.length + offResults.length,
      page: page,
      source: formattedLocalResults.length > 0 ? 'hybrid' : 'openfoodfacts',
    });
  } catch (error) {
    console.error('Error in food search:', error);
    return NextResponse.json(
      { error: 'Failed to search foods' },
      { status: 500 }
    );
  }
}

// Cache OpenFoodFacts results to database
async function cacheOpenFoodFactsResults(results: any[]) {
  for (const item of results) {
    try {
      // Check if already exists
      if (item.barcode) {
        const { data: existing } = await supabase
          .from('food_items')
          .select('id')
          .eq('barcode', item.barcode)
          .maybeSingle();

        if (existing) continue; // Already cached
      }

      // Insert into cache
      await supabase
        .from('food_items')
        .insert({
          barcode: item.barcode,
          product_name: item.name,
          brand: item.brand,
          image_url: item.imageUrl,
          serving_size: item.servingSize,
          serving_unit: item.servingUnit,
          energy_kcal: item.calories,
          carbohydrates_g: item.carbs,
          sugars_g: item.sugar,
          fiber_g: item.fiber,
          proteins_g: item.protein,
          fat_g: item.fat,
          sodium_mg: item.sodium,
          off_id: item.id,
          data_quality_score: 1.0, // Mark as API result
        });
    } catch (error) {
      // Ignore cache errors, continue with next item
      console.warn('Failed to cache item:', item.name, error);
    }
  }
}
