/**
 * API endpoint for notification statistics (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get notification statistics
    const { data: stats, error: statsError } = await supabase
      .rpc('get_notification_stats', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0]
      });

    if (statsError) {
      console.error('Error fetching notification stats:', statsError);
      return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
    }

    // Get recent notification logs
    const { data: recentLogs, error: logsError } = await supabase
      .from('notification_logs')
      .select('*')
      .order('sent_at', { ascending: false })
      .limit(50);

    if (logsError) {
      console.error('Error fetching recent logs:', logsError);
    }

    // Get email queue status
    const { data: queueStats, error: queueError } = await supabase
      .from('email_queue')
      .select('status')
      .gte('created_at', startDate.toISOString());

    if (queueError) {
      console.error('Error fetching queue stats:', queueError);
    }

    // Process queue statistics
    const queueSummary = queueStats?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    // Get user preferences summary
    const { data: userPrefs, error: prefsError } = await supabase
      .from('profiles')
      .select('notification_preferences')
      .not('notification_preferences', 'is', null);

    if (prefsError) {
      console.error('Error fetching user preferences:', prefsError);
    }

    // Process user preferences
    const prefsSummary = userPrefs?.reduce((acc, user) => {
      const prefs = user.notification_preferences || {};
      Object.keys(prefs).forEach(key => {
        if (!acc[key]) acc[key] = { enabled: 0, disabled: 0 };
        if (prefs[key]) {
          acc[key].enabled++;
        } else {
          acc[key].disabled++;
        }
      });
      return acc;
    }, {} as Record<string, { enabled: number; disabled: number }>) || {};

    return NextResponse.json({
      stats: stats?.[0] || {
        total_sent: 0,
        success_rate: 0,
        by_type: {},
        daily_stats: {}
      },
      recentLogs: recentLogs || [],
      queueSummary,
      userPreferences: prefsSummary,
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching notification statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}