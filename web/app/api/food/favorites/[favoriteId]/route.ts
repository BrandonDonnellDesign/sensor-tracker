import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// DELETE /api/food/favorites/[favoriteId] - Remove a food from favorites
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { favoriteId } = await params;

    // Remove from favorites (only if owned by user)
    const { error } = await supabase
      .from('favorite_foods')
      .delete()
      .eq('id', favoriteId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { error: 'Failed to remove from favorites' },
      { status: 500 }
    );
  }
}

// PUT /api/food/favorites/[favoriteId] - Update favorite settings
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ favoriteId: string }> }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { favoriteId } = await params;
    const body = await request.json();
    const { nickname, defaultServingSize, defaultServingUnit } = body;

    // Update favorite settings (only if owned by user)
    const { data: favorite, error } = await supabase
      .from('favorite_foods')
      .update({
        nickname: nickname || null,
        default_serving_size: defaultServingSize || null,
        default_serving_unit: defaultServingUnit || null,
      })
      .eq('id', favoriteId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      message: 'Favorite updated',
      favorite: {
        id: favorite.id,
        nickname: favorite.nickname,
        defaultServingSize: favorite.default_serving_size,
        defaultServingUnit: favorite.default_serving_unit,
      }
    });
  } catch (error) {
    console.error('Error updating favorite:', error);
    return NextResponse.json(
      { error: 'Failed to update favorite' },
      { status: 500 }
    );
  }
}