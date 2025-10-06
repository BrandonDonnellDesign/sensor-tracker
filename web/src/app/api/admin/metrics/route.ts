import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    // For now, we'll create a simple admin API that doesn't require complex auth verification
    // In production, you'd want proper authentication middleware
    
    // Use admin client to fetch metrics
    const adminClient = createAdminClient();
    
    // Get aggregated metrics using service role
    const [usersResult, sensorsResult, photosResult] = await Promise.all([
      adminClient.from('profiles').select('id', { count: 'exact', head: true }),
      adminClient.from('sensors').select('id', { count: 'exact', head: true }),
      adminClient.from('photos').select('id', { count: 'exact', head: true })
    ]);

    // Get active users (users with activity in last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', thirtyDaysAgo);

    // Get recent activity (sensors added in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentSensors } = await adminClient
      .from('sensors')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const metrics = {
      totalUsers: usersResult.count || 0,
      activeUsers: activeUsers || 0,
      totalSensors: sensorsResult.count || 0,
      totalPhotos: photosResult.count || 0,
      recentActivity: recentSensors || 0,
      systemHealth: 'healthy' as const,
      uptime: Math.floor(Math.random() * 720) + 24, // Simulated uptime
      responseTime: Math.floor(Math.random() * 100) + 50 // Simulated response time
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin metrics' },
      { status: 500 }
    );
  }
}