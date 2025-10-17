import { createClient } from '@/lib/supabase-server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth check:', { user: user?.id, authError });
    
    if (authError || !user) {
      console.log('Authentication failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      return NextResponse.json({ error: 'Profile already exists' }, { status: 400 });
    }

    // Create the profile using service role client to bypass RLS
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const newProfile = {
      id: user.id,
      username: user.user_metadata?.username || user.email?.split('@')[0] || null,
      full_name: user.user_metadata?.full_name || null,
      avatar_url: user.user_metadata?.avatar_url || null,
      timezone: 'UTC',
      notifications_enabled: true,
      dark_mode_enabled: false,
      glucose_unit: 'mg/dL' as const,
      push_notifications_enabled: true,
      in_app_notifications_enabled: true,
      warning_days_before: 2,
      critical_days_before: 1,
      date_format: 'MM/dd/yyyy',
      time_format: '12h',
      preferred_achievement_tracking: 'all',
      preferred_achievement_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_sync_at: null
    };

    const { data: createdProfile, error: createError } = await serviceSupabase
      .from('profiles')
      .insert([newProfile])
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ profile: createdProfile });
  } catch (error) {
    console.error('Profile creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}