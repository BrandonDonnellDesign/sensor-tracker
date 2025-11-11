import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/insulin/stats - Get insulin statistics and analytics
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30'); // days
    const includeIOB = searchParams.get('include_iob') === 'true';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get insulin logs for the period
    const { data: logs, error } = await supabase
      .from('insulin_logs')
      .select('units, delivery_type, insulin_type, taken_at')
      .eq('user_id', user.id)
      .gte('taken_at', startDate.toISOString())
      .lte('taken_at', endDate.toISOString());

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Calculate basic statistics
    const totalInsulin = logs?.reduce((sum, log) => sum + log.units, 0) || 0;
    const totalBolus = logs?.filter(log => log.delivery_type !== 'basal').reduce((sum, log) => sum + log.units, 0) || 0;
    const totalBasal = logs?.filter(log => log.delivery_type === 'basal').reduce((sum, log) => sum + log.units, 0) || 0;
    const totalEntries = logs?.length || 0;
    const daysWithData = new Set(logs?.map(log => new Date(log.taken_at).toDateString())).size;

    // Calculate daily averages
    const dailyAverageTotal = daysWithData > 0 ? totalInsulin / daysWithData : 0;
    const dailyAverageBolus = daysWithData > 0 ? totalBolus / daysWithData : 0;
    const dailyAverageBasal = daysWithData > 0 ? totalBasal / daysWithData : 0;

    // Calculate percentages
    const basalPercentage = totalInsulin > 0 ? (totalBasal / totalInsulin) * 100 : 0;
    const bolusPercentage = totalInsulin > 0 ? (totalBolus / totalInsulin) * 100 : 0;

    // Calculate insulin type breakdown
    const insulinTypeBreakdown = logs?.reduce((acc, log) => {
      if (log.delivery_type !== 'basal') { // Only count bolus insulin types
        acc[log.insulin_type] = (acc[log.insulin_type] || 0) + log.units;
      }
      return acc;
    }, {} as Record<string, number>) || {};

    // Calculate daily totals for trend analysis
    const dailyTotals = logs?.reduce((acc, log) => {
      const date = new Date(log.taken_at).toDateString();
      if (!acc[date]) {
        acc[date] = { bolus: 0, basal: 0, total: 0 };
      }
      if (log.delivery_type === 'basal') {
        acc[date].basal += log.units;
      } else {
        acc[date].bolus += log.units;
      }
      acc[date].total += log.units;
      return acc;
    }, {} as Record<string, { bolus: number; basal: number; total: number }>) || {};

    // Calculate trend (compare first half vs second half of period)
    const dailyTotalValues = Object.values(dailyTotals).map(d => d.total);
    const midPoint = Math.floor(dailyTotalValues.length / 2);
    const firstHalf = dailyTotalValues.slice(0, midPoint);
    const secondHalf = dailyTotalValues.slice(midPoint);
    const firstHalfAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length : 0;
    const secondHalfAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length : 0;
    const trendDiff = secondHalfAvg - firstHalfAvg;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (Math.abs(trendDiff) > 2) {
      trend = trendDiff > 0 ? 'increasing' : 'decreasing';
    }

    // Calculate IOB if requested
    let currentIOB = null;
    if (includeIOB) {
      const now = new Date();
      const iobCutoff = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago
      
      const { data: recentLogs } = await supabase
        .from('insulin_logs')
        .select('units, insulin_type, taken_at')
        .eq('user_id', user.id)
        .gte('taken_at', iobCutoff.toISOString())
        .neq('delivery_type', 'basal')
        .in('insulin_type', ['rapid', 'short']);

      let totalIOB = 0;
      recentLogs?.forEach(log => {
        const logTime = new Date(log.taken_at);
        const hoursElapsed = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);
        const actionTime = log.insulin_type === 'short' ? 6 : 4;
        
        if (hoursElapsed < actionTime) {
          const remainingPercentage = Math.max(0, (actionTime - hoursElapsed) / actionTime);
          totalIOB += log.units * remainingPercentage;
        }
      });

      currentIOB = Math.round(totalIOB * 10) / 10;
    }

    // Prepare response
    const stats = {
      period: {
        days: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysWithData
      },
      totals: {
        insulin: Math.round(totalInsulin * 10) / 10,
        bolus: Math.round(totalBolus * 10) / 10,
        basal: Math.round(totalBasal * 10) / 10,
        entries: totalEntries
      },
      dailyAverages: {
        total: Math.round(dailyAverageTotal * 10) / 10,
        bolus: Math.round(dailyAverageBolus * 10) / 10,
        basal: Math.round(dailyAverageBasal * 10) / 10
      },
      percentages: {
        basal: Math.round(basalPercentage * 10) / 10,
        bolus: Math.round(bolusPercentage * 10) / 10
      },
      insulinTypeBreakdown,
      trend,
      ...(currentIOB !== null && { currentIOB })
    };

    return NextResponse.json({
      data: stats
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}