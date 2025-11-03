import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { getCurrentUser } from '@/lib/auth-utils';

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user notifications
    const { data: notifications, error } = await supabase
      .from('user_notifications')
      .select(`
        id,
        type,
        title,
        message,
        is_read,
        created_at,
        related_tip_id,
        related_comment_id,
        action_url
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    // Count unread notifications
    const { count: unreadCount } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, message, relatedTipId, relatedCommentId, actionUrl } = body;

    // Create notification
    const { data: notification, error } = await supabase
      .from('user_notifications')
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        related_tip_id: relatedTipId,
        related_comment_id: relatedCommentId,
        action_url: actionUrl,
        is_read: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}