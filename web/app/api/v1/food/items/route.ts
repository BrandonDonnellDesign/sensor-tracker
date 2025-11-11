import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const includeCustom = searchParams.get('include_custom') !== 'false';

    const supabase = await createClient();
    
    let query = supabase
      .from('food_items')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true });

    // Filter by search term
    if (search) {
      query = query.or(`name.ilike.%${search}%,brand.ilike.%${search}%`);
    }

    // Filter custom foods
    if (!includeCustom) {
      query = query.eq('is_custom', false);
    } else {
      // Show user's custom foods and public foods
      query = query.or(`is_custom.eq.false,user_id.eq.${authResult.userId}`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: items, error, count } = await query;

    if (error) {
      console.error('Error fetching food items:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch food items' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: items || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasNext: (count || 0) > offset + limit,
        hasPrev: page > 1
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in food items API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      brand,
      barcode,
      serving_size = 100,
      serving_unit = 'g',
      calories,
      carbs_g,
      protein_g,
      fat_g,
      fiber_g,
      sugar_g,
      sodium_mg,
      is_public = false
    } = body;

    // Validate required fields
    if (!name || calories === undefined || carbs_g === undefined) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Name, calories, and carbs are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data: item, error } = await supabase
      .from('food_items')
      .insert({
        created_by_user_id: authResult.userId,
        product_name: name.trim(),
        brand: brand?.trim() || null,
        barcode: barcode || null,
        serving_size_g: serving_size,
        serving_unit,
        calories_per_serving: calories,
        carbohydrates_g: carbs_g,
        protein_g: protein_g || 0,
        fat_g: fat_g || 0,
        fiber_g: fiber_g || null,
        sugar_g: sugar_g || null,
        sodium_mg: sodium_mg || null,
        is_custom: true,
        is_public
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating food item:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to create food item' },
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
    }, { status: 201 });

  } catch (error) {
    console.error('Error in food items POST:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
