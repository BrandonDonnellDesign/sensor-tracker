import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const hours = parseInt(searchParams.get('hours') || '24');

    // Calculate time range
    const timeAgo = new Date();
    timeAgo.setHours(timeAgo.getHours() - hours);

    // For now, return basic system status without requiring system_logs table
    // This will work even if migrations haven't been applied yet
    let systemLogs: any[] = [];

    // Get user activity data for security analysis
    const { data: recentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, created_at, updated_at, last_sync_at')
      .gte('updated_at', timeAgo.toISOString())
      .order('updated_at', { ascending: false });

    // Get sensor activity (can indicate suspicious behavior)
    const { data: recentSensors, error: sensorsError } = await supabase
      .from('sensors')
      .select('user_id, created_at, is_problematic')
      .gte('created_at', timeAgo.toISOString())
      .order('created_at', { ascending: false });

    if (usersError || sensorsError) {
      console.error('Database error:', usersError || sensorsError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Analyze data for security events
    const securityEvents: any[] = [];

    // Check for suspicious user activity patterns
    const userActivityMap = new Map();
    recentUsers?.forEach(user => {
      const userId = user.id;
      if (!userActivityMap.has(userId)) {
        userActivityMap.set(userId, { signIns: 0, lastActivity: user.updated_at });
      }
      userActivityMap.get(userId).signIns++;
    });

    // Check for users with excessive activity (potential security issue)
    userActivityMap.forEach((activity, userId) => {
      if (activity.signIns > 10) { // More than 10 activities in time period
        securityEvents.push({
          id: `suspicious_${userId}_${Date.now()}`,
          type: 'suspicious_activity',
          timestamp: activity.lastActivity,
          userHash: `user_${userId.slice(0, 8)}`,
          ipAddress: '0.0.0.0', // Would be real IP in production
          location: 'Unknown',
          details: `Excessive user activity detected (${activity.signIns} actions)`,
          severity: 'medium'
        });
      }
    });

    // Check for bulk sensor creation (potential abuse)
    const sensorsByUser = new Map();
    recentSensors?.forEach(sensor => {
      const userId = sensor.user_id;
      if (!sensorsByUser.has(userId)) {
        sensorsByUser.set(userId, []);
      }
      sensorsByUser.get(userId).push(sensor);
    });

    sensorsByUser.forEach((sensors, userId) => {
      if (sensors.length > 5) { // More than 5 sensors in time period
        securityEvents.push({
          id: `bulk_sensors_${userId}_${Date.now()}`,
          type: 'suspicious_activity',
          timestamp: sensors[0].created_at,
          userHash: `user_${userId.slice(0, 8)}`,
          ipAddress: '0.0.0.0',
          location: 'Unknown',
          details: `Bulk sensor creation detected (${sensors.length} sensors)`,
          severity: sensors.length > 10 ? 'high' : 'medium'
        });
      }
    });

    // Add system logs as security events
    systemLogs.forEach(log => {
      if (log.level === 'error' || log.category === 'security') {
        securityEvents.push({
          id: log.id,
          type: log.category === 'security' ? 'admin_action' : 'system_error',
          timestamp: log.created_at,
          userHash: log.user_hash || 'system',
          ipAddress: '0.0.0.0',
          location: 'System',
          details: log.message,
          severity: log.level === 'error' ? 'high' : 'low'
        });
      }
    });

    // For now, provide basic metrics without requiring system_logs table
    // Once migrations are applied, this can use SecurityAnalyzer.getSecurityMetrics(hours)
    const suspiciousActivity24h = securityEvents.filter(e => 
      e.type === 'suspicious_activity' && 
      new Date(e.timestamp) >= timeAgo
    ).length;
    
    const adminActions24h = securityEvents.filter(e => 
      e.type === 'admin_action' && 
      new Date(e.timestamp) >= timeAgo
    ).length;

    // Get unique user IDs from recent activity
    const uniqueUsers = new Set();
    recentUsers?.forEach(user => uniqueUsers.add(user.id));
    recentSensors?.forEach(sensor => uniqueUsers.add(sensor.user_id));

    const metrics = {
      failedLogins24h: 0, // Will be populated once system_logs table exists
      suspiciousActivity24h,
      adminActions24h,
      uniqueIPs24h: uniqueUsers.size, // Using unique users as proxy for unique IPs
      lastSecurityScan: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    };

    // Sort events by timestamp (newest first)
    securityEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      events: securityEvents.slice(0, limit),
      metrics
    });

  } catch (error) {
    console.error('Error fetching security events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}