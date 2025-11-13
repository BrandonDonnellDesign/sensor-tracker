import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get all users with active MyFitnessPal connections and auto-sync enabled
    const { data: users, error: usersError } = await supabase
      .from('myfitnesspal_tokens')
      .select(`
        user_id,
        access_token_encrypted,
        refresh_token_encrypted,
        token_expires_at,
        myfitnesspal_sync_settings!inner(
          auto_sync_enabled,
          sync_frequency_minutes,
          last_sync_at,
          sync_food_logs,
          sync_water_intake,
          sync_exercise
        )
      `)
      .eq('is_active', true)
      .eq('myfitnesspal_sync_settings.auto_sync_enabled', true);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ 
        message: 'No users with auto-sync enabled',
        synced: 0 
      });
    }

    let syncedUsers = 0;
    let totalRecords = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const settings = Array.isArray(user.myfitnesspal_sync_settings) 
          ? user.myfitnesspal_sync_settings[0] 
          : user.myfitnesspal_sync_settings;

        // Check if enough time has passed since last sync
        if (settings.last_sync_at) {
          const lastSync = new Date(settings.last_sync_at);
          const minutesSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60);
          
          if (minutesSinceSync < settings.sync_frequency_minutes) {
            continue; // Skip this user, not time yet
          }
        }

        // Check if token needs refresh
        let accessToken = user.access_token_encrypted;
        if (user.token_expires_at && new Date(user.token_expires_at) < new Date()) {
          const refreshResult = await refreshAccessToken(
            user.refresh_token_encrypted,
            user.user_id,
            supabase
          );
          
          if (!refreshResult.success) {
            errors.push(`User ${user.user_id}: Token refresh failed`);
            continue;
          }
          accessToken = refreshResult.accessToken!;
        }

        // Determine sync date range
        const endDate = new Date();
        const startDate = new Date();
        if (settings.last_sync_at) {
          startDate.setTime(new Date(settings.last_sync_at).getTime());
        } else {
          startDate.setDate(startDate.getDate() - 7); // Last 7 days for first sync
        }

        let userRecords = 0;
        let apiCalls = 0;

        // Sync food logs
        if (settings.sync_food_logs) {
          const foodResult = await syncFoodLogs(
            accessToken,
            user.user_id,
            startDate,
            endDate,
            supabase
          );
          userRecords += foodResult.records;
          apiCalls += foodResult.apiCalls;
          if (foodResult.error) {
            errors.push(`User ${user.user_id}: ${foodResult.error}`);
          }
        }

        // Update last sync time
        await supabase
          .from('myfitnesspal_sync_settings')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('user_id', user.user_id);

        // Log sync
        await supabase
          .from('myfitnesspal_sync_log')
          .insert({
            user_id: user.user_id,
            sync_type: 'auto',
            operation: 'scheduled_sync',
            status: 'success',
            records_processed: userRecords,
            api_calls_made: apiCalls,
            sync_completed_at: new Date().toISOString()
          });

        syncedUsers++;
        totalRecords += userRecords;

      } catch (error) {
        errors.push(`User ${user.user_id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${syncedUsers} users`,
      syncedUsers,
      totalRecords,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('MyFitnessPal cron sync error:', error);
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
        token_expires_at: tokenData.expires_in 
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() 
          : null,
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
              // Determine meal time
              let mealTime = '12:00:00';
              if (meal.time) {
                mealTime = meal.time;
              } else {
                // Estimate based on meal name
                const mealName = meal.name?.toLowerCase() || '';
                if (mealName.includes('breakfast')) mealTime = '08:00:00';
                else if (mealName.includes('lunch')) mealTime = '12:00:00';
                else if (mealName.includes('dinner')) mealTime = '18:00:00';
                else if (mealName.includes('snack')) mealTime = '15:00:00';
              }

              // Insert into food_logs table
              const { error: insertError } = await supabase
                .from('food_logs')
                .upsert({
                  user_id: userId,
                  food_name: food.name || 'Unknown Food',
                  calories: food.calories || 0,
                  carbs: food.carbohydrates || 0,
                  protein: food.protein || 0,
                  fat: food.fat || 0,
                  serving_size: food.serving_size || '',
                  servings: food.servings || 1,
                  meal_type: meal.name?.toLowerCase().replace(/\s+/g, '_') || 'snack',
                  logged_at: new Date(`${dateStr}T${mealTime}`).toISOString(),
                  source: 'myfitnesspal',
                  external_id: `mfp_${dateStr}_${meal.name}_${food.id || food.name}`,
                }, {
                  onConflict: 'external_id'
                });

              if (!insertError) {
                records++;
              } else {
                console.error('Insert error:', insertError);
              }
            }
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
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
