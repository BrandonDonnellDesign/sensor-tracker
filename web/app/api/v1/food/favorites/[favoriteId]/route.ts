import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { apiAuthMiddleware } from '@/lib/middleware/api-auth-middleware';

/**
 * @swagger
 * /api/v1/food/favorites/{favoriteId}:
 *   get:
 *     tags: [Food Logging]
 *     summary: Get specific favorite food
 *     description: Retrieve details of a specific favorite food item
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The favorite ID
 *     responses:
 *       200:
 *         description: Favorite food retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     food_item:
 *                       type: object
 *                     favorite_name:
 *                       type: string
 *                     default_quantity:
 *                       type: number
 *                     usage_count:
 *                       type: integer
 *                     last_used:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Favorite not found
 *       401:
 *         description: Authentication required
 *   put:
 *     tags: [Food Logging]
 *     summary: Update favorite food
 *     description: Update favorite food settings
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The favorite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               favorite_name:
 *                 type: string
 *                 description: Custom name for this favorite
 *               default_quantity:
 *                 type: number
 *                 description: Default serving size
 *     responses:
 *       200:
 *         description: Favorite updated successfully
 *       404:
 *         description: Favorite not found
 *       401:
 *         description: Authentication required
 *   delete:
 *     tags: [Food Logging]
 *     summary: Remove food from favorites
 *     description: Remove a food item from user's favorites list
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The favorite ID to remove
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Favorite not found
 *       401:
 *         description: Authentication required
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { favoriteId } = await params;
    const supabase = await createClient();

    const { data: favorite, error } = await supabase
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
          sugar_per_100g,
          sodium_per_100g
        )
      `)
      .eq('id', favoriteId)
      .eq('user_id', authResult.userId)
      .single();

    if (error || !favorite) {
      return NextResponse.json(
        { error: 'Favorite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: favorite
    });

  } catch (error) {
    console.error('Error in get favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { favoriteId } = await params;
    const { favorite_name, default_quantity } = await request.json();

    const supabase = await createClient();

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (favorite_name !== undefined) {
      updateData.favorite_name = favorite_name;
    }

    if (default_quantity !== undefined) {
      if (typeof default_quantity !== 'number' || default_quantity <= 0) {
        return NextResponse.json(
          { error: 'default_quantity must be a positive number' },
          { status: 400 }
        );
      }
      updateData.default_quantity = default_quantity;
    }

    const { data: updatedFavorite, error } = await supabase
      .from('food_favorites')
      .update(updateData)
      .eq('id', favoriteId)
      .eq('user_id', authResult.userId)
      .select()
      .single();

    if (error || !updatedFavorite) {
      return NextResponse.json(
        { error: 'Favorite not found or failed to update' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite updated successfully',
      data: updatedFavorite
    });

  } catch (error) {
    console.error('Error in update favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    // Authenticate request
    const authResult = await apiAuthMiddleware(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { favoriteId } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('food_favorites')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', authResult.userId);

    if (error) {
      return NextResponse.json(
        { error: 'Favorite not found or failed to remove' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Favorite removed successfully'
    });

  } catch (error) {
    console.error('Error in delete favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/food/favorites/{favoriteId}/use:
 *   post:
 *     tags: [Food Logging]
 *     summary: Log favorite food usage
 *     description: Increment usage count and update last used timestamp when favorite is used for logging
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The favorite ID
 *     responses:
 *       200:
 *         description: Usage recorded successfully
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
 *                     usage_count:
 *                       type: integer
 *                     last_used:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: Favorite not found
 *       401:
 *         description: Authentication required
 */