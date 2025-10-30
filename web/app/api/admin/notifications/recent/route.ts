import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const adminClient = createAdminClient();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get recent notifications
    const { data: notifications, error } = await (adminClient as any)
      .from('notifications')
      .select('id, title, message, type, status, delivery_status, created_at, retry_count')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return NextResponse.json(notifications || []);

  } catch (error) {
    console.error('Error fetching recent notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent notifications' },
      { status: 500 }
    );
  }
}