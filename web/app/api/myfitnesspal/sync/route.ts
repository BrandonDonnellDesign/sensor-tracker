import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get MyFitnessPal tokens
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

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token_encrypted;
    if (tokenData.token_expires_at && new Date(tokenData.token_expires_at) < new Date()) {
      const refreshResult = await refreshAccessToken(tokenData.refresh_token_encrypted, user.id, supabase);
      if (!refreshResult.success) {
        return NextResponse.json({ 
          error: 'Token refresh failed',
          needsAuth: true 
        }, { status: 401 });
      }
      accessToken = refreshResult.accessToken!;
    }

    // Get sync settings
    const { data: settings } = await (supabase as any)
      .from('myfitnesspal_sync_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const syncSettings = settings || {
      sync_food_logs: true,
      sync_water_intake: true,
      sync_exercise: false
    };

    // Determine date range (last 7 days or since last sync)
    const endDate = new Date();
    const startDate = new Date();
    if (settings?.last_sync_at) {
      startDate.setTime(new Date(settings.last_sync_at).getTime());
    } else {
      startDate.setDate(startDate.getDate() - 7);
    }

    let totalRecords = 0;
    let apiCalls = 0;
    const errors: string[] = [];

    // Sync food logs
    if (syncSettings.sync_food_logs) {
      try {
        const foodResult = await syncFoodLogs(accessToken, user.id, startDate, endDate, supabase);
        totalRecords += foodResult.records;
        apiCalls += foodResult.apiCalls;
        if (foodResult.error) errors.push(foodResult.error);
      } catch (error) {
        errors.push(`Food sync error: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }

    // Update last sync time
    await (supabase as any)
      .from('myfitnesspal_sync_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // Log sync
    await (supabase as any)
      .from('myfitnesspal_sync_log')
      .insert({
        user_id: user.id,
        sync_type: 'manual',
        operation: 'full_sync',
        status: errors.length > 0 ? 'partial' : 'success',
        records_processed: totalRecords,
        api_calls_made: apiCalls,
        error_message: errors.length > 0 ? errors.join('; ') : null,
        sync_completed_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      recordsSynced: totalRecords,
      apiCalls: apiCalls,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('MyFitnessPal sync error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed' 
    }, { status: 500 });
  }
}

async function refreshAccessToken(refreshToken: string, userId: string, supabase: any) {
  try {
    const response = await fetch('https://api.myfitnesspal.com/v2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.MYFITNESSPAL_CLIENT_ID!,
        client_secret: process.env.MYFITNESSPAL_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      return { success: false };
    }

    const tokenData = await response.json();

    await supabase
      .from('myfitnesspal_tokens')
      .update({
        access_token_encrypted: tokenData.access_token,
        refresh_token_encrypted: tokenData.refresh_token || refreshToken,
        token_expires_at: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    return { success: true, accessToken: tokenData.access_token };
  } catch (error) {
    console.error('Token refresh error:', error);
    return { success: false };
  }
}

async function syncFoodLogs(
  accessToken: string,
  userId: string,
  startDate: Date,
  endDate: Date,
  supabase: any
): Promise<{ records: number; apiCalls: number; error?: string }> {
  let records = 0;
  let apiCalls = 0;

  try {
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      const response = await fetch(`https://api.myfitnesspal.com/v2/diary/${dateStr}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      apiCalls++;

      if (!response.ok) {
        if (response.status === 401) {
          return { records, apiCalls, error: 'Authentication failed' };
        }
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const data = await response.json();
      
      // Process meals
      if (data.meals) {
        for (const meal of data.meals) {
          if (meal.foods) {
            for (const food of meal.foods) {
              // Insert into food_logs table
              const { error: insertError } = await supabase
                .from('food_logs')
                .upsert({
                  user_id: userId,
                  food_name: food.name,
                  calories: food.calories || 0,
                  carbs: food.carbohydrates || 0,
                  protein: food.protein || 0,
                  fat: food.fat || 0,
                  serving_size: food.serving_size || '',
                  servings: food.servings || 1,
                  meal_type: meal.name?.toLowerCase() || 'snack',
                  logged_at: new Date(`${dateStr}T${meal.time || '12:00:00'}`).toISOString(),
                  source: 'myfitnesspal',
                  external_id: `mfp_${dateStr}_${food.id || food.name}`,
                }, {
                  onConflict: 'external_id'
                });

              if (!insertError) {
                records++;
              }
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return { records, apiCalls };
  } catch (error) {
    return { 
      records, 
      apiCalls, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
