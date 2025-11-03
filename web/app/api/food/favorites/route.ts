import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/food/favorites - Get user's favorite foods
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('Favorites API auth check:', { 
      hasUser: !!user, 
      userId: user?.id, 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('Authentication failed in favorites API:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try the join query first
    let favorites: any[] = [];
    let { data: favoritesData, error } = await supabase
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
          serving_unit
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Join query failed, trying fallback approach:', error);
      
      // Fallback: Get favorites and food items separately
      const { data: favoritesOnly, error: favError } = await supabase
        .from('favorite_foods')
        .select('id, nickname, default_serving_size, default_serving_unit, created_at, food_item_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (favError) {
        console.error('Fallback query also failed:', favError);
        return NextResponse.json(
          { 
            error: 'Database query failed', 
            details: favError.message,
            code: favError.code,
            hint: favError.hint 
          },
          { status: 500 }
        );
      }

      // Get food items for each favorite
      if (favoritesOnly && favoritesOnly.length > 0) {
        const foodItemIds = favoritesOnly.map(fav => fav.food_item_id);
        const { data: foodItems, error: foodError } = await supabase
          .from('food_items')
          .select('id, product_name, brand, image_url, energy_kcal, carbohydrates_g, proteins_g, fat_g, serving_size, serving_unit')
          .in('id', foodItemIds);

        if (foodError) {
          console.error('Food items query failed:', foodError);
          // Return favorites without food details
          favorites = favoritesOnly.map(fav => ({ ...fav, food_items: null }));
        } else {
          // Combine favorites with food items
          favorites = favoritesOnly.map(fav => {
            const foodItem = foodItems?.find(item => item.id === fav.food_item_id);
            return { ...fav, food_items: foodItem };
          });
        }
      } else {
        favorites = [];
      }
    } else {
      favorites = favoritesData || [];
    }

    // Format the response
    const formattedFavorites = (favorites || [])
      .filter((fav: any) => fav.food_items) // Filter out favorites with missing food items
      .map((fav: any) => ({
        favoriteId: fav.id,
        nickname: fav.nickname,
        defaultServingSize: fav.default_serving_size,
        defaultServingUnit: fav.default_serving_unit,
        createdAt: fav.created_at,
        food: {
          id: fav.food_items.id,
          name: fav.food_items.product_name || 'Unknown Food',
          brand: fav.food_items.brand,
          imageUrl: fav.food_items.image_url,
          calories: fav.food_items.energy_kcal || 0,
          carbs: fav.food_items.carbohydrates_g || 0,
          protein: fav.food_items.proteins_g || 0,
          fat: fav.food_items.fat_g || 0,
          servingSize: fav.food_items.serving_size || 100,
          servingUnit: fav.food_items.serving_unit || 'g',
          isCustom: false, // Default to false since custom fields don't exist yet
          isOwnCustom: false, // Default to false since custom fields don't exist yet
        }
      }));

    console.log('Favorites query result:', { 
      totalFavorites: favorites?.length || 0, 
      validFavorites: formattedFavorites.length,
      sampleFavorite: favorites?.[0] 
    });

    return NextResponse.json({ favorites: formattedFavorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

// POST /api/food/favorites - Add a food to favorites
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { foodItemId, nickname, defaultServingSize, defaultServingUnit } = body;

    if (!foodItemId) {
      return NextResponse.json(
        { error: 'Food item ID is required' },
        { status: 400 }
      );
    }

    // Check if already favorited
    const { data: existing } = await supabase
      .from('favorite_foods')
      .select('id')
      .eq('user_id', user.id)
      .eq('food_item_id', foodItemId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Food is already in favorites' },
        { status: 409 }
      );
    }

    // Add to favorites
    const { data: favorite, error } = await supabase
      .from('favorite_foods')
      .insert({
        user_id: user.id,
        food_item_id: foodItemId,
        nickname: nickname || null,
        default_serving_size: defaultServingSize || null,
        default_serving_unit: defaultServingUnit || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Added to favorites',
      favorite: {
        id: favorite.id,
        nickname: favorite.nickname,
        defaultServingSize: favorite.default_serving_size,
        defaultServingUnit: favorite.default_serving_unit,
      }
    });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { error: 'Failed to add to favorites' },
      { status: 500 }
    );
  }
}