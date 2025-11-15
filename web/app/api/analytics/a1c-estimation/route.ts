import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { 
  estimateA1C, 
  calculateA1CTrends,
  getA1CTargets,
} from '@/lib/analytics/a1c-calculator';
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
    const days = parseInt(searchParams.get('days') || '90');
    const includeTrends = searchParams.get('trends') === 'true';

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
        message: 'Need at least 50 glucose readings for accurate A1C estimation',
        readingCount: readings?.length || 0,
      });
    }

    // Calculate current A1C estimate
    const currentEstimate = estimateA1C(readings, startDate, endDate);

    // Calculate trends if requested
    let trends = null;
    if (includeTrends) {
      trends = calculateA1CTrends(readings, 'monthly');
    }

    // Get target ranges
    const targets = getA1CTargets();

    // Calculate statistics
    const glucoseValues = readings.map((r: { value: number }) => r.value);
    const minGlucose = Math.min(...glucoseValues);
    const maxGlucose = Math.max(...glucoseValues);
    const stdDev = calculateStandardDeviation(glucoseValues);

    return NextResponse.json({
      success: true,
      data: {
        current: currentEstimate,
        trends,
        targets,
        statistics: {
          minGlucose,
          maxGlucose,
          standardDeviation: Math.round(stdDev),
          coefficientOfVariation: Math.round((stdDev / currentEstimate.averageGlucose) * 100),
        },
        daysAnalyzed: days,
        analysisDate: new Date().toISOString(),
      },
    });

  } catch (error) {
    logger.error('A1C estimation error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to estimate A1C',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function calculateStandardDeviation(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}
