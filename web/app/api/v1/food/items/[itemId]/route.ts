import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const startTime = Date.now();
  
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const supabase = await createClient();
    
    const { data: item, error } = await supabase
      .from('food_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error || !item) {
      return NextResponse.json(
        { error: 'not_found', message: 'Food item not found' },
        { status: 404 }
      );
    }

    // Check access: public items or user's own items
    if (item.is_custom && !item.is_public && item.created_by_user_id !== authResult.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Access denied' },
        { status: 403 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: item,
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in food item GET:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const startTime = Date.now();
  
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const body = await request.json();
    const supabase = await createClient();
    
    // Check ownership
    const { data: existing } = await supabase
      .from('food_items')
      .select('created_by_user_id, is_custom')
      .eq('id', itemId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Food item not found' },
        { status: 404 }
      );
    }

    if (!existing.is_custom || existing.created_by_user_id !== authResult.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Can only update your own custom foods' },
        { status: 403 }
      );
    }

    const { data: item, error } = await supabase
      .from('food_items')
      .update({
        name: body.name,
        brand: body.brand || null,
        barcode: body.barcode || null,
        serving_size: body.serving_size,
        serving_unit: body.serving_unit,
        calories: body.calories,
        carbs_g: body.carbs_g,
        protein_g: body.protein_g,
        fat_g: body.fat_g,
        fiber_g: body.fiber_g || null,
        sugar_g: body.sugar_g || null,
        sodium_mg: body.sodium_mg || null,
        is_public: body.is_public || false
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) {
      console.error('Error updating food item:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to update food item' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: item,
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in food item PUT:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { itemId } = await params;
    const supabase = await createClient();
    
    // Check ownership
    const { data: existing } = await supabase
      .from('food_items')
      .select('created_by_user_id, is_custom')
      .eq('id', itemId)
      .single();

    if (!existing) {
      return NextResponse.json(
        { error: 'not_found', message: 'Food item not found' },
        { status: 404 }
      );
    }

    if (!existing.is_custom || existing.created_by_user_id !== authResult.userId) {
      return NextResponse.json(
        { error: 'forbidden', message: 'Can only delete your own custom foods' },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting food item:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to delete food item' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Food item deleted successfully'
    });

  } catch (error) {
    console.error('Error in food item DELETE:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
