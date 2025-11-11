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

    const supabase = await createClient();
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authResult.userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'not_found', message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get API key count
    const { count: apiKeyCount } = await supabase
      .from('api_keys')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.userId)
      .eq('is_active', true);

    // Get glucose reading count
    const { count: glucoseCount } = await supabase
      .from('glucose_readings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.userId);

    // Get food log count
    const { count: foodLogCount } = await supabase
      .from('food_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.userId);

    // Get community tips count
    const { count: tipsCount } = await supabase
      .from('community_tips')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authResult.userId);

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: {
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        },
        stats: {
          api_keys: apiKeyCount || 0,
          glucose_readings: glucoseCount || 0,
          food_logs: foodLogCount || 0,
          community_tips: tipsCount || 0
        }
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in user profile API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { full_name, avatar_url } = body;

    const supabase = await createClient();
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        full_name: full_name || null,
        avatar_url: avatar_url || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', authResult.userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        updated_at: profile.updated_at
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in user profile PUT:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
