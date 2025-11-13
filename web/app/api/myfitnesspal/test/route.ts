import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get MyFitnessPal token
    const { data: tokenData, error: tokenError } = await (supabase as any)
      .from('myfitnesspal_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json({ 
        error: 'MyFitnessPal not connected',
        needsAuth: true 
      }, { status: 400 });
    }

    // Test API call - get today's diary
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`https://api.myfitnesspal.com/v2/diary/${today}`, {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token_encrypted}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ 
        error: 'API call failed',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'MyFitnessPal API connection successful',
      date: today,
      mealsFound: data.meals?.length || 0,
      totalFoods: data.meals?.reduce((sum: number, meal: any) => 
        sum + (meal.foods?.length || 0), 0) || 0,
      sampleData: {
        meals: data.meals?.map((meal: any) => ({
          name: meal.name,
          foodCount: meal.foods?.length || 0
        }))
      }
    });

  } catch (error) {
    console.error('MyFitnessPal test error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Test failed' 
    }, { status: 500 });
  }
}
