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

    // Get notification counts by status
    const { data: notifications, error } = await (adminClient as any)
      .from('notifications')
      .select('status, delivery_status')
      .gte('created_at', since);

    if (error) {
      throw error;
    }

    // Calculate stats
    const stats = (notifications || []).reduce((acc: { total: number; sent: number; delivered: number; pending: number; failed: number }, n: any) => {
      acc.total++;
      if (n.status === 'sent') acc.sent++;
      if (n.status === 'pending') acc.pending++;
      if (n.status === 'failed') acc.failed++;
      if (n.delivery_status === 'delivered') acc.delivered++;
      return acc;
    }, { 
      total: 0, 
      sent: 0, 
      delivered: 0, 
      pending: 0, 
      failed: 0 
    });

    const deliveryRate = stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0;

    return NextResponse.json({
      ...stats,
      deliveryRate
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification stats' },
      { status: 500 }
    );
  }
}