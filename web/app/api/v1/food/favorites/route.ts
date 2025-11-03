import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/food/favorites:
 *   get:
 *     tags: [Food Logging]
 *     summary: Get user's favorite foods
 *     description: Retrieve list of user's favorite food items for quick logging
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of favorites to return
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search within favorite foods
 *     responses:
 *       200:
 *         description: Favorite foods retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       food_item:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           brand:
 *                             type: string
 *                           serving_size:
 *                             type: number
 *                           serving_unit:
 *                             type: string
 *                           calories_per_100g:
 *                             type: number
 *                           carbs_per_100g:
 *                             type: number
 *                           protein_per_100g:
 *                             type: number
 *                           fat_per_100g:
 *                             type: number
 *                       favorite_name:
 *                         type: string
 *                         description: Custom name for this favorite
 *                       default_quantity:
 *                         type: number
 *                         description: User's preferred serving size
 *                       usage_count:
 *                         type: integer
 *                         description: How many times this favorite has been used
 *                       last_used:
 *                         type: string
 *                         format: date-time
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Authentication required
 *   post:
 *     tags: [Food Logging]
 *     summary: Add food to favorites
 *     description: Add a food item to user's favorites list
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - food_item_id
 *             properties:
 *               food_item_id:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the food item to favorite
 *               favorite_name:
 *                 type: string
 *                 description: Custom name for this favorite (optional)
 *               default_quantity:
 *                 type: number
 *                 description: Default serving size for quick logging
 *                 default: 100
 *     responses:
 *       201:
 *         description: Food added to favorites successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     food_item_id:
 *                       type: string
 *                       format: uuid
 *                     favorite_name:
 *                       type: string
 *                     default_quantity:
 *                       type: number
 *       400:
 *         description: Invalid request or food item not found
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Food item already in favorites
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const search = searchParams.get('search');
    const userId = authResult.userId || 'anonymous';

    const supabase = await createClient();

    let query = supabase
      .from('food_favorites')
      .select(`
        id,
        favorite_name,
        default_quantity,
        usage_count,
        last_used,
        created_at,
        food_items (
          id,
          name,
          brand,
          serving_size,
          serving_unit,
          calories_per_100g,
          carbs_per_100g,
          protein_per_100g,
          fat_per_100g,
          fiber_per_100g,
          sugar_per_100g
        )
      `)
      .eq('user_id', userId)
      .order('usage_count', { ascending: false })
      .order('last_used', { ascending: false })
      .limit(limit);

    // Add search filter if provided
    if (search) {
      query = query.or(`favorite_name.ilike.%${search}%,food_items.name.ilike.%${search}%`);
    }

    const { data: favorites, error } = await query;

    if (error) {
      console.error('Error fetching favorites:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: favorites || []
    });

  } catch (error) {
    console.error('Error in get favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status || 401 }
      );
    }

    const { food_item_id, favorite_name, default_quantity = 100 } = await request.json();
    const userId = authResult.userId || 'anonymous';

    // Validate required fields
    if (!food_item_id) {
      return NextResponse.json(
        { error: 'food_item_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if food item exists
    const { data: foodItem, error: foodError } = await supabase
      .from('food_items')
      .select('id, name')
      .eq('id', food_item_id)
      .single();

    if (foodError || !foodItem) {
      return NextResponse.json(
        { error: 'Food item not found' },
        { status: 400 }
      );
    }

    // Check if already in favorites
    const { data: existingFavorite } = await supabase
      .from('food_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('food_item_id', food_item_id)
      .single();

    if (existingFavorite) {
      return NextResponse.json(
        { error: 'Food item is already in your favorites' },
        { status: 409 }
      );
    }

    // Add to favorites
    const { data: newFavorite, error: insertError } = await supabase
      .from('food_favorites')
      .insert({
        user_id: userId,
        food_item_id,
        favorite_name: favorite_name || foodItem.name,
        default_quantity,
        usage_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error adding favorite:', insertError);
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Food added to favorites successfully',
      data: newFavorite
    }, { status: 201 });

  } catch (error) {
    console.error('Error in add favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
