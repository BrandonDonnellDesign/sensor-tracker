import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mealType = searchParams.get('meal_type');
    const favoritesOnly = searchParams.get('favorites') === 'true';

    let query = (supabase as any)
      .from('meal_templates')
      .select(`
        *,
        items:meal_template_items(*)
      `)
      .eq('user_id', user.id);

    if (mealType) {
      query = query.eq('meal_type', mealType);
    }

    if (favoritesOnly) {
      query = query.eq('is_favorite', true);
    }

    query = query.order('use_count', { ascending: false });

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      templates: data || []
    });

  } catch (error) {
    console.error('Error fetching meal templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meal templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, meal_type, items } = body;

    if (!name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'name and items are required' },
        { status: 400 }
      );
    }

    // Create template
    const { data: template, error: templateError } = await (supabase as any)
      .from('meal_templates')
      .insert({
        user_id: user.id,
        name,
        description,
        meal_type
      })
      .select()
      .single();

    if (templateError) throw templateError;

    // Add items
    const templateItems = items.map((item: any, index: number) => ({
      meal_template_id: template.id,
      ...item,
      sort_order: index
    }));

    const { error: itemsError } = await (supabase as any)
      .from('meal_template_items')
      .insert(templateItems);

    if (itemsError) throw itemsError;

    // Fetch complete template with items
    const { data: completeTemplate } = await (supabase as any)
      .from('meal_templates')
      .select(`
        *,
        items:meal_template_items(*)
      `)
      .eq('id', template.id)
      .single();

    return NextResponse.json({
      success: true,
      template: completeTemplate
    });

  } catch (error) {
    console.error('Error creating meal template:', error);
    return NextResponse.json(
      { error: 'Failed to create meal template' },
      { status: 500 }
    );
  }
}
