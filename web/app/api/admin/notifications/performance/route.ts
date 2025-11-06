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
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const hours = parseInt(searchParams.get('hours') || '24');
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Get notification performance metrics
    const [
      notificationStats,
      triggerPerformance,
      userEngagement,
      systemHealth
    ] = await Promise.all([
      // Basic notification statistics
      supabase
        .from('notifications')
        .select('type, priority, created_at, delivery_status, metadata')
        .gte('created_at', startTime.toISOString()),

      // Database trigger performance (from system logs)
      supabase
        .from('system_logs')
        .select('*')
        .eq('category', 'notifications')
        .gte('created_at', startTime.toISOString()),

      // User engagement with notifications
      supabase
        .from('notifications')
        .select('user_id, dismissed_at, read, created_at')
        .gte('created_at', startTime.toISOString())
        .not('dismissed_at', 'is', null),

      // System health metrics
      supabase
        .from('system_logs')
        .select('*')
        .in('category', ['database_triggers', 'websocket', 'realtime'])
        .gte('created_at', startTime.toISOString())
    ]);

    // Process notification statistics
    const notifications = notificationStats.data || [];
    const stats = {
      total: notifications.length,
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: notifications.reduce((acc, n) => {
        const priority = n.metadata?.priority || 'medium';
        acc[priority] = (acc[priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      deliveryRate: notifications.length > 0 
        ? (notifications.filter(n => n.delivery_status === 'delivered').length / notifications.length) * 100
        : 0
    };

    // Process trigger performance
    const triggers = triggerPerformance.data || [];
    const triggerStats = {
      totalTriggers: triggers.length,
      avgResponseTime: triggers.length > 0
        ? triggers.reduce((sum, t) => sum + (t.metadata?.duration || 0), 0) / triggers.length
        : 0,
      errorRate: triggers.length > 0
        ? (triggers.filter(t => t.level === 'error').length / triggers.length) * 100
        : 0
    };

    // Process user engagement
    const engagement = userEngagement.data || [];
    const engagementStats = {
      totalDismissals: engagement.length,
      avgTimeToAction: engagement.length > 0
        ? engagement.reduce((sum, e) => {
            const created = new Date(e.created_at).getTime();
            const dismissed = new Date(e.dismissed_at).getTime();
            return sum + (dismissed - created);
          }, 0) / engagement.length / 1000 // Convert to seconds
        : 0,
      readRate: engagement.length > 0
        ? (engagement.filter(e => e.read).length / engagement.length) * 100
        : 0
    };

    // Process system health
    const systemLogs = systemHealth.data || [];
    const healthStats = {
      totalEvents: systemLogs.length,
      errorCount: systemLogs.filter(l => l.level === 'error').length,
      warningCount: systemLogs.filter(l => l.level === 'warn').length,
      uptime: systemLogs.length > 0 
        ? (systemLogs.filter(l => l.level !== 'error').length / systemLogs.length) * 100
        : 100
    };

    // Calculate hourly breakdown
    const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
      const hourNotifications = notifications.filter(n => {
        const notifHour = new Date(n.created_at).getHours();
        return notifHour === hour;
      });
      
      return {
        hour,
        count: hourNotifications.length,
        urgent: hourNotifications.filter(n => n.metadata?.priority === 'urgent').length,
        high: hourNotifications.filter(n => n.metadata?.priority === 'high').length
      };
    });

    return NextResponse.json({
      timeRange: {
        hours,
        startTime: startTime.toISOString(),
        endTime: new Date().toISOString()
      },
      notifications: stats,
      triggers: triggerStats,
      engagement: engagementStats,
      systemHealth: healthStats,
      hourlyBreakdown,
      summary: {
        totalNotifications: stats.total,
        deliveryRate: stats.deliveryRate,
        avgResponseTime: triggerStats.avgResponseTime,
        systemUptime: healthStats.uptime,
        userEngagement: engagementStats.readRate
      }
    });

  } catch (error) {
    console.error('Error fetching notification performance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}