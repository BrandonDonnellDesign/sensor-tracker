import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { 
  calculateTimeInRange,
  calculateTimeInRangeTrends,
  GLUCOSE_RANGES,
  TIR_TARGETS,
} from '@/lib/analytics/time-in-range-calculator';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '14');
    const includeTrends = searchParams.get('trends') === 'true';
    const trendPeriod = (searchParams.get('trendPeriod') || 'daily') as 'daily' | 'weekly';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch glucose readings
    const { data: readings, error: readingsError } = await supabase
      .from('glucose_readings')
      .select('value, system_time')
      .eq('user_id', user.id)
      .gte('system_time', startDate.toISOString())
      .lte('system_time', endDate.toISOString())
      .order('system_time', { ascending: true });

    if (readingsError) {
      logger.error('Error fetching glucose readings:', readingsError);
      throw readingsError;
    }

    if (!readings || readings.length < 50) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient data',
        message: 'Need at least 50 glucose readings for accurate Time-in-Range analysis',
        readingCount: readings?.length || 0,
      });
    }

    // Calculate Time-in-Range
    const tirResult = calculateTimeInRange(readings);

    // Calculate trends if requested
    let trends = null;
    if (includeTrends) {
      trends = calculateTimeInRangeTrends(readings, trendPeriod);
    }

    return NextResponse.json({
      success: true,
      data: {
        result: tirResult,
        trends,
        targets: TIR_TARGETS,
        ranges: GLUCOSE_RANGES,
        daysAnalyzed: days,
        analysisDate: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('Time-in-Range analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to calculate Time-in-Range',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
