import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { authenticateApiRequest } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Check authentication and rate limit
    const authResult = await authenticateApiRequest(request);
    if (!authResult.success) {
      return NextResponse.json(
        { error: 'authentication_failed', message: authResult.error },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const page = parseInt(searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    const supabase = await createClient();
    
    let query = supabase
      .from('glucose_readings')
      .select('*')
      .eq('user_id', authResult.userId!)
      .order('system_time', { ascending: false });

    // Apply date filters
    if (startDate) {
      query = query.gte('system_time', startDate);
    }
    if (endDate) {
      query = query.lte('system_time', endDate);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: readings, error } = await query;

    if (error) {
      console.error('Error fetching glucose readings:', error);
      return NextResponse.json(
        { error: 'database_error', message: 'Failed to fetch glucose readings' },
        { status: 500 }
      );
    }

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      data: readings || [],
      pagination: {
        page,
        limit,
        total: readings?.length || 0,
        hasNext: (readings?.length || 0) === limit,
        hasPrev: page > 1
      },
      meta: {
        responseTime: `${responseTime}ms`,
        apiVersion: '1.0.0'
      }
    });

  } catch (error) {
    console.error('Error in glucose readings API:', error);
    return NextResponse.json(
      { error: 'internal_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}