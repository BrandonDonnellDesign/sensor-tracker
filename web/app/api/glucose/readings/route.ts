import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  console.log('🍯 Glucose readings API called:', request.url);
  
  try {
    const supabase = await createClient();
    
    // Get user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('🔐 Auth check:', { 
      hasUser: !!user, 
      userId: user?.id?.substring(0, 8) + '...', 
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('Auth error in glucose readings API:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'Please log in to access glucose readings'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Verify the user is accessing their own data or is an admin
    let targetUserId = user.id; // Default to current user
    
    if (userId && userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ 
          error: 'Forbidden',
          details: 'You can only access your own glucose readings'
        }, { status: 403 });
      }
      targetUserId = userId;
    }

    // Get glucose readings for the user
    const { data: readings, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', targetUserId)
      .order('system_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching glucose readings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch glucose readings' },
        { status: 500 }
      );
    }

    return NextResponse.json(readings || []);

  } catch (error) {
    console.error('Error in glucose readings API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { readings } = body;

    if (!Array.isArray(readings)) {
      return NextResponse.json(
        { error: 'Readings must be an array' },
        { status: 400 }
      );
    }

    // Add user_id to each reading and ensure proper format
    const formattedReadings = readings.map(reading => ({
      ...reading,
      user_id: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert readings (use upsert to handle duplicates)
    const { data, error } = await supabase
      .from('glucose_readings')
      .upsert(formattedReadings, {
        onConflict: 'user_id,system_time,transmitter_id',
        ignoreDuplicates: true
      })
      .select();

    if (error) {
      console.error('Error inserting glucose readings:', error);
      return NextResponse.json(
        { error: 'Failed to insert glucose readings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      message: `Successfully inserted ${data?.length || 0} glucose readings`
    });

  } catch (error) {
    console.error('Error in glucose readings POST API:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}