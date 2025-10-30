import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications/notification-service';

export async function POST(_request: NextRequest) {
  try {
    const retriedCount = await notificationService.retryFailedNotifications();
    
    return NextResponse.json({ 
      success: true, 
      count: retriedCount,
      message: `Retried ${retriedCount} failed notifications`
    });

  } catch (error) {
    console.error('Error retrying failed notifications:', error);
    return NextResponse.json(
      { error: 'Failed to retry notifications' },
      { status: 500 }
    );
  }
}