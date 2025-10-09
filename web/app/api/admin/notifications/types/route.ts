import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';

    // Calculate time range
    const hours = range === '24h' ? 24 : range === '7d' ? 168 : 720;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get notification counts by type
    const { data: notifications, error } = await adminClient
      .from('notifications')
      .select('type')
      .gte('created_at', since);

    if (error) {
      throw error;
    }

    // Group by type
    const typeStats = (notifications || []).reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json(typeStats);

  } catch (error) {
    console.error('Error fetching notification types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification types' },
      { status: 500 }
    );
  }
}